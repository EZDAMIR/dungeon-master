"""Sprint 4A profile/plan orchestration; provider work never holds a DB session."""

import asyncio
import datetime
import json
import uuid
import zoneinfo

import pydantic

from ...ai import openai
from ...core import config
from .. import controllers
from .. import exceptions
from .. import models
from .. import schemas

FALLBACK_COPY = 'AI временно недоступен. Мы подготовили базовый план по вашим настройкам'


async def get_context(current_user: schemas.UserCurrent) -> dict:
    try:
        return await models.ai_coach.context_get(current_user.id)
    except models.AISourceNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Заполните context') from exc


async def replace_context(
    current_user: schemas.UserCurrent, body: schemas.ai_coach.AIContextUpdate
) -> dict:
    return await models.ai_coach.context_replace(
        current_user.id, body.model_dump(mode='json', by_alias=True)
    )


def is_synthetic(context: dict, execution_mode: str | None = None) -> bool:
    settings = config.get_settings()
    return bool(
        (execution_mode or settings.COACH_EXECUTION_MODE) == 'fixture'
        and settings.ENABLE_FIXTURE_MODE
        and (settings.APP_ENV == 'development' or settings.ENABLE_DEMO_PERSONAS)
        and context['additional_preferences'].get('synthetic')
        and context['additional_preferences'].get('persona_key')
        in controllers.demo_personas.PERSONAS
    )


def valid_sources(references: list[dict], facts: list[dict], progress: dict) -> bool:
    documents = {str(fact['document_id']) for fact in facts}
    for reference in references:
        kind = reference.get('type', reference.get('source_type'))
        if kind == 'document' and str(reference['source_id']) not in documents:
            return False
        if kind in {'profile', 'preferences'} and reference.get('source_id') is not None:
            return False
        if (
            kind == 'progress'
            and reference.get('source_id') is not None
            and str(reference['source_id'])
            not in {str(row['id']) for row in progress.get('recent_sessions', [])}
        ):
            return False
        if kind == 'progress' and not progress.get('completed_sessions'):
            return False
    return True


