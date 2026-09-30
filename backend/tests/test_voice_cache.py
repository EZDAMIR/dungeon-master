"""Shared cache isolation, resumable paid batches and real MP3 cutting."""

import array
import asyncio
import base64
import collections
import copy
import json
import shutil
import subprocess
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from src.ai import elevenlabs
from src.ai import voice_batch
from src.api.controllers import speech
from src.api.controllers import voice_cache
from src.api.schemas.speech import PreviewCreate
from src.cli import warm_voice_cache
from src.core import config
from src.core import voice_assets

MP3 = b'ID3' + b'x' * 64
PREFS = {'voice_id': 'voice-one', 'language': 'ru', 'style': 'supportive'}


@pytest.fixture
def disk(tmp_path, monkeypatch):
    monkeypatch.setenv('AUDIO_SHARED_CACHE_DIR', str(tmp_path))
    monkeypatch.setenv('AUDIO_SHARED_CACHE_MAX_MB', '1')
    for language in ('RU', 'KK', 'EN'):
        monkeypatch.setenv('ELEVENLABS_MODEL_' + language, 'eleven_v4')
    config.clear_settings_cache()
    monkeypatch.setattr(speech, '_cache', collections.OrderedDict())
    monkeypatch.setattr(speech, '_cache_bytes', 0)
    return tmp_path


def cache_key():
    return voice_assets.key('Hello', 'voice', 'eleven_v4', 'en', 'supportive', 'v1')


def timed(texts):
    text = '\n'.join(texts)
    return {
        'audio_base64': base64.b64encode(MP3).decode(),
        'alignment': {
            'characters': list(text),
            'character_start_times_seconds': [i * 0.1 for i in range(len(text))],
            'character_end_times_seconds': [(i + 1) * 0.1 for i in range(len(text))],
        },
    }


async def test_disk_survives_memory_reset_and_shares_only_fixed_cues(disk, monkeypatch):
    provider = AsyncMock(return_value=MP3)
    budget = AsyncMock()
    monkeypatch.setattr(elevenlabs, 'synthesize', provider)
    monkeypatch.setattr(speech, 'budget', budget)
    a, b = SimpleNamespace(id=uuid.uuid4()), SimpleNamespace(id=uuid.uuid4())
    assert (await speech.audio(a, 'Hello', PREFS, 'v1', shared=True))['cache'] == 'miss'
    speech._cache.clear()
    speech._cache_bytes = 0
    assert (await speech.audio(b, 'Hello', PREFS, 'v1', shared=True))['cache'] == 'hit'
    assert provider.await_count == budget.await_count == 1
    assert len(list(disk.glob('*.mp3'))) == 1
    await speech.audio(a, 'Private health text', PREFS, 'message:1')
    await speech.audio(b, 'Private health text', PREFS, 'message:1')
    assert provider.await_count == 3
    assert len(list(disk.glob('*.mp3'))) == 1


async def test_concurrent_static_requests_generate_once(disk, monkeypatch):
    async def render(*args):
        await asyncio.sleep(0.03)
        return MP3

    provider = AsyncMock(side_effect=render)
    monkeypatch.setattr(elevenlabs, 'synthesize', provider)
    monkeypatch.setattr(speech, 'budget', AsyncMock())
    user = SimpleNamespace(id=uuid.uuid4())
    results = await asyncio.gather(
        *[speech.audio(user, 'Hello', PREFS, 'v1', shared=True) for _ in range(4)]
    )
    assert provider.await_count == 1
    assert sum(value['cache'] == 'miss' for value in results) == 1


@pytest.mark.parametrize('language', ['ru', 'kk', 'en'])
async def test_new_preview_replaces_old_audio_and_uses_the_same_catalog_key(
    disk, monkeypatch, language
):
    text = speech.PREVIEW[speech.LANG_INDEX[language]]
    old_audio = b'ID3' + b'old' * 32
    old_key = voice_assets.key(
        text, 'voice-one', 'eleven_v4', language, 'supportive', 'preview-v1'
    )
    assert await voice_assets.put(old_key, old_audio)
    provider = AsyncMock(return_value=MP3)
    monkeypatch.setattr(elevenlabs, 'synthesize', provider)
    monkeypatch.setattr(speech, 'budget', AsyncMock())
    body = PreviewCreate(language=language, style='supportive')
    first = await speech.preview(SimpleNamespace(id=uuid.uuid4()), 'voice-one', body)
    assert first.body == MP3
    assert first.headers['X-Audio-Cache'] == 'miss'
    provider.assert_awaited_once_with('voice-one', text, language, 'supportive')
    assert voice_cache.catalog(language)[-1] == ('preview', text, speech.PREVIEW_VERSION)
    assert elevenlabs.delivery_text(text, 'supportive', 'eleven_v4').startswith('[warmly] ')
    assert '…' in text and '?' in text and text.endswith('!')
    speech._cache.clear()
    second = await speech.preview(SimpleNamespace(id=uuid.uuid4()), 'voice-one', body)
    assert second.body == MP3 and second.headers['X-Audio-Cache'] == 'hit'
    assert provider.await_count == 1


