"""Sprint 4A narrow official SDK adapter with bounded structured outputs."""

import asyncio
import json
import math
import pathlib

import openai as sdk
import pydantic

from ..api import schemas
from ..core import config


class AIProviderUnavailable(Exception):
    """Sprint 4A sanitized provider failure; never exposes provider internals."""


PROMPTS = pathlib.Path(__file__).parent / 'prompts'


async def structured(
    name: str, context: dict, schema: type[pydantic.BaseModel], *, validate: bool = True
) -> dict:
    settings = config.get_settings()
    if not settings.ai_available:
        raise AIProviderUnavailable
    try:
        async with asyncio.timeout(
            settings.OPENAI_TIMEOUT_SECONDS * (settings.OPENAI_MAX_RETRIES + 1) + 2
        ):
            async with sdk.AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY.get_secret_value(),
                timeout=settings.OPENAI_TIMEOUT_SECONDS,
                max_retries=settings.OPENAI_MAX_RETRIES,
            ) as client:
                arguments = dict(
                    model=settings.OPENAI_MODEL,
                    instructions=PROMPTS.joinpath(name + '_v1.md').read_text(),
                    input=json.dumps(context, ensure_ascii=False, default=str),
                    store=False,
                )
                if not validate:
                    response = await client.responses.create(
                        **arguments,
                        text={
                            'format': {
                                'type': 'json_schema',
                                'name': schema.__name__,
                                'strict': True,
                                'schema': sdk.pydantic_function_tool(schema)['function'][
                                    'parameters'
                                ],
                            }
                        },
                    )
                    return json.loads(response.output_text)
                response = await client.responses.parse(**arguments, text_format=schema)
                if response.output_parsed is None:
                    raise AIProviderUnavailable
                return response.output_parsed.model_dump(mode='json', by_alias=True)
    except (sdk.OpenAIError, TimeoutError, pydantic.ValidationError, ValueError) as exc:
        raise AIProviderUnavailable from exc


async def create_embeddings(texts: list[str]) -> list[list[float]]:
    settings = config.get_settings()
    if not settings.ai_available or not settings.OPENAI_EMBEDDING_MODEL:
        raise AIProviderUnavailable
    try:
        async with asyncio.timeout(
            settings.OPENAI_TIMEOUT_SECONDS * (settings.OPENAI_MAX_RETRIES + 1) + 2
        ):
            async with sdk.AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY.get_secret_value(),
                timeout=settings.OPENAI_TIMEOUT_SECONDS,
                max_retries=settings.OPENAI_MAX_RETRIES,
            ) as client:
                response = await client.embeddings.create(
                    model=settings.OPENAI_EMBEDDING_MODEL, input=texts
                )
        rows = sorted(response.data, key=lambda row: row.index)
        vectors = [row.embedding for row in rows]
        if (
            len(vectors) != len(texts)
            or not vectors
            or any(
                not vector or len(vector) > 8192 or not all(math.isfinite(v) for v in vector)
                for vector in vectors
            )
        ):
            raise AIProviderUnavailable
        return vectors
    except (sdk.OpenAIError, TimeoutError, ValueError) as exc:
        raise AIProviderUnavailable from exc


async def synthesize_user_profile(context: dict) -> dict:
    return await structured('user_profile', context, schemas.ai_coach.AIUserProfileV1)


async def generate_personalized_plan(context: dict) -> dict:
    return await structured('workout_plan', context, schemas.ai_coach.AIPlanV1)


async def generate_movement_spec(exercise: dict, user_profile: dict) -> dict:
    return await structured(
        'movement_spec',
        {'exercise': exercise, 'user_profile': user_profile},
        schemas.movement_spec.MovementSpecV1,
        validate=False,
    )


async def repair_movement_spec(spec: dict, validation_errors: list[str]) -> dict:
    return await structured(
        'movement_spec_repair',
        {'spec': spec, 'validation_errors': validation_errors},
        schemas.movement_spec.MovementSpecV1,
        validate=False,
    )
