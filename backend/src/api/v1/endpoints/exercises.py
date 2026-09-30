from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter(prefix='/exercises')


@router.get(
    '',
    summary='List eligible supported exercises',
    dependencies=[permission.PermsRequired([permission.Perm.EXERCISE_READ])],
    response_model=list[schemas.exercises.ExerciseGet],
    response_description='Eligible active allowlisted catalog',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            controllers.profiles.ProfileRequiredResponse,
        ],
    ),
)
async def list_exercises(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> list[dict]:
    """List eligible catalog entries; a missing profile returns 404 profile_required."""
    return await controllers.exercises.list_exercises(current_user)