async def test_content_keys_atomic_writes_corruption_and_capacity(disk):
    values = ['Hello', 'voice', 'eleven_v4', 'en', 'supportive', 'v1']
    initial = voice_assets.key(*values)
    for index in range(len(values)):
        changed = values.copy()
        changed[index] += '-changed'
        assert voice_assets.key(*changed) != initial
    with pytest.raises(ValueError):
        voice_assets.path('../outside')
    assert await voice_assets.get(initial) is None
    assert not await voice_assets.put(initial, b'{}')
    assert await voice_assets.put(initial, MP3)
    assert await voice_assets.get(initial) == MP3
    assert not list(disk.glob('.pending-*'))
    voice_assets.path(initial).write_bytes(b'{}')
    assert await voice_assets.get(initial) is None
    assert await voice_assets.put(initial, b'ID3' + b'x' * (1024 * 1024 - 3))
    other = voice_assets.key('Other', *values[1:])
    assert not await voice_assets.put(other, MP3)
    assert await voice_assets.put(initial, MP3)
    assert await voice_assets.put(other, MP3)
    assert await voice_assets.put_batch(initial, {'ok': True})
    assert await voice_assets.get_batch(initial) == {'ok': True}
    voice_assets.path(initial, '.json').write_text('invalid')
    assert await voice_assets.get_batch(initial) is None
    assert not await voice_assets.put_batch(initial, {'huge': 'x' * (20 * 1024 * 1024)})


async def test_disabled_or_unwritable_storage_falls_back(disk, monkeypatch):
    monkeypatch.setenv('AUDIO_SHARED_CACHE_DIR', '')
    config.clear_settings_cache()
    assert await voice_assets.get(cache_key()) is None
    assert not await voice_assets.put(cache_key(), MP3)
    assert not await voice_assets.put_batch(cache_key(), {})
    async with voice_assets.lease(cache_key()):
        pass
    blocker = disk / 'file'
    blocker.write_text('not a directory')
    monkeypatch.setenv('AUDIO_SHARED_CACHE_DIR', str(blocker))
    config.clear_settings_cache()
    assert not await voice_assets.put(cache_key(), MP3)
    assert not await voice_assets.put_batch(cache_key(), {})
    async with voice_assets.lease(cache_key()):
        pass


@pytest.mark.parametrize(
    'style,tag',
    [
        ('calm', '[calm]'),
        ('supportive', '[warmly]'),
        ('energetic', '[excited]'),
        ('strict', '[firmly]'),
    ],
)
def test_delivery_uses_punctuation_and_v4_tags(style, tag):
    long = 'Please take your time and prepare for the next exercise'
    assert elevenlabs.delivery_text(long, style, 'eleven_v4') == tag + ' ' + long + '.'
    assert elevenlabs.delivery_text('Three', style, 'eleven_v4') == 'Three.'
    assert elevenlabs.delivery_text('Stop!', style, 'eleven_v4') == 'Stop!'
    assert elevenlabs.delivery_text(long, style, 'eleven_flash_v2_5') == long + '.'


def test_timestamps_find_repeated_cues_and_normalized_fallback():
    body = timed(['Start.', 'Start.', 'Stop!'])
    audio, spans = voice_batch.boundaries(body, ['Start', 'Start', 'Stop'])
    assert audio == MP3 and len(spans) == 3
    assert spans[0][1] <= spans[1][0] <= spans[1][1] <= spans[2][0]
    body['normalized_alignment'] = body['alignment']
    body['alignment'] = {}
    assert voice_batch.boundaries(body, ['Start', 'Start', 'Stop'])[1] == spans


