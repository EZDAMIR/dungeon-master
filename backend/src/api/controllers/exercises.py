import pydantic

from .. import controllers
from .. import models
from .. import schemas


def eligible_exercises(exercises: list[dict], profile: dict) -> list[dict]:
    """Canonical catalog/plan allowlist and user-confirmed eligibility policy."""
    available = set(profile['equipment']) - {'none'}
    confirmed = set(profile['confirmed_constraints'])
    eligible = []
    for exercise in exercises:
        if not exercise['is_active'] or exercise['key'] != 'bodyweight_squat':
            continue
        try:
            schemas.exercises.AnalysisProfile.model_validate(exercise['analysis_profile'])
            equipment = exercise['equipment_codes']
            tags = exercise['contraindication_tags']
            if not isinstance(equipment, list) or not isinstance(tags, list):
                continue
            if not 1 <= len(equipment) <= 4 or len(tags) > 3:
                continue
            required = set(equipment) - {'none'}
            if not set(equipment) <= {v.value for v in schemas.profiles.EquipmentEnum}:
                continue
            if not set(tags) <= {v.value for v in schemas.profiles.ConstraintCodeEnum}:
                continue
        except (pydantic.ValidationError, TypeError):
            continue
        if required <= available and not set(tags) & confirmed:
            eligible.append(exercise)
    return eligible


async def list_exercises(current_user: schemas.UserCurrent) -> list[dict]:
    profile = await controllers.profiles.get_profile(current_user)
    return eligible_exercises(await models.exercises.exercise_list(), profile)
