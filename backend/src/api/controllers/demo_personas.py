"""Sprint 4A synthetic jury fixtures, clearly distinct from live AI output."""

import copy
import uuid

from ...core import config
from .. import controllers
from .. import exceptions
from .. import models
from .. import schemas

PERSONAS = {
    'maya': {
        'name': 'Maya',
        'description': 'Возвращаюсь к регулярным тренировкам дома. 15 минут, два раза в неделю. Предпочитаю спокойный контролируемый темп и короткие подсказки. Избегаю прыжков.',
        'style': 'supportive',
        'language': 'ru',
        'level': 'beginner',
        'goal': 'general_fitness',
        'days': 2,
        'minutes': 15,
        'equipment': ['none'],
        'routines': ['morning_reset'],
        'document': 'Synthetic Maya context\n15 минут на тренировку\n2 training days\nNo equipment\nAvoid high impact\nPrefers controlled tempo and longer recovery',
    },
    'arman': {
        'name': 'Arman',
        'description': 'Тренируюсь на силу четыре раза в неделю, по 30 минут. Есть гантели. Нужен энергичный тренер и более насыщенная программа.',
        'style': 'energetic',
        'language': 'ru',
        'level': 'intermediate',
        'goal': 'strength_foundation',
        'days': 4,
        'minutes': 30,
        'equipment': ['dumbbells'],
        'routines': [],
        'document': 'Synthetic Arman context\nStrength goal\n4 training days\n30 минут на тренировку\nDumbbells available\nPrefers energetic coaching',
    },
    'dana': {
        'name': 'Dana',
        'description': 'Много работаю за компьютером. Нужны короткие перерывы 5–10 минут, упражнения стоя и простой поддерживающий тренер. Хочу desk reset и вечернюю routine.',
        'style': 'supportive',
        'language': 'kk',
        'level': 'beginner',
        'goal': 'mobility',
        'days': 3,
        'minutes': 10,
        'equipment': ['none'],
        'routines': ['desk_reset', 'pre_sleep'],
        'document': 'Synthetic Dana context\nStanding exercises\nShort 5–10 minute sessions\nAvoid overhead movements\nDesk reset and pre-sleep routines',
    },
}


def synthetic_profile(context: dict, profile: dict, facts: list[dict]) -> dict:
    key = context['additional_preferences'].get('persona_key')
    persona = PERSONAS.get(key)
    constraints = sorted(
        set(profile['confirmed_constraints'])
        | {fact['constraint_code'] for fact in facts if fact['constraint_code']}
    )
    sources = [
        {
            'label': f'{profile["session_minutes"]} минут на тренировку',
            'source_type': 'profile',
            'source_id': None,
        }
    ]
    sources += [
        {
            'label': fact['normalized_fact'],
            'source_type': 'document',
            'source_id': str(fact['document_id']),
        }
        for fact in facts[:6]
    ]
    return schemas.ai_coach.AIUserProfileV1.model_validate(
        {
            'summary': (
                f'{persona["name"]}: {context["self_description"]}'
                if persona
                else context['self_description']
                or 'Контролируемая тренировка по вашим настройкам'
            )[:500],
            'fitness_level': profile['experience_level'],
            'primary_goals': [profile['goal']],
            'secondary_goals': [],
            'preferences': [
                context['preferred_coach_style'],
                'standing movements' if key == 'dana' else 'controlled movements',
            ],
            'constraints': constraints,
            'equipment': profile['equipment'],
            'schedule': {
                'days_per_week': min(4, profile['days_per_week']),
                'minutes_per_session': profile['session_minutes'],
            },
            'coach_persona': {
                'tone': context['preferred_coach_style'],
                'verbosity': 'short',
                'language': context['preferred_language'],
                'motivation_style': 'positive',
            },
            'plan_strategy': {
                'intensity': 'moderate' if key == 'arman' else 'low',
                'complexity': 'structured' if key == 'arman' else 'simple',
                'preferred_tempo': 'controlled',
                'rest_style': 'short' if key == 'arman' else 'generous',
            },
            'personalization_highlights': [
                f'{profile["session_minutes"]} минут; {profile["days_per_week"]} дня в неделю',
                f'Стиль тренера: {context["preferred_coach_style"]}',
                'Соблюдены подтверждённые ограничения',
            ],
            'persona_key': key if persona else None,
            'source_highlights': sources,
            'routine_preferences': [
                value
                for value in context['additional_preferences'].get('routine_preferences', [])
                if value in {'morning_reset', 'desk_reset', 'pre_sleep'}
            ][:3],
        }
    ).model_dump(mode='json')