@pytest.mark.parametrize(
    'error', ['base64', 'audio', 'missing', 'nan', 'backward', 'length', 'zero', 'overlap']
)
def test_invalid_alignment_never_caches_a_wrong_clip(error):
    body = timed(['First.', 'Second.'])
    alignment = body['alignment']
    if error == 'base64':
        body['audio_base64'] = '!invalid'
    elif error == 'audio':
        body['audio_base64'] = base64.b64encode(b'{}').decode()
    elif error == 'missing':
        alignment['characters'] = ['x'] * len(alignment['characters'])
    elif error == 'nan':
        alignment['character_start_times_seconds'][0] = float('nan')
    elif error == 'backward':
        alignment['character_start_times_seconds'][1] = -1
    elif error == 'length':
        alignment['characters'].pop()
    elif error == 'zero':
        alignment['character_start_times_seconds'] = [0] * len(alignment['characters'])
        alignment['character_end_times_seconds'] = [0] * len(alignment['characters'])
    elif error == 'overlap':
        alignment['character_end_times_seconds'][4] = 10
    with pytest.raises(elevenlabs.SpeechUnavailable, match='batch_alignment'):
        voice_batch.boundaries(body, ['First', 'Second'])


async def test_timed_provider_protocol_and_failures(monkeypatch):
    request = AsyncMock(return_value=httpx.Response(200, json=timed(['Start.'])))
    monkeypatch.setattr(elevenlabs, 'request', request)
    assert await voice_batch.render('voice', ['Start'], 'en', 'supportive', 'eleven_v4')
    args = request.await_args
    assert args.args == ('POST', '/v1/text-to-speech/voice/with-timestamps')
    assert args.kwargs['json']['text'] == 'Start.'
    assert args.kwargs['json']['model_id'] == 'eleven_v4'
    with pytest.raises(elevenlabs.SpeechUnavailable, match='batch_config'):
        await voice_batch.render('voice', ['Start'], 'en', 'supportive', 'eleven_v3')
    request.return_value = httpx.Response(200, json={})
    with pytest.raises(elevenlabs.SpeechUnavailable, match='batch_schema'):
        await voice_batch.render('voice', ['Start'], 'en', 'supportive', 'eleven_v4')
    request.return_value = httpx.Response(
        200, json={'character_limit': 1000, 'character_count': 100}
    )
    assert await elevenlabs.remaining_characters() == 900
    request.return_value = httpx.Response(200, json={})
    with pytest.raises(elevenlabs.SpeechUnavailable, match='subscription_schema'):
        await elevenlabs.remaining_characters()


@pytest.fixture
def account(disk, monkeypatch):
    monkeypatch.setattr(elevenlabs, 'validate_model', AsyncMock(return_value='eleven_v4'))
    monkeypatch.setattr(
        elevenlabs,
        'voices',
        AsyncMock(
            return_value={
                'voices': [{'voice_id': 'voice-one'}, {'voice_id': 'voice-two'}],
                'has_more': False,
            }
        ),
    )
    monkeypatch.setattr(elevenlabs, 'remaining_characters', AsyncMock(return_value=100000))
    render = AsyncMock(side_effect=lambda voice, texts, *args: timed(texts))
    monkeypatch.setattr(voice_batch, 'render', render)
    monkeypatch.setattr(
        voice_batch, 'split', AsyncMock(side_effect=lambda body, texts: [MP3] * len(texts))
    )
    monkeypatch.setattr(voice_cache.shutil, 'which', lambda command: '/usr/bin/ffmpeg')
    return render


async def test_plan_dry_run_execution_and_restart_resume(account, monkeypatch):
    plan = await voice_cache.plan(['ru', 'kk', 'en'], 'supportive')
    assert plan['total_clips'] == plan['missing_clips'] == 144
    assert plan['new_characters'] > 0 and account.await_count == 0
    progress = []
    assert (await voice_cache.execute(plan, 100000, progress.append))['prepared'] == 144
    assert account.await_count == 6 and len(progress) == 6
    second = await voice_cache.plan(['ru', 'kk', 'en'], 'supportive')
    assert second['missing_clips'] == second['new_characters'] == 0
    assert (await voice_cache.execute(second, 0, progress.append))['prepared'] == 0
    # Lose a cut, retain original paid response, resume with no new TTS call.
    job = plan['jobs'][0]
    voice_assets.path(job['keys'][0]).unlink()
    resumed = await voice_cache.plan(['ru'], 'supportive', 'voice-one')
    assert resumed['new_characters'] == 0 and resumed['missing_clips'] == 1
    assert (await voice_cache.execute(resumed, 0, progress.append))['prepared'] == 1
    assert account.await_count == 6
    assert (await voice_cache.prepare_job(job))['prepared'] == 0


