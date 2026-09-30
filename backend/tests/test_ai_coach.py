"""Sprint 4A synthetic jury flow, source confirmation and ownership."""

import copy
import io
import uuid
from unittest.mock import AsyncMock

import pydantic
import pytest
from pypdf import PdfWriter

from src.ai import openai
from src.api import models
from src.api import schemas
from src.api.controllers import ai_coach
from src.api.controllers import demo_personas
from src.api.controllers import documents


@pytest.fixture(autouse=True)
def explicit_legacy_fixture_mode(monkeypatch):
    monkeypatch.setenv('COACH_EXECUTION_MODE', 'fixture')
    monkeypatch.setenv('ENABLE_FIXTURE_MODE', 'true')
    from src.core import config

    config.clear_settings_cache()


async def load(client, headers, key):
    response = await client.post(f'/api/v1/demo-personas/{key}/load', headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


async def confirm(client, headers, document):
    for fact in document['facts']:
        response = await client.put(
            f'/api/v1/documents/{document["id"]}/facts/{fact["id"]}',
            json={'status': 'confirmed'},
            headers=headers,
        )
        assert response.status_code == 200, response.text


@pytest.mark.xdist_group('domains')
async def test_jury_flow_confirmation_private_exercises_and_progress(
    client,
    guest,
    database,
    session_payload,
    set_payload,
    completion_payload,
):
    headers, user_id = guest
    views = []
    for key in ['maya', 'arman', 'dana']:
        loaded = await load(client, headers, key)
        document = loaded['documents'][0]
        assert 'extracted_text' not in document
        pending = (await client.post('/api/v1/ai-profile/generate', headers=headers)).json()
        assert pending['profile']['constraints'] == []
        await confirm(client, headers, document)
        generated = await client.post(
            '/api/v1/training-plans/generate', json={'mode': 'ai_assisted'}, headers=headers
        )
        assert generated.status_code == 200, generated.text
        plan = generated.json()
        metadata = plan['ai_metadata']
        assert metadata['status'] == 'synthetic'
        assert metadata['ai_profile']['persona_key'] == key
        assert metadata['why_this_plan']
        first = metadata['days'][0]['items'][0]
        spec = await client.get(
            '/api/v1/exercise-specs/' + first['exercise_key'], headers=headers
        )
        assert spec.status_code == 200, spec.text
        assert spec.json()['status'] == 'valid'
        assert spec.json()['movement_spec']['error_rules']
        assert spec.json()['movement_spec']['coach_messages']['ready']['messages']['kk']
        views.append(
            (len(metadata['days']), first['sets'], first['target_reps'], first['tempo_hint'])
        )
        catalog = (await client.get('/api/v1/exercises', headers=headers)).json()
        assert all(item['key'] != first['exercise_key'] for item in catalog)
        other = (await client.post('/api/v1/auth/guest')).json()
        foreign = {'Authorization': 'Bearer ' + other['access_token']}
        assert (
            await client.get(
                '/api/v1/exercise-specs/' + first['exercise_key'], headers=foreign
            )
        ).status_code == 404
        assert (
            await client.delete('/api/v1/documents/' + document['id'], headers=foreign)
        ).status_code == 404
        assert (
            await client.get('/api/v1/ai-profile/current', headers=foreign)
        ).status_code == 404
        start = {
            **session_payload,
            'client_session_id': str(uuid.uuid4()),
            'plan_id': plan['id'],
            'client_engine_version': 'generic-v1',
        }
        sid = (
            await client.post('/api/v1/workout-sessions', json=start, headers=headers)
        ).json()['id']
        path = '/api/v1/workout-sessions/' + sid
        body = {
            **set_payload,
            'exercise_key': first['exercise_key'],
            'engine_version': 'generic-v1',
            'generic_error_counts': {'range_too_small': 2},
        }
        assert (
            await client.post(path + '/sets', json=body, headers=foreign)
        ).status_code == 404
        assert (
            await client.post(path + '/sets', json=body, headers=headers)
        ).status_code == 200
        done = {
            **completion_payload,
            'summary': {
                **completion_payload['summary'],
                'generic_error_counts': {'range_too_small': 2},
            },
        }
        assert (
            await client.post(path + '/complete', json=done, headers=headers)
        ).status_code == 200
        progress = (await client.get('/api/v1/progress/summary', headers=headers)).json()
        assert progress['recent_sessions'][0]['generic_error_counts'] == {'range_too_small': 2}
        assert any(
            row['exercise_key'] == first['exercise_key'] for row in progress['recent_sessions']
        )
        assert (
            await client.post(
                '/api/v1/exercise-specs/' + first['exercise_key'] + '/regenerate',
                headers=headers,
            )
        ).status_code == 200
        assert (
            await client.delete('/api/v1/documents/' + document['id'], headers=headers)
        ).status_code == 204
        assert (
            await client.get('/api/v1/ai-profile/current', headers=headers)
        ).status_code == 404
    assert len(set(views)) == 3
    assert progress['completed_sessions'] == 3
    snapshot = await models.ai_coach.source_snapshot(uuid.UUID(user_id))
    assert snapshot == {'facts': [], 'chunks': []}


@pytest.mark.xdist_group('domains')
async def test_documents_limits_errors_decisions_and_ownership(client, guest, database):
    headers, _ = guest
    assert (await client.get('/api/v1/ai-context', headers=headers)).status_code == 404
    body = {
        'self_description': 'Short standing sessions',
        'preferred_coach_style': 'calm',
        'preferred_language': 'ru',
        'additional_preferences': {},
    }
    assert (
        await client.put('/api/v1/ai-context', json=body, headers=headers)
    ).status_code == 200
    assert (await client.get('/api/v1/ai-context', headers=headers)).json()[
        'self_description'
    ] == body['self_description']
    for media, data in [('image/png', b'x'), ('text/plain', b'x' * (5 * 1024 * 1024 + 1))]:
        assert (
            await client.post(
                '/api/v1/documents', files={'file': ('demo', data, media)}, headers=headers
            )
        ).status_code == 400
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    stream = io.BytesIO()
    writer.write(stream)
    cases = [
        (b'avoid high impact\nshort sessions', 'text/plain', 'processed'),
        (b'\xff\xfe', 'text/plain', 'failed'),
        (stream.getvalue(), 'application/pdf', 'failed'),
        (b'not pdf', 'application/pdf', 'failed'),
        (b'morning reset', 'text/markdown', 'processed'),
    ]
    for data, media, status in cases:
        response = await client.post(
            '/api/v1/documents',
            files={'file': ('synthetic.txt', data, media)},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        assert response.json()['status'] == status
        if response.json()['facts']:
            doc = response.json()
            fact = doc['facts'][0]
            url = f'/api/v1/documents/{doc["id"]}/facts/{fact["id"]}'
            assert (
                await client.put(url, json={'status': 'rejected'}, headers=headers)
            ).json()['status'] == 'rejected'
            assert (
                await client.put(url, json={'status': 'pending'}, headers=headers)
            ).status_code == 422
    assert len((await client.get('/api/v1/documents', headers=headers)).json()) == 5
    assert (
        await client.post(
            '/api/v1/documents',
            files={'file': ('six.txt', b'x', 'text/plain')},
            headers=headers,
        )
    ).status_code == 409
    missing = str(uuid.uuid4())
    assert (
        await client.put(
            f'/api/v1/documents/{missing}/facts/{missing}',
            json={'status': 'confirmed'},
            headers=headers,
        )
    ).status_code == 404
    assert (
        await client.delete('/api/v1/documents/' + missing, headers=headers)
    ).status_code == 404


def fixture_profile(key='maya'):
    persona = demo_personas.PERSONAS[key]
    context = {
        'self_description': persona['description'],
        'preferred_coach_style': persona['style'],
        'preferred_language': persona['language'],
        'additional_preferences': {
            'persona_key': key,
            'routine_preferences': persona['routines'],
        },
    }
    base = {
        'experience_level': persona['level'],
        'goal': persona['goal'],
        'equipment': persona['equipment'],
        'days_per_week': persona['days'],
        'session_minutes': persona['minutes'],
        'confirmed_constraints': [],
    }
    return demo_personas.deterministic_profile(context, base, [])


@pytest.mark.parametrize(
    'mutation',
    [
        lambda s: s['features'][0].update(operation='eval'),
        lambda s: s['features'][0].update(points=['alien', 'heel']),
        lambda s: s['transitions'][0].update(to='absent'),
        lambda s: s['transitions'][0]['condition'].update(feature='absent'),
        lambda s: s.update(script='alert(1)'),
        lambda s: s['phases'].append(copy.deepcopy(s['phases'][0])),
        lambda s: s['error_rules'][0]['messages'].update(ru='я' * 57),
        lambda s: s['features'][0].update(scope='rep'),
        lambda s: s['transitions'][0]['condition'].update(value=float('nan')),
    ],
)
def test_movement_spec_rejects_invalid_graph_and_executable_fields(mutation):
    profile = fixture_profile()
    item = demo_personas.synthetic_plan(profile)['days'][0]['items'][0]
    spec = demo_personas.synthetic_spec(item, profile)
    mutation(spec)
    with pytest.raises(pydantic.ValidationError):
        schemas.movement_spec.MovementSpecV1.model_validate(spec)


async def test_movement_repair_success_failure_and_provider_unavailable(monkeypatch):
    profile = fixture_profile()
    item = demo_personas.synthetic_plan(profile)['days'][0]['items'][0]
    valid = demo_personas.synthetic_spec(item, profile)
    invalid = {**valid, 'script': 'forbidden'}
    generate = AsyncMock(return_value=invalid)
    repair = AsyncMock(return_value=valid)
    monkeypatch.setattr(openai, 'generate_movement_spec', generate)
    monkeypatch.setattr(openai, 'repair_movement_spec', repair)
    result, errors = await ai_coach.build_spec(item, profile, False)
    assert result and not errors and repair.await_count == 1
    repair.reset_mock()
    repair.return_value = invalid
    result, errors = await ai_coach.build_spec(item, profile, False)
    assert result is None and errors and repair.await_count == 1
    generate.side_effect = openai.AIProviderUnavailable
    assert (await ai_coach.build_spec(item, profile, False))[0] is None
    item['camera_coaching_requested'] = False
    assert (await ai_coach.build_spec(item, profile, False))[0] is None


def test_chunking_ranking_and_constraint_validation():
    text = ('Synthetic paragraph about controlled movement. ' * 30 + '\n\n') * 3
    chunks = documents.chunk_text(text)
    assert len(chunks) > 1 and all(0 < len(chunk) <= 1600 for chunk in chunks)
    with pytest.raises(ValueError):
        documents.chunk_text('x' * 50001)
    assert documents.cosine([1, 0], [1, 0]) == 1
    assert documents.cosine([0, 0], [1, 0]) == 0
    assert documents.cosine([float('nan')], [1]) == 0
    rows = [
        {'id': str(uuid.uuid4()), 'content': 'standing control', 'embedding': [1, 0]},
        {'id': str(uuid.uuid4()), 'content': 'dumbbell strength', 'embedding': [0, 1]},
    ]
    assert documents.rank_chunks('strength', rows, [0, 1], 1)[0] == rows[1]
    assert documents.rank_chunks('standing', rows, None, 1)[0] == rows[0]
    profile = fixture_profile()
    plan = demo_personas.synthetic_plan(profile)
    assert ai_coach.validate_plan(plan, profile, [], {})
    profile['constraints'] = ['no_high_impact']
    plan['days'][0]['items'][0]['impact_level'] = 'high'
    with pytest.raises(ValueError):
        ai_coach.validate_plan(plan, profile, [], {})


@pytest.mark.xdist_group('domains')
async def test_disabled_provider_preserves_deterministic_plan(
    client, guest, database, profile_payload
):
    headers, _ = guest
    await client.put('/api/v1/profile', json=profile_payload, headers=headers)
    response = await client.post(
        '/api/v1/training-plans/generate', json={'mode': 'ai_assisted'}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()['ai_metadata']['status'] == 'fallback'
    with pytest.raises(openai.AIProviderUnavailable):
        await openai.generate_personalized_plan({})
    with pytest.raises(openai.AIProviderUnavailable):
        await openai.create_embeddings(['synthetic'])


@pytest.mark.xdist_group('domains')
async def test_mocked_ai_retrieval_regeneration_and_manual_fallback(
    client, guest, database, monkeypatch
):
    from src.core import config

    monkeypatch.setenv('AI_FEATURE_ENABLED', 'true')
    monkeypatch.setenv('OPENAI_API_KEY', 'synthetic-test-key')
    monkeypatch.setenv('OPENAI_MODEL', 'mock-model')
    monkeypatch.setenv('OPENAI_EMBEDDING_MODEL', 'mock-embedding')
    config.clear_settings_cache()
    headers, user_id = guest
    loaded = await load(client, headers, 'maya')
    document = loaded['documents'][0]
    await confirm(client, headers, document)
    context = {
        key: loaded['context'][key]
        for key in [
            'self_description',
            'preferred_coach_style',
            'preferred_language',
            'additional_preferences',
        ]
    }
    context['additional_preferences']['synthetic'] = False
    assert (
        await client.put('/api/v1/ai-context', json=context, headers=headers)
    ).status_code == 200
    captured = []

    async def synthesize(payload):
        captured.append(payload)
        return demo_personas.deterministic_profile(
            payload['context'], payload['fitness_profile'], payload['confirmed_facts']
        )

    generation = 0

    async def plan(payload):
        nonlocal generation
        generation += 1
        result = demo_personas.synthetic_plan(payload['profile'])
        for day in result['days']:
            day['items'][0]['sets'] = generation + 1
        return result

    async def spec(exercise, profile):
        return (
            {'invalid': True}
            if 'Squat' in exercise['display_name']
            else demo_personas.synthetic_spec(exercise, profile)
        )

    embed = AsyncMock(side_effect=lambda texts: [[1.0, 0.0] for _ in texts])
    monkeypatch.setattr(openai, 'create_embeddings', embed)
    monkeypatch.setattr(openai, 'synthesize_user_profile', synthesize)
    monkeypatch.setattr(openai, 'generate_personalized_plan', plan)
    monkeypatch.setattr(openai, 'generate_movement_spec', spec)
    repair = AsyncMock(return_value={'still_invalid': True})
    monkeypatch.setattr(openai, 'repair_movement_spec', repair)
    first = await client.post(
        '/api/v1/training-plans/generate', json={'mode': 'ai_assisted'}, headers=headers
    )
    assert first.status_code == 200, first.text
    metadata = first.json()['ai_metadata']
    assert metadata['status'] == 'completed'
    assert [i['camera_coaching_mode'] for i in metadata['days'][0]['items']] == [
        'ai_generated',
        'manual_only',
    ]
    assert repair.await_count == 1
    assert captured[0]['retrieved_chunks']
    assert all(row['document_id'] == document['id'] for row in captured[0]['retrieved_chunks'])
    snapshot = await models.ai_coach.source_snapshot(uuid.UUID(user_id))
    assert all(row['embedding'] == [1.0, 0.0] for row in snapshot['chunks'])
    foreign = (await client.post('/api/v1/auth/guest')).json()
    assert not (await models.ai_coach.source_snapshot(uuid.UUID(foreign['user']['id'])))[
        'chunks'
    ]
    second = await client.post(
        '/api/v1/training-plans/generate', json={'mode': 'ai_assisted'}, headers=headers
    )
    assert second.json()['ai_metadata']['days'][0]['items'][0]['sets'] == 3
    assert (
        second.json()['ai_metadata']['days'][0]['items'][0]['exercise_key']
        != metadata['days'][0]['items'][0]['exercise_key']
    )
    monkeypatch.setattr(
        openai, 'synthesize_user_profile', AsyncMock(side_effect=openai.AIProviderUnavailable)
    )
    assert (await client.post('/api/v1/ai-profile/generate', headers=headers)).json()[
        'status'
    ] == 'fallback'


async def test_sdk_structured_output_and_embedding_validation(monkeypatch):
    import json
    from types import SimpleNamespace
    from unittest.mock import MagicMock

    from src.core import config

    monkeypatch.setenv('AI_FEATURE_ENABLED', 'true')
    monkeypatch.setenv('OPENAI_API_KEY', 'synthetic-test-key')
    monkeypatch.setenv('OPENAI_MODEL', 'mock-model')
    monkeypatch.setenv('OPENAI_EMBEDDING_MODEL', 'mock-embedding')
    config.clear_settings_cache()
    profile = fixture_profile()
    item = demo_personas.synthetic_plan(profile)['days'][0]['items'][0]
    spec = demo_personas.synthetic_spec(item, profile)
    parsed = schemas.ai_coach.AIUserProfileV1.model_validate(profile)
    client = SimpleNamespace(
        responses=SimpleNamespace(
            parse=AsyncMock(return_value=SimpleNamespace(output_parsed=parsed)),
            create=AsyncMock(return_value=SimpleNamespace(output_text=json.dumps(spec))),
        ),
        embeddings=SimpleNamespace(
            create=AsyncMock(
                return_value=SimpleNamespace(
                    data=[SimpleNamespace(index=0, embedding=[1.0, 0.0])]
                )
            )
        ),
    )
    manager = MagicMock()
    manager.__aenter__ = AsyncMock(return_value=client)
    manager.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(openai, '_client', None)
    monkeypatch.setattr(openai, '_client_key', None)
    client.close = AsyncMock()
    monkeypatch.setattr(openai.sdk, 'AsyncOpenAI', MagicMock(return_value=client))
    assert (await openai.synthesize_user_profile({'synthetic': True}))['summary'] == profile[
        'summary'
    ]
    args = client.responses.parse.call_args.kwargs
    assert args['store'] is False and args['text_format'] is schemas.ai_coach.AIUserProfileV1
    assert (await openai.generate_movement_spec(item, profile))['exercise_key'] == item[
        'exercise_key'
    ]
    assert client.responses.create.call_args.kwargs['text']['format']['strict'] is True
    assert await openai.create_embeddings(['synthetic']) == [[1.0, 0.0]]
    client.embeddings.create.return_value = SimpleNamespace(
        data=[SimpleNamespace(index=0, embedding=[float('nan')])]
    )
    with pytest.raises(openai.AIProviderUnavailable):
        await openai.create_embeddings(['synthetic'])
    client.responses.parse.return_value = SimpleNamespace(output_parsed=None)
    with pytest.raises(openai.AIProviderUnavailable):
        await openai.synthesize_user_profile({})


@pytest.mark.xdist_group('domains')
async def test_text_layer_pdf_is_extracted_without_retaining_raw_file(client, guest, database):
    from pypdf.generic import DecodedStreamObject
    from pypdf.generic import DictionaryObject
    from pypdf.generic import NameObject

    headers, _ = guest
    writer = PdfWriter()
    page = writer.add_blank_page(300, 300)
    font = DictionaryObject(
        {
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica'),
        }
    )
    page[NameObject('/Resources')] = DictionaryObject(
        {NameObject('/Font'): DictionaryObject({NameObject('/F1'): font})}
    )
    stream = DecodedStreamObject()
    stream.set_data(
        b'BT /F1 12 Tf 10 100 Td (Synthetic standing routine. Avoid high impact.) Tj ET'
    )
    page[NameObject('/Contents')] = stream
    output = io.BytesIO()
    writer.write(output)
    response = await client.post(
        '/api/v1/documents',
        files={'file': ('synthetic.pdf', output.getvalue(), 'application/pdf')},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    document = response.json()
    assert document['status'] == 'processed' and document['extracted_character_count'] > 20
    assert any('high impact' in fact['source_excerpt'] for fact in document['facts'])
    assert 'extracted_text' not in document and all(
        f['status'] == 'pending' for f in document['facts']
    )
