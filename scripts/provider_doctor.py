#!/usr/bin/env python3
"""Explicit, bounded provider check. Default never connects or reads an env file."""

import argparse
import asyncio
import json
import pathlib
import sys
import time

import openai as sdk
import pydantic

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from src.ai import (
    elevenlabs,
    openai,
)
from src.api.controllers import speech
from src.core import (
    config,
    http_client,
)


class Probe(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra="forbid")
    ready: bool


def load_settings():
    # Environment variables only; never inspect/copy a project's real .env.
    settings = config.Settings(
        _env_file=None,
        SECRET_KEY="provider-doctor-local-no-auth",
        DATABASE_URL="postgresql+asyncpg://unused/unused",
    )
    config.get_settings = lambda: settings
    return settings


def report(provider, model, status, started=None, **data):
    row = {"provider": provider, "model": model, "status": status, **data}
    if started is not None:
        row["latency_ms"] = round((time.monotonic() - started) * 1000)
    print(json.dumps(row, ensure_ascii=False))


async def run(live=False, language="ru"):
    settings = load_settings()
    if not live:
        for provider, available, model in (
            ("openai", settings.ai_available, settings.OPENAI_MODEL),
            (
                "elevenlabs",
                settings.elevenlabs_available,
                elevenlabs.model_for(language),
            ),
            ("google", settings.google_available, None),
        ):
            report(
                provider,
                model,
                "CONFIGURED_UNVERIFIED" if available else "BLOCKED",
                reason="explicit_live_required"
                if available
                else "missing_configuration",
            )
        return 0
    ok = True
    await http_client.on_startup()
    try:
        started = time.monotonic()
        try:
            if not settings.ai_available or settings.OPENAI_MODEL != "gpt-5.4":
                raise openai.AIProviderUnavailable("config")
            response = await openai.limited(
                openai.get_client().responses.parse,
                model="gpt-5.4",
                input="Return ready=true.",
                text_format=Probe,
                store=False,
                reasoning={"effort": "low"},
                max_output_tokens=256,
            )
            if response.output_parsed is None or not response.output_parsed.ready:
                raise openai.AIProviderUnavailable("schema")
            usage = response.usage
            report(
                "openai",
                "gpt-5.4",
                "VERIFIED",
                started,
                input_tokens=usage.input_tokens if usage else None,
                output_tokens=usage.output_tokens if usage else None,
            )
        except (
            openai.AIProviderUnavailable,
            sdk.OpenAIError,
            TimeoutError,
            ValueError,
        ) as exc:
            ok = False
            reason = (
                str(exc)
                if isinstance(exc, openai.AIProviderUnavailable)
                else openai.category(exc)
            )
            report("openai", settings.OPENAI_MODEL, "BLOCKED", started, reason=reason)
        started = time.monotonic()
        model = elevenlabs.model_for(language)
        try:
            if not settings.elevenlabs_available:
                raise elevenlabs.SpeechUnavailable("config")
            await elevenlabs.validate_model(language)
            page = await elevenlabs.voices(6)
            if not page["voices"]:
                raise elevenlabs.SpeechUnavailable("voice_unavailable")
            # One preview, for one account voice and one explicitly selected language.
            text = speech.PREVIEW[speech.LANG_INDEX[language]]
            audio = await elevenlabs.synthesize(
                page["voices"][0]["voice_id"], text, language, "calm"
            )
            report(
                "elevenlabs",
                model,
                "VERIFIED",
                started,
                char_count=len(text),
                audio_bytes=len(audio),
            )
        except elevenlabs.SpeechUnavailable as exc:
            ok = False
            report("elevenlabs", model, "BLOCKED", started, reason=str(exc))
        # Google is never connected or written by this utility.
        report(
            "google",
            None,
            "CONFIGURED_UNVERIFIED" if settings.google_available else "BLOCKED",
            reason="oauth_and_test_calendar_required",
        )
    finally:
        await openai.on_shutdown()
        await http_client.on_shutdown()
    return 0 if ok else 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live", action="store_true", help="Authorize the bounded paid probes"
    )
    parser.add_argument("--language", choices=("ru", "kk", "en"), default="ru")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args.live, args.language)))