async def test_failures_stop_before_paid_requests_and_keep_raw_response(account, monkeypatch):
    plan = await voice_cache.plan(['en'], 'supportive', 'voice-one')
    with pytest.raises(elevenlabs.SpeechUnavailable, match='cache_quota'):
        await voice_cache.execute(plan, 1, lambda value: None)
    assert account.await_count == 0
    monkeypatch.setattr(voice_cache.shutil, 'which', lambda command: None)
    with pytest.raises(elevenlabs.SpeechUnavailable, match='ffmpeg_required'):
        await voice_cache.execute(plan, 100000, lambda value: None)
    monkeypatch.setattr(
        voice_batch,
        'split',
        AsyncMock(side_effect=elevenlabs.SpeechUnavailable('audio_split')),
    )
    with pytest.raises(elevenlabs.SpeechUnavailable, match='audio_split'):
        await voice_cache.prepare_job(plan['jobs'][0])
    assert await voice_assets.get_batch(plan['jobs'][0]['batch_key']) is not None
    assert account.await_count == 1
    monkeypatch.setattr(voice_batch, 'split', AsyncMock(return_value=[MP3] * 24))
    assert (await voice_cache.prepare_job(plan['jobs'][0]))['prepared'] == 24
    assert account.await_count == 1


async def test_plan_validates_configuration_and_complete_pagination(account, monkeypatch):
    for languages, style in [
        ([], 'supportive'),
        (['fr'], 'calm'),
        (['en', 'en'], 'calm'),
        (['en'], 'bad'),
    ]:
        with pytest.raises(elevenlabs.SpeechUnavailable, match='cache_config'):
            await voice_cache.plan(languages, style)
    with pytest.raises(elevenlabs.SpeechUnavailable, match='voice_unavailable'):
        await voice_cache.plan(['en'], 'calm', 'unknown')
    monkeypatch.setenv('ELEVENLABS_MODEL_EN', 'eleven_v3')
    config.clear_settings_cache()
    with pytest.raises(elevenlabs.SpeechUnavailable, match='cache_model_config'):
        await voice_cache.plan(['en'], 'calm')
    monkeypatch.setenv('ELEVENLABS_MODEL_EN', 'eleven_v4')
    config.clear_settings_cache()
    monkeypatch.setattr(
        elevenlabs,
        'voices',
        AsyncMock(return_value={'voices': [], 'has_more': True, 'next_page_token': 'repeat'}),
    )
    with pytest.raises(elevenlabs.SpeechUnavailable, match='voice_pagination'):
        await voice_cache.plan(['en'], 'calm')
    assert account.await_count == 0


async def test_cli_defaults_are_read_only_and_errors_are_typed(account, monkeypatch, capsys):
    args = SimpleNamespace(
        languages=['en'],
        style='supportive',
        voice_id=None,
        execute=False,
        max_characters=100000,
    )
    assert await warm_voice_cache.run(args) == 0
    assert account.await_count == 0
    assert json.loads(capsys.readouterr().out)['total_clips'] == 48
    args.execute = True
    assert await warm_voice_cache.run(args) == 0
    assert account.await_count == 2
    args.languages = ['fr']
    assert await warm_voice_cache.run(args) == 2
    assert 'cache_config' in capsys.readouterr().out


async def test_real_ffmpeg_cut_and_errors(tmp_path, monkeypatch):
    if not shutil.which('ffmpeg'):
        pytest.skip('ffmpeg executable is available in the production image')
    target = tmp_path / 'silence.mp3'
    subprocess.run(
        [
            'ffmpeg',
            '-nostdin',
            '-loglevel',
            'error',
            '-f',
            'lavfi',
            '-i',
            'anullsrc',
            '-t',
            '4',
            str(target),
        ],
        check=True,
        capture_output=True,
    )
    body = timed(['First.', 'Second.'])
    body['audio_base64'] = base64.b64encode(target.read_bytes()).decode()
    clips = await voice_batch.split(body, ['First', 'Second'])
    assert len(clips) == 2 and all(voice_assets.valid_audio(clip) for clip in clips)
    monkeypatch.setattr(
        voice_batch.subprocess, 'run', lambda *a, **k: (_ for _ in ()).throw(OSError())
    )
    with pytest.raises(elevenlabs.SpeechUnavailable, match='audio_split'):
        await voice_batch.split(copy.deepcopy(body), ['First', 'Second'])


