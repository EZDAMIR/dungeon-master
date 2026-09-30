"""Process lifecycle only. Postgres claim/lease makes each worker safe."""

import asyncio
import contextlib
import logging

from ...core import config
from .. import controllers

_tasks: list[asyncio.Task] = []


async def loop() -> None:
    while True:
        await asyncio.sleep(1)
        try:
            await controllers.generation_jobs.run_once()
        except Exception as exc:
            logging.getLogger(__name__).warning(
                'Job runner temporarily unavailable (%s)', type(exc).__name__
            )


async def on_startup() -> None:
    for _ in range(config.get_settings().GENERATION_JOB_CONCURRENCY):
        _tasks.append(asyncio.create_task(loop()))


async def on_shutdown() -> None:
    for task in _tasks:
        task.cancel()
    for task in _tasks:
        with contextlib.suppress(asyncio.CancelledError):
            await task
    _tasks.clear()