def messages(ru: str, kk: str, en: str) -> dict:
    return {'ru': ru, 'kk': kk, 'en': en}


def synthetic_spec(exercise: dict, user_profile: dict) -> dict:
    curl = 'curl' in exercise['exercise_key']
    squat = 'squat' in exercise['exercise_key']
    kind = 'curl' if curl else 'squat' if squat else 'calf'
    point = ['shoulder', 'elbow', 'wrist'] if curl else ['hip', 'knee', 'ankle']
    features = (
        [
            {
                'id': 'movement',
                'operation': 'angle',
                'points': point,
                'inputs': [],
                'normalize_by': None,
                'scope': 'frame',
            }
        ]
        if curl or squat
        else [
            {
                'id': 'height',
                'operation': 'relative_y',
                'points': ['foot_index', 'heel'],
                'inputs': [],
                'normalize_by': 'body_scale',
                'scope': 'frame',
            },
            {
                'id': 'movement',
                'operation': 'delta',
                'points': [],
                'inputs': ['height'],
                'normalize_by': None,
                'scope': 'frame',
            },
        ]
    )
    features += [
        {
            'id': 'range',
            'operation': 'minimum' if curl or squat else 'maximum',
            'points': [],
            'inputs': ['movement'],
            'normalize_by': None,
            'scope': 'rep',
        }
    ]
    thresholds = {
        'curl': (145, 110, 125, 155),
        'squat': (145, 125, 135, 160),
        'calf': (0.025, 0.045, 0.035, 0.01),
    }[kind]
    stages = ['standing', 'moving', 'turnaround', 'returning']
    operators = ['lt', 'lt', 'gt', 'gte'] if curl or squat else ['gt', 'gt', 'lt', 'lte']
    tone = user_profile['coach_persona']['tone']
    required = (
        ['shoulder', 'elbow', 'wrist', 'hip']
        if curl
        else ['shoulder', 'hip', 'knee', 'ankle', 'heel', 'foot_index']
    )
    return schemas.movement_spec.MovementSpecV1.model_validate(
        {
            'version': 1,
            'exercise_key': exercise['exercise_key'],
            'display_name': exercise['display_name'],
            'camera': {
                'preferred_angle': 'front' if curl else 'side',
                'body_scope': 'upper' if curl else 'full',
                'required_landmarks': required,
                'minimum_visibility': 0.65,
            },
            'calibration': {
                'stable_ms': 700,
                'baseline_features': ['movement'] if curl or squat else ['height'],
                'messages': messages(
                    'Встань лицом, руки должны быть видны' if curl else 'Встань боком',
                    'Қалыпқа тұр, буындарың көрінсін',
                    'Stand facing the camera'
                    if curl
                    else 'Stand side-on with your feet visible',
                ),
            },
            'features': features,
            'phases': [
                {'id': stage, 'messages': messages(label, kk, en)}
                for stage, label, kk, en in zip(
                    stages,
                    ['Исходное положение', 'Движение', 'Поворот', 'Возвращение'],
                    ['Бастапқы қалып', 'Қозғалыс', 'Бұрылу', 'Қайту'],
                    ['Starting position', 'Move with control', 'Turnaround', 'Return slowly'],
                    strict=True,
                )
            ],
            'transitions': [
                {
                    'from': stages[index],
                    'to': stages[(index + 1) % 4],
                    'condition': {
                        'feature': 'movement',
                        'operator': operators[index],
                        'value': value,
                        'upper': None,
                        'tolerance': 0.01,
                    },
                    'hold_ms': 100,
                }
                for index, value in enumerate(thresholds)
            ],
            'repetition': {
                'start_phase': 'standing',
                'complete_from': 'returning',
                'complete_to': 'standing',
                'minimum_duration_ms': 800 if tone == 'energetic' else 1200,
                'maximum_duration_ms': 12000,
            },
            'error_rules': [
                {
                    'code': 'range_too_small',
                    'evaluate_at': 'rep',
                    'condition': {
                        'feature': 'range',
                        'operator': 'gt' if curl or squat else 'lt',
                        'value': 90 if curl else 115 if squat else 0.05,
                        'upper': None,
                        'tolerance': 0.01,
                    },
                    'messages': messages(
                        'Чуть ниже' if squat else 'Пятки выше' if not curl else 'Согни локоть',
                        'Толық қозғалыс',
                        'Fuller range',
                    ),
                    'secondary': None,
                    'reject_rep': True,
                    'hold_ms': 300,
                },
            ],
            'coach_messages': {
                'ready': {
                    'messages': messages(
                        'Начинаем' if tone != 'energetic' else 'Готов? Вперёд!',
                        'Бастаймыз',
                        'Ready — begin',
                    ),
                    'secondary': None,
                },
                'good_rep': {
                    'messages': messages(
                        'Отлично! Ещё одно!' if tone == 'energetic' else 'Хорошее повторение',
                        'Тамаша қайталау',
                        'Great repetition',
                    ),
                    'secondary': None,
                },
                'tracking_recovery': {
                    'messages': messages(
                        'Вернись в кадр', 'Кадрға қайта орал', 'Return to the frame'
                    ),
                    'secondary': None,
                },
                'complete': {
                    'messages': messages(
                        'Подход завершён', 'Жиынтық аяқталды', 'Set completed'
                    ),
                    'secondary': None,
                },
            },
        }
    ).model_dump(mode='json', by_alias=True)