async def generate_profile(
    current_user: schemas.UserCurrent, execution_mode: str | None = None
) -> dict:
    context = await get_context(current_user)
    profile = await controllers.profiles.get_profile(current_user)
    snapshot = await models.ai_coach.source_snapshot(current_user.id)
    progress = await models.progress.progress_summary(current_user.id, 5)
    input_revision = controllers.schedule.payload_hash(
        {'context': context, 'profile': profile, 'facts': snapshot['facts']}
    )
    requested_mode = execution_mode or config.get_settings().COACH_EXECUTION_MODE
    if requested_mode == 'fixture' and not config.get_settings().ENABLE_FIXTURE_MODE:
        raise exceptions.HTTPForbiddenException(detail='Fixture mode disabled')
    try:
        cached = await models.ai_coach.profile_current(current_user.id)
        provenance = cached.get('provenance') or {}
        if (
            cached.get('input_revision') == input_revision
            and provenance.get('execution_mode') == requested_mode
        ):
            cached['provenance'] = {**provenance, 'cached': True}
            return cached
    except models.AISourceNotFound:
        pass
    query = context['self_description'] + ' ' + json.dumps(profile, default=str)
    if is_synthetic(context, execution_mode):
        retrieved = controllers.documents.rank_chunks(query, snapshot['chunks'], None)
        retrieved = [
            {
                'id': str(row['id']),
                'document_id': str(row['document_id']),
                'content': '\n'.join(
                    fact['source_excerpt']
                    for fact in snapshot['facts']
                    if fact['document_id'] == row['document_id']
                    and fact['source_excerpt'] in row['content']
                ),
            }
            for row in retrieved
        ]
        retrieval = 'lexical'
    else:
        retrieved, retrieval = await controllers.documents.retrieve(
            current_user, query, snapshot
        )
    canonical = controllers.demo_personas.deterministic_profile(
        context, profile, snapshot['facts']
    )
    result = canonical
    model = (
        'synthetic-demo-v1'
        if is_synthetic(context, execution_mode)
        else 'deterministic-profile-v1'
    )
    status = 'synthetic' if is_synthetic(context, execution_mode) else 'fallback'
    if not is_synthetic(context, execution_mode) and requested_mode != 'fallback':
        try:
            proposed = await openai.synthesize_user_profile(
                {
                    'fitness_profile': profile,
                    'context': context,
                    'confirmed_facts': snapshot['facts'],
                    'retrieved_chunks': retrieved,
                    'progress': progress,
                    'confirmed_constraints': canonical['constraints'],
                }
            )
            proposed = schemas.ai_coach.AIUserProfileV1.model_validate(proposed).model_dump(
                mode='json'
            )
            if (
                set(proposed['constraints']) != set(canonical['constraints'])
                or set(proposed['equipment']) != set(profile['equipment'])
                or proposed['schedule']['days_per_week'] > min(4, profile['days_per_week'])
                or proposed['schedule']['minutes_per_session'] != profile['session_minutes']
                or proposed['coach_persona']['language'] != context['preferred_language']
                or not valid_sources(
                    proposed['source_highlights'], snapshot['facts'], progress
                )
            ):
                raise openai.AIProviderUnavailable
            result = proposed
            status = 'completed'
            model = config.get_settings().OPENAI_MODEL
        except openai.AIProviderUnavailable:
            pass
    try:
        saved = await models.ai_coach.profile_create(
            current_user.id,
            {
                'profile': result,
                'source_document_ids': sorted(
                    {str(fact['document_id']) for fact in snapshot['facts']}
                ),
                'model': model,
                'status': status,
                'input_revision': input_revision,
                'provenance': {
                    'execution_mode': 'fixture'
                    if status == 'synthetic'
                    else 'live'
                    if status == 'completed'
                    else 'fallback',
                    'model_used': model,
                    'prompt_version': 'user-profile-v1',
                    'generated_at': datetime.datetime.now(datetime.UTC).isoformat(),
                    'input_revision': input_revision,
                    'cached': False,
                },
            },
            context['id'],
            snapshot['facts'],
            context['updated_at'],
        )
    except models.AIContextChanged as exc:
        raise exceptions.HTTPConflictException(
            detail='Context изменился. Создайте профиль ещё раз'
        ) from exc
    saved['retrieval'] = {'method': retrieval, 'chunk_ids': [row['id'] for row in retrieved]}
    return saved


async def current_profile(current_user: schemas.UserCurrent) -> dict:
    try:
        return await models.ai_coach.profile_current(current_user.id)
    except models.AISourceNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Создайте персональный профиль') from exc


def validate_plan(plan: dict, profile: dict, facts: list[dict], progress: dict) -> dict:
    plan = schemas.ai_coach.AIPlanV1.model_validate(plan).model_dump(mode='json')
    constraints = set(profile['constraints'])
    equipment = set(profile['equipment']) - {'none'}
    if len(plan['days']) > profile['schedule']['days_per_week']:
        raise ValueError('Schedule exceeds user availability')
    for day in plan['days']:
        if day['estimated_minutes'] > profile['schedule']['minutes_per_session'] + 10:
            raise ValueError('Session exceeds time limit')
        for item in day['items']:
            if (
                not (set(item['equipment_codes']) - {'none'}) <= equipment
                or set(item['contraindication_tags']) & constraints
            ):
                raise ValueError('Exercise violates confirmed preferences')
            words = (
                item['display_name'] + ' ' + item['description'] + ' ' + item['instruction']
            ).casefold()
            if 'no_high_impact' in constraints and (
                item['impact_level'] == 'high'
                or any(word in words for word in ['jump', 'burpee', 'прыж'])
            ):
                raise ValueError('High impact excluded')
            if 'avoid_overhead' in constraints and any(
                word in words for word in ['overhead', 'над головой', 'shoulder press']
            ):
                raise ValueError('Overhead excluded')
            if 'avoid_deep_knee_flexion' in constraints and any(
                word in words for word in ['squat', 'lunge', 'присед', 'выпад']
            ):
                raise ValueError('Deep knee flexion excluded')
            if not valid_sources(item['source_references'], facts, progress):
                raise ValueError('Unknown source')
            item['swap_available'] = False
            item['detail_available'] = True
    if any(
        block['routine_type'] not in profile['routine_preferences']
        for block in plan['routine_blocks']
    ):
        raise ValueError('Unrequested routine')
    return plan


