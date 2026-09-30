"""Administrative, resumable preparation of the public fixed cue catalog."""

import asyncio
import shutil

from ...ai import elevenlabs
from ...ai import voice_batch
from ...core import config
from ...core import voice_assets
from . import speech

MODEL = 'eleven_v4'


def catalog(language: str) -> list[tuple[str, str, str]]:
    index = speech.LANG_INDEX[language]
    return [
        (name, values[index], 'static-cues-v1') for name, values in speech.CUES.items()
    ] + [('preview', speech.PREVIEW[index], speech.PREVIEW_VERSION)]


async def plan(languages: list[str], style: str, voice_id: str | None = None) -> dict:
    settings = config.get_settings()
    if (
        not settings.AUDIO_SHARED_CACHE_DIR
        or not languages
        or len(set(languages)) != len(languages)
        or any(language not in speech.LANG_INDEX for language in languages)
        or style not in {'calm', 'supportive', 'energetic', 'strict'}
    ):
        raise elevenlabs.SpeechUnavailable('cache_config')
    for language in languages:
        if elevenlabs.model_for(language) != MODEL:
            raise elevenlabs.SpeechUnavailable('cache_model_config')
        await elevenlabs.validate_model(language, MODEL)
    voices, unavailable, seen, token = {}, {}, set(), None
    for _ in range(10):
        page = await elevenlabs.voices(100, token)
        voices.update({row['voice_id']: row for row in page['voices']})
        unavailable.update(
            {row['voice_id']: row for row in page.get('unavailable_voices', [])}
        )
        if not page['has_more']:
            break
        token = page['next_page_token']
        if not token or token in seen:
            raise elevenlabs.SpeechUnavailable('voice_pagination')
        seen.add(token)
    else:
        raise elevenlabs.SpeechUnavailable('voice_pagination')
    if voice_id:
        voices = {voice_id: voices[voice_id]} if voice_id in voices else {}
    if not voices:
        raise elevenlabs.SpeechUnavailable('voice_unavailable')
    jobs, missing, characters = [], 0, 0
    for voice in voices:
        for language in languages:
            entries = catalog(language)
            texts = [text for _, text, _ in entries]
            keys = [
                voice_assets.key(text, voice, MODEL, language, style, version)
                for _, text, version in entries
            ]
            absent = sum([await voice_assets.get(key) is None for key in keys])
            if not absent:
                continue
            batch_key = voice_assets.key(
                '\n'.join(texts), voice, MODEL, language, style, 'fixed-pack-v1'
            )
            saved = await voice_assets.get_batch(batch_key)
            if saved is not None:
                # Corrupt saved work is never silently re-generated with paid quota.
                voice_batch.boundaries(saved, texts)
            units = len('\n'.join(elevenlabs.delivery_text(t, style, MODEL) for t in texts))
            characters += 0 if saved is not None else units
            missing += absent
            jobs.append(
                {
                    'voice': voice,
                    'language': language,
                    'style': style,
                    'texts': texts,
                    'keys': keys,
                    'batch_key': batch_key,
                    'characters': units,
                }
            )
    return {
        'model': MODEL,
        'voices': len(voices),
        'unavailable_voices': list(unavailable.values()),
        'languages': languages,
        'style': style,
        'total_clips': len(voices) * sum(len(catalog(lang)) for lang in languages),
        'missing_clips': missing,
        'new_characters': characters,
        'remaining_characters': await elevenlabs.remaining_characters(),
        'jobs': jobs,
    }


async def prepare_job(job: dict) -> dict:
    async with voice_assets.lease(job['batch_key']):
        missing = [await voice_assets.get(key) is None for key in job['keys']]
        if not any(missing):
            return {'voice': job['voice'], 'language': job['language'], 'prepared': 0}
        body = await voice_assets.get_batch(job['batch_key'])
        if body is None:
            body = await voice_batch.render(
                job['voice'], job['texts'], job['language'], job['style'], MODEL
            )
            # Store the original paid response before ffmpeg. A failed cut can resume
            # from it without issuing another paid request.
            if not await voice_assets.put_batch(job['batch_key'], body):
                raise elevenlabs.SpeechUnavailable('cache_write')
        clips = await voice_batch.split(body, job['texts'])
        if len(clips) != len(job['keys']):
            raise elevenlabs.SpeechUnavailable('batch_schema')
        for key, data, absent in zip(job['keys'], clips, missing, strict=True):
            if absent and not await voice_assets.put(key, data):
                raise elevenlabs.SpeechUnavailable('cache_write')
        return {
            'voice': job['voice'],
            'language': job['language'],
            'prepared': sum(missing),
        }


async def execute(prepared: dict, max_characters: int, progress) -> dict:
    if prepared['new_characters'] > min(max_characters, prepared['remaining_characters']):
        raise elevenlabs.SpeechUnavailable('cache_quota')
    if not shutil.which('ffmpeg'):
        raise elevenlabs.SpeechUnavailable('ffmpeg_required')
    # Sequential paid requests simplify exact quota accounting and stop on the first
    # failure. Web API requests retain their separate bounded concurrency.
    count = 0
    for job in prepared['jobs']:
        result = await prepare_job(job)
        count += result['prepared']
        progress({**result, 'completed_clips': count})
        await asyncio.sleep(0)
    return {'prepared': count, 'model': MODEL}