def synthetic_plan(profile: dict) -> dict:
    key = profile['persona_key'] or 'maya'
    constraints = set(profile['constraints'])
    exercises = {
        'maya': [('Standing Calf Raise', 'calf_raise'), ('Controlled Squat', 'squat')],
        'arman': [('Dumbbell Bicep Curl', 'bicep_curl'), ('Goblet Squat', 'goblet_squat')],
        'dana': [('Standing Calf Raise', 'desk_calf_raise')],
    }[key]
    sources = [
        {'type': s['source_type'], 'label': s['label'], 'source_id': s['source_id']}
        for s in profile['source_highlights'][:6]
    ]
    items = []
    for name, slug in exercises:
        if 'squat' in slug and 'avoid_deep_knee_flexion' in constraints:
            continue
        items.append(
            {
                'exercise_key': slug + '_' + uuid.uuid4().hex[:12],
                'display_name': name,
                'description': 'Synthetic exercise for the Sprint 4A jury demo',
                'instruction': 'Выполни контролируемое движение и вернись в исходное положение',
                'difficulty': profile['fitness_level'],
                'equipment_codes': ['dumbbells'] if key == 'arman' else ['none'],
                'impact_level': 'low',
                'contraindication_tags': ['avoid_deep_knee_flexion']
                if 'squat' in slug
                else [],
                'camera_angle': 'front' if 'curl' in slug else 'side',
                'sets': 3 if key == 'arman' else 1 if key == 'dana' else 2,
                'target_reps': 12 if key == 'arman' else 5 if key == 'dana' else 6,
                'rest_seconds': 45 if key == 'arman' else 90 if key == 'maya' else 60,
                'tempo_hint': '2 seconds up / 2 down'
                if key == 'arman'
                else '3 seconds up / 3 down',
                'camera_coaching_requested': True,
                'reason': 'Сила с доступными гантелями'
                if key == 'arman'
                else 'Короткий перерыв стоя'
                if key == 'dana'
                else 'Низкая ударная нагрузка и контролируемый темп',
                'source_references': sources,
                'camera_coaching_mode': 'ai_generated',
                'detail_available': True,
                'swap_available': False,
            }
        )
    routines = []
    for routine in profile['routine_preferences']:
        routines.append(
            {
                'routine_type': routine,
                'title': {
                    'morning_reset': 'Morning Reset',
                    'desk_reset': 'Desk Reset',
                    'pre_sleep': 'Pre-Sleep',
                }[routine],
                'estimated_minutes': 7 if routine == 'desk_reset' else 5,
                'items': [
                    {
                        'title': 'Standing reset',
                        'instruction': 'Встань, расслабь плечи и спокойно подыши',
                        'duration_seconds': 210 if routine == 'desk_reset' else 300,
                        'camera_coaching_available': False,
                    }
                ],
                'camera_coaching_available': False,
            }
        )
        if routine == 'desk_reset':
            routines[-1]['items'].append(
                {
                    'title': 'Standing mobility',
                    'instruction': 'Неспешно переноси вес с ноги на ногу, руки ниже плеч',
                    'duration_seconds': 210,
                    'camera_coaching_available': False,
                }
            )
    days = [0, 3] if key == 'maya' else [0, 1, 3, 5] if key == 'arman' else [0, 2, 4]
    return schemas.ai_coach.AIPlanV1.model_validate(
        {
            'title': {'maya': 'Low-Impact Return', 'arman': 'Strength', 'dana': 'Desk Reset'}[
                key
            ],
            'summary': profile['summary'],
            'why_this_plan': profile['personalization_highlights'],
            'excluded_exercises': ['Прыжковые упражнения исключены']
            if 'no_high_impact' in constraints
            else ['Движения над головой исключены']
            if 'avoid_overhead' in constraints
            else [],
            'coach_persona': profile['coach_persona'],
            'days': [
                {
                    'day_index': day,
                    'title': 'Strength practice' if key == 'arman' else 'Controlled movement',
                    'estimated_minutes': profile['schedule']['minutes_per_session'],
                    'items': copy.deepcopy(items),
                }
                for day in days[: profile['schedule']['days_per_week']]
            ],
            'routine_blocks': routines,
        }
    ).model_dump(mode='json')