def validation_errors(spec: dict, exercise: dict) -> tuple[dict | None, list[str]]:
    try:
        result = schemas.movement_spec.MovementSpecV1.model_validate(spec).model_dump(
            mode='json', by_alias=True
        )
        if (
            result['exercise_key'] != exercise['exercise_key']
            or result['display_name'] != exercise['display_name']
            or result['camera']['preferred_angle'] != exercise['camera_angle']
        ):
            return None, ['Spec identity or camera angle mismatch']
        return result, []
    except pydantic.ValidationError as exc:
        return None, [
            f'{".".join(str(part) for part in error["loc"])}: {error["type"]}'[:160]
            for error in exc.errors()[:20]
        ]


async def build_spec(
    exercise: dict, profile: dict, synthetic: bool
) -> tuple[dict | None, list[str]]:
    if not exercise['camera_coaching_requested'] or exercise['camera_angle'] == 'none':
        return None, []
    raw = None
    try:
        raw = (
            controllers.demo_personas.synthetic_spec(exercise, profile)
            if synthetic
            else await openai.generate_movement_spec(exercise, profile)
        )
        spec, errors = validation_errors(raw, exercise)
        if spec is not None:
            return spec, []
        repaired = await openai.repair_movement_spec(raw, errors)
        return validation_errors(repaired, exercise)
    except openai.AIProviderUnavailable:
        return None, ['Camera coaching unavailable']


async def persist_exercise(
    current_user: schemas.UserCurrent, exercise: dict, profile: dict, synthetic: bool
) -> dict:
    spec, errors = await build_spec(exercise, profile, synthetic)
    status = 'valid' if spec else 'manual_only'
    model = 'synthetic-demo-v1' if synthetic else config.get_settings().OPENAI_MODEL
    saved = await models.ai_coach.spec_save(
        current_user.id,
        {
            'key': exercise['exercise_key'],
            'name': exercise['display_name'],
            'difficulty': exercise['difficulty'],
            'equipment_codes': exercise['equipment_codes'],
            'impact_level': exercise['impact_level'],
            'camera_angle': exercise['camera_angle'],
            'contraindication_tags': exercise['contraindication_tags'],
            'analysis_profile': {
                'version': 1,
                'engine_key': 'generic_v1',
                'engine_version': 'generic-v1',
                'target_reps': exercise['target_reps'],
                'supported_client': 'web',
            },
        },
        {
            'exercise_key': exercise['exercise_key'],
            'display_name': exercise['display_name'],
            'description': exercise['description'],
            'difficulty': exercise['difficulty'],
            'equipment_codes': exercise['equipment_codes'],
            'camera_angle': exercise['camera_angle'],
            'movement_spec': spec,
            'generated_by_model': model,
            'status': status,
            'validation_errors': errors,
        },
    )
    return saved


