from typing import Annotated

import fastapi

from ... import auth, controllers, permission, responses, schemas

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
            responses.APIResponseNotFound,
        ]
    ),
)
async def list_exercises(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> list[dict]:
    return await controllers.exercises.list_exercises(current_user)