async def test_only_ready_professional_and_verified_voices_are_selectable(monkeypatch):
    rows = [
        {'voice_id': 'ordinary', 'name': 'Ordinary'},
        {
            'voice_id': 'ready',
            'name': 'Ready',
            'category': 'professional',
            'fine_tuning': {'state': {'eleven_multilingual_v2': 'fine_tuned'}},
        },
        {
            'voice_id': 'not-trained',
            'name': 'Not trained',
            'category': 'professional',
            'fine_tuning': {'state': {}},
        },
        {
            'voice_id': 'queued',
            'name': 'Queued',
            'category': 'professional',
            'fine_tuning': {'state': {'eleven_v4': 'queued'}},
        },
        {
            'voice_id': 'not-verified',
            'name': 'Not verified',
            'voice_verification': {'requires_verification': True, 'is_verified': False},
        },
        {
            'voice_id': 'verified',
            'name': 'Verified',
            'voice_verification': {'requires_verification': True, 'is_verified': True},
        },
    ]
    monkeypatch.setattr(
        elevenlabs,
        'request',
        AsyncMock(return_value=httpx.Response(200, json={'voices': rows, 'has_more': False})),
    )
    page = await elevenlabs.voices(100)
    assert [row['voice_id'] for row in page['voices']] == ['ordinary', 'ready', 'verified']
    assert len(page['unavailable_voices']) == 3
    assert not await elevenlabs.voice_allowed('not-trained')
    monkeypatch.setattr(elevenlabs, 'validate_model', AsyncMock(return_value='eleven_v4'))
    listed = await speech.list_voices(SimpleNamespace(id=uuid.uuid4()), 'ru', 100, None)
    assert 'unavailable_voices' not in listed
    assert len(listed['voices']) == 3


@pytest.mark.parametrize(
    'body,category',
    [
        (
            {'detail': {'status': 'voice_not_fine_tuned', 'message': 'private'}},
            'voice_unavailable',
        ),
        ({'detail': 'private'}, 'invalid_request'),
        ([], 'invalid_request'),
    ],
)
async def test_unready_voice_provider_error_is_typed(body, category, monkeypatch):
    from src.core import http_client

    monkeypatch.setenv('ELEVENLABS_API_KEY', 'synthetic-key')
    config.clear_settings_cache()
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda request: httpx.Response(400, json=body))
    )
    monkeypatch.setattr(http_client, 'get_client', lambda: client)
    try:
        with pytest.raises(elevenlabs.SpeechUnavailable, match=category):
            await elevenlabs.request('POST', '/v1/text-to-speech/test')
    finally:
        await client.aclose()


async def test_cli_reports_unready_voices_without_preparing_them(account, monkeypatch):
    monkeypatch.setattr(
        elevenlabs,
        'voices',
        AsyncMock(
            return_value={
                'voices': [{'voice_id': 'voice-one'}],
                'unavailable_voices': [
                    {'voice_id': 'unready', 'name': 'Unready', 'reason': 'voice_not_ready'}
                ],
                'has_more': False,
            }
        ),
    )
    plan = await voice_cache.plan(['ru'], 'supportive')
    assert plan['voices'] == 1 and plan['total_clips'] == 24
    assert plan['unavailable_voices'][0]['voice_id'] == 'unready'
    assert {job['voice'] for job in plan['jobs']} == {'voice-one'}
    assert account.await_count == 0


async def test_input_seek_cuts_the_correct_audio_not_just_a_valid_mp3(tmp_path):
    if not shutil.which('ffmpeg'):
        pytest.skip('ffmpeg is included in the production image')
    source = tmp_path / 'tones.mp3'
    subprocess.run(
        [
            'ffmpeg',
            '-nostdin',
            '-loglevel',
            'error',
            '-f',
            'lavfi',
            '-i',
            'sine=frequency=440:duration=1.5',
            '-f',
            'lavfi',
            '-i',
            'sine=frequency=880:duration=1.5',
            '-filter_complex',
            '[0:a][1:a]concat=n=2:v=0:a=1',
            str(source),
        ],
        check=True,
        capture_output=True,
    )
    body = timed(['A', 'B'])
    body['audio_base64'] = base64.b64encode(source.read_bytes()).decode()
    body['alignment'] = {
        'characters': ['A', 'B'],
        'character_start_times_seconds': [0.5, 2.0],
        'character_end_times_seconds': [0.9, 2.4],
    }
    clips = await voice_batch.split(body, ['A', 'B'])
    for index, (clip, frequency) in enumerate(zip(clips, [440, 880], strict=True)):
        target = tmp_path / f'clip-{index}.mp3'
        target.write_bytes(clip)
        decoded = subprocess.run(
            [
                'ffmpeg',
                '-nostdin',
                '-loglevel',
                'error',
                '-i',
                str(target),
                '-ac',
                '1',
                '-ar',
                '8000',
                '-f',
                's16le',
                'pipe:1',
            ],
            capture_output=True,
            check=True,
        )
        samples = array.array('h', decoded.stdout)
        crossings = sum(a < 0 <= b for a, b in zip(samples, samples[1:], strict=False))
        assert crossings / (len(samples) / 8000) == pytest.approx(frequency, rel=0.03)