async def fallback_plan(
    current_user: schemas.UserCurrent, job_guard: dict | None = None
) -> dict:
    plan = await controllers.training_plans.generate(
        current_user,
        ai_metadata={
            'status': 'fallback',
            'message': FALLBACK_COPY,
            'provenance': {
                'execution_mode': 'fallback',
                'model_used': 'deterministic-v1',
                'prompt_version': 'deterministic-v1',
                'generated_at': datetime.datetime.now(datetime.UTC).isoformat(),
                'cached': False,
            },
        },
        job_guard=job_guard,
    )
    profile = await controllers.profiles.get_profile(current_user)
    await models.ai_coach.run_create(
        current_user.id,
        {
            'model': 'deterministic-v1',
            'profile_snapshot': schemas.profiles.ProfileGet.model_validate(profile).model_dump(
                mode='json'
            ),
            'retrieved_chunk_ids': [],
            'output': {'plan_id': str(plan['id']), 'message': FALLBACK_COPY},
            'status': 'fallback',
        },
    )
    return plan


async def generate_plan(
    current_user: schemas.UserCurrent,
    *,
    execution_mode: str | None = None,
    on_stage=None,
    job_guard: dict | None = None,
) -> dict:
    try:
        async with asyncio.timeout(config.get_settings().GENERATION_JOB_TIMEOUT_SECONDS):
            return await _generate_plan(
                current_user,
                execution_mode=execution_mode,
                on_stage=on_stage,
                job_guard=job_guard,
            )
    except TimeoutError:
        return await fallback_plan(current_user, job_guard=job_guard)


