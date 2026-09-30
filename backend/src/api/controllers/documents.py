"""Sprint 4A text-layer extraction, review and lightweight retrieval."""

import asyncio
import io
import math
import re
import uuid

import fastapi
import pypdf

from ...ai import openai
from ...core import config
from .. import exceptions
from .. import models
from .. import schemas

CONTENT_TYPES = {'application/pdf', 'text/plain', 'text/markdown'}


def extract_text(data: bytes, media_type: str, limit: int) -> str:
    if media_type == 'application/pdf':
        reader = pypdf.PdfReader(io.BytesIO(data))
        if reader.is_encrypted or len(reader.pages) > 50:
            raise ValueError('Документ недоступен. Используйте небольшой текстовый PDF')
        parts = []
        count = 0
        for page in reader.pages:
            value = page.extract_text() or ''
            count += len(value)
            if count > limit:
                raise ValueError('Слишком много текста. Загрузите более короткий документ')
            parts.append(value)
        text = '\n'.join(parts)
        if not text.strip():
            raise ValueError('Сканированные документы пока не поддерживаются')
    else:
        text = data.decode('utf-8-sig')
    text = text.replace('\x00', '').strip()
    if not text or len(text) > limit:
        raise ValueError('Документ пуст или слишком длинный. Выберите другой файл')
    return text


def chunk_text(text: str, size: int = 1600, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = text.rfind('\n\n', start + size // 2, end)
            if boundary > start:
                end = boundary + 2
        chunks.append(text[start:end])
        if len(chunks) > 30:
            raise ValueError('Документ содержит слишком много фрагментов. Сократите его')
        if end == len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def extract_facts(text: str) -> list[dict]:
    patterns = [
        (
            'no_high_impact',
            r'avoid high impact|avoid high-impact|no jumping|избегать прыжков|избегать высокой ударной нагрузки',
        ),
        ('avoid_overhead', r'avoid overhead|no overhead|избегать движений над головой'),
        ('avoid_deep_knee_flexion', r'avoid deep knee|избегать глубокого сгибания колен'),
    ]
    facts = []
    for sentence in re.split(r'\n+|(?<=[.!?])\s+', text):
        value = sentence.strip(' -\t#')
        if not value:
            continue
        code = next(
            (code for code, pattern in patterns if re.search(pattern, value, re.I)), None
        )
        facts.append(
            {
                'normalized_fact': value[:120],
                'source_excerpt': value[:240],
                'constraint_code': code,
            }
        )
        if len(facts) == 12:
            break
    return facts


def cosine(a: list[float], b: list[float]) -> float:
    if not a or len(a) != len(b):
        return 0
    if not all(
        isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
        for v in [*a, *b]
    ):
        return 0
    norm = math.sqrt(sum(v * v for v in a)) * math.sqrt(sum(v * v for v in b))
    return sum(x * y for x, y in zip(a, b, strict=True)) / norm if norm else 0


def lexical(query: str, content: str) -> float:
    words = set(re.findall(r'\w+', query.casefold()))
    tokens = set(re.findall(r'\w+', content.casefold()))
    return len(words & tokens) / max(1, len(words))


def rank_chunks(
    query: str, chunks: list[dict], vector: list[float] | None, top_k: int = 5
) -> list[dict]:
    def score(row):
        embedding = row.get('embedding')
        if vector and embedding and len(embedding) == len(vector):
            return cosine(vector, embedding)
        return lexical(query, row['content'])

    return sorted(chunks, key=lambda row: (-score(row), str(row['id'])))[:top_k]


async def upload(current_user: schemas.UserCurrent, file: fastapi.UploadFile) -> dict:
    settings = config.get_settings()
    try:
        if file.content_type not in CONTENT_TYPES:
            raise exceptions.HTTPBadRequestException(
                detail='Поддерживаются PDF, TXT и Markdown'
            )
        data = await file.read(settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024 + 1)
        if len(data) > settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024:
            raise exceptions.HTTPBadRequestException(
                detail='Файл больше 5 MB. Выберите меньший документ'
            )
        text = ''
        chunks = []
        message = None
        status = 'processed'
        try:
            text = await asyncio.to_thread(
                extract_text, data, file.content_type, settings.MAX_EXTRACTED_CHARS
            )
            chunks = chunk_text(text, settings.RAG_CHUNK_SIZE, settings.RAG_CHUNK_OVERLAP)
        except UnicodeDecodeError:
            text, chunks = '', []
            status, message = 'failed', 'Сохраните документ в UTF-8 и повторите загрузку'
        except ValueError as exc:
            text = ''
            message = str(exc)[:120]
            status = 'failed'
        except Exception:
            text = ''
            message = 'Не удалось прочитать документ. Попробуйте текстовый PDF или TXT'
            status = 'failed'
        try:
            return await models.ai_coach.document_create(
                current_user.id,
                {
                    'filename': (file.filename or 'document')[:255],
                    'media_type': file.content_type,
                    'size_bytes': len(data),
                    'extracted_text': text,
                    'status': status,
                    'message': message,
                },
                chunks,
                extract_facts(text),
                settings.MAX_DOCUMENTS_PER_USER,
            )
        except models.AIDocumentLimit as exc:
            raise exceptions.HTTPConflictException(
                detail='Можно загрузить до 5 документов. Удалите один источник'
            ) from exc
    finally:
        await file.close()


async def list_documents(current_user: schemas.UserCurrent) -> list[dict]:
    return await models.ai_coach.documents_list(current_user.id)


async def delete(current_user: schemas.UserCurrent, document_id: uuid.UUID) -> dict:
    try:
        return await models.ai_coach.document_delete(current_user.id, document_id)
    except models.AISourceNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Источник не найден') from exc


async def decide(
    current_user: schemas.UserCurrent,
    document_id: uuid.UUID,
    fact_id: uuid.UUID,
    body: schemas.ai_coach.FactDecision,
) -> dict:
    try:
        return await models.ai_coach.fact_decide(
            current_user.id, document_id, fact_id, body.status
        )
    except models.AISourceNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Факт не найден') from exc


async def retrieve(
    current_user: schemas.UserCurrent, query: str, snapshot: dict
) -> tuple[list[dict], str]:
    chunks = snapshot['chunks']
    method = 'lexical'
    query_vector = None
    try:
        missing = [row for row in chunks if not row['embedding']]
        texts = [query, *[row['content'] for row in missing]]
        vectors = await openai.create_embeddings(texts)
        query_vector = vectors[0]
        values = [
            {'id': row['id'], 'embedding': vectors[index + 1]}
            for index, row in enumerate(missing)
        ]
        await models.ai_coach.embeddings_save(current_user.id, values)
        for row, value in zip(missing, values, strict=True):
            row['embedding'] = value['embedding']
        method = 'embeddings'
    except openai.AIProviderUnavailable:
        pass
    ranked = rank_chunks(query, chunks, query_vector, config.get_settings().RAG_TOP_K)
    # Sprint 4A retrieval selects real chunks, but only reviewed facts reach personalization.
    result = []
    for row in ranked:
        excerpts = [
            fact['source_excerpt']
            for fact in snapshot['facts']
            if fact['document_id'] == row['document_id']
            and fact['source_excerpt'] in row['content']
        ]
        if excerpts:
            result.append(
                {
                    'id': str(row['id']),
                    'document_id': str(row['document_id']),
                    'content': '\n'.join(excerpts),
                }
            )
    return result, method