async def load(current_user: schemas.UserCurrent, persona_key: str) -> dict:
    settings = config.get_settings()
    if settings.APP_ENV != 'development' and not settings.ENABLE_DEMO_PERSONAS:
        raise exceptions.HTTPForbiddenException(detail='Jury demo недоступен')
    persona = PERSONAS.get(persona_key)
    if persona is None:
        raise exceptions.HTTPNotFoundException(detail='Persona не найдена')
    # Sprint 4A switcher starts a clean synthetic context; source decisions are never auto-confirmed.
    for document in await models.ai_coach.documents_list(current_user.id):
        if document['filename'] in {key + '-synthetic.txt' for key in PERSONAS}:
            await models.ai_coach.document_delete(current_user.id, document['id'])
    await controllers.profiles.replace_profile(
        current_user,
        schemas.profiles.ProfileUpdate.model_validate(
            {
                'goal': persona['goal'],
                'experience_level': persona['level'],
                'days_per_week': persona['days'],
                'session_minutes': persona['minutes'],
                'equipment': persona['equipment'],
                'locale': persona['language'],
                'timezone': 'Asia/Almaty',
                'confirmed_constraints': [],
            }
        ),
    )
    context = await models.ai_coach.context_replace(
        current_user.id,
        {
            'self_description': persona['description'],
            'preferred_coach_style': persona['style'],
            'preferred_language': persona['language'],
            'additional_preferences': {
                'persona_key': persona_key,
                'routine_preferences': persona['routines'],
                'synthetic': True,
            },
        },
    )
    text = persona['document']
    document = await models.ai_coach.document_create(
        current_user.id,
        {
            'filename': persona_key + '-synthetic.txt',
            'media_type': 'text/plain',
            'size_bytes': len(text.encode()),
            'extracted_text': text,
            'status': 'processed',
            'message': None,
        },
        controllers.documents.chunk_text(text),
        controllers.documents.extract_facts(text),
        5,
    )
    return {
        'persona_key': persona_key,
        'context': context,
        'documents': [document],
        'message': 'Synthetic context загружен. Подтвердите нужные факты',
    }