async def _generate_plan(
    current_user: schemas.UserCurrent,
    *,
    execution_mode: str | None = None,
    on_stage=None,
    job_guard: dict | None = None,
) -> dict:
    async def stage(name, completed=0, total=0):
        if on_stage:
            await on_stage(name, completed, total)

    await stage('preparing_context')
    try:
        context = await get_context(current_user)
    except exceptions.HTTPNotFoundException:
        return await fallback_plan(current_user, job_guard=job_guard)
    synthetic = is_synthetic(context, execution_mode)
    if not synthetic and not config.get_settings().ai_available:
        return await fallback_plan(current_user, job_guard=job_guard)
    saved_profile = await generate_profile(current_user, execution_mode)
    await stage('generating_plan')
    profile = saved_profile['profile']
    snapshot = await models.ai_coach.source_snapshot(current_user.id)
    progress = await models.progress.progress_summary(current_user.id, 5)
    try:
        async with asyncio.timeout(config.get_settings().GENERATION_JOB_TIMEOUT_SECONDS):
            proposed = (
                controllers.demo_personas.synthetic_plan(profile)
                if synthetic
                else await openai.generate_personalized_plan(
                    {
                        'profile': profile,
                        'confirmed_facts': snapshot['facts'],
                        'retrieved_chunks': (
                            await controllers.documents.retrieve(
                                current_user, context['self_description'], snapshot
                            )
                        )[0],
                        'progress': progress,
                    }
                )
            )
            plan = validate_plan(proposed, profile, snapshot['facts'], progress)
            unique = {}
            for day in plan['days']:
                for item in day['items']:
                    original = item['exercise_key']
                    if original not in unique:
                        # Sprint 4A server owns identity; generated keys cannot capture another user's exercise.
                        unique[original] = {
                            **item,
                            'exercise_key': original[:40] + '_' + uuid.uuid4().hex[:12],
                        }
                    item['exercise_key'] = unique[original]['exercise_key']
            await stage('generating_specs', 0, len(unique))
            completed_specs = 0
            gate = asyncio.Semaphore(4)

            async def prepare(item):
                nonlocal completed_specs
                async with gate:
                    result = await persist_exercise(current_user, item, profile, synthetic)
                    completed_specs += 1
                    await stage('generating_specs', completed_specs, len(unique))
                    return result

            specs = await asyncio.gather(*(prepare(item) for item in unique.values()))
            await stage('validating', completed_specs, len(unique))
            by_key = {row['exercise_key']: row for row in specs}
            for day in plan['days']:
                for item in day['items']:
                    row = by_key[item['exercise_key']]
                    item['camera_coaching_mode'] = (
                        'ai_generated' if row['status'] == 'valid' else 'manual_only'
                    )
                    item['camera_coaching_status'] = (
                        'experimental' if row['status'] == 'valid' else 'manual_only'
                    )
                    item['exercise_source'] = 'synthetic' if synthetic else 'ai_generated'
            base = await controllers.profiles.get_profile(current_user)
            today = datetime.datetime.now(zoneinfo.ZoneInfo(base['timezone'])).date()
            metadata = {
                **plan,
                'status': 'synthetic' if synthetic else 'completed',
                'model': 'synthetic-demo-v1'
                if synthetic
                else config.get_settings().OPENAI_MODEL,
                'prompt_version': 'workout-plan-v1',
                'provenance': {
                    'execution_mode': 'fixture' if synthetic else 'live',
                    'model_used': 'synthetic-demo-v1'
                    if synthetic
                    else config.get_settings().OPENAI_MODEL,
                    'prompt_version': 'workout-plan-v1',
                    'generated_at': datetime.datetime.now(datetime.UTC).isoformat(),
                    'input_revision': saved_profile.get('input_revision', 'legacy'),
                    'cached': False,
                },
                'ai_profile': profile,
            }
            run = {
                'model': metadata['model'],
                'profile_snapshot': profile,
                'retrieved_chunk_ids': saved_profile.get('retrieval', {}).get('chunk_ids', []),
                'output': metadata,
                'status': 'completed',
            }
            items = [
                {
                    'exercise_key': item['exercise_key'],
                    'day_index': day['day_index'],
                    'position': position,
                    'sets': item['sets'],
                    'target_reps': item['target_reps'],
                    'rest_seconds': item['rest_seconds'],
                    'tempo_hint': item['tempo_hint'],
                    'scheduled_at': None,
                }
                for day in plan['days']
                for position, item in enumerate(day['items'])
            ]
            await stage('preparing_audio', completed_specs, len(unique))
            prefs = await controllers.speech.get_preferences(current_user)
            if prefs['audio_enabled'] and prefs['voice_id'] and specs:
                first = specs[0]
                audio_result = await controllers.speech.prewarm(
                    current_user,
                    schemas.speech.PrewarmCreate(
                        cue_ids=['calibration', 'ready', 'tracking_recovery'],
                        exercise_key=first['exercise_key'],
                        spec_revision=first['spec_revision'],
                    ),
                )
                metadata['audio_preparation'] = audio_result
                run['output'] = metadata
            return await models.ai_coach.plan_persist(
                current_user.id,
                {
                    'source': 'ai_assisted',
                    'starts_on': (
                        today - datetime.timedelta(days=today.weekday())
                    ).isoformat(),
                    'rationale': plan['summary'][:500],
                    'generator_version': 'ai-plan-v1',
                    'ai_metadata': metadata,
                },
                items,
                run,
                saved_profile['id'],
                job_guard=job_guard,
            )
    except (openai.AIProviderUnavailable, ValueError, TimeoutError, models.AIContextChanged):
        return await fallback_plan(current_user, job_guard=job_guard)


async def get_spec(current_user: schemas.UserCurrent, exercise_key: str) -> dict:
    try:
        return await models.ai_coach.spec_get(current_user.id, exercise_key)
    except models.AISourceNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Exercise не найден') from exc


async def regenerate_spec(current_user: schemas.UserCurrent, exercise_key: str) -> dict:
    existing = await get_spec(current_user, exercise_key)
    profile = (await current_profile(current_user))['profile']
    exercise = {
        'exercise_key': exercise_key,
        'display_name': existing['display_name'],
        'description': existing['description'],
        'difficulty': existing['difficulty'],
        'equipment_codes': existing['equipment_codes'],
        'impact_level': 'low',
        'contraindication_tags': [],
        'camera_angle': existing['camera_angle'],
        'camera_coaching_requested': True,
        'target_reps': 5,
    }
    return await persist_exercise(
        current_user,
        exercise,
        profile,
        config.get_settings().COACH_EXECUTION_MODE == 'fixture'
        and config.get_settings().ENABLE_FIXTURE_MODE,
    )
