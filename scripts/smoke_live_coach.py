#!/usr/bin/env python3
"""Opt-in local application acceptance, bounded calls and a sanitized JSON report."""

import argparse
import asyncio
import hashlib
import json
import time
import urllib.parse
import uuid

import httpx
from provider_doctor import load_settings, report


class SmokeBlocked(Exception):
    pass


async def run(base, live, max_requests):
    settings = load_settings()
    if not live:
        report("application", "gpt-5.4", "BLOCKED", reason="explicit_live_required")
        return 0
    if not settings.ai_available or not settings.elevenlabs_available:
        report("application", "gpt-5.4", "BLOCKED", reason="missing_configuration")
        return 2
    parsed = urllib.parse.urlsplit(base)
    if parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.scheme != "http":
        report(
            "application", None, "BLOCKED", reason="disposable_local_backend_required"
        )
        return 2
    started = time.monotonic()
    calls = 0
    async with httpx.AsyncClient(
        base_url=base.rstrip("/") + "/api/v1/", timeout=200
    ) as client:

        async def request(method, path, **kwargs):
            nonlocal calls
            calls += 1
            if calls > max_requests:
                raise SmokeBlocked("request_limit")
            response = await client.request(method, path, **kwargs)
            if response.status_code >= 400:
                raise SmokeBlocked("http_" + str(response.status_code))
            return response

        def fingerprint(plan):
            items = [
                (
                    row["day_index"],
                    row["sets"],
                    row["target_reps"],
                    row["exercise"]["name"],
                )
                for row in plan["items"]
            ]
            return hashlib.sha256(
                json.dumps(items, ensure_ascii=False).encode()
            ).hexdigest()

        async def generate():
            # Synchronous compatibility path keeps the smoke bounded; UI uses durable jobs.
            profile = (await request("POST", "ai-profile/generate")).json()
            if profile.get("provenance", {}).get("execution_mode") != "live":
                raise SmokeBlocked("profile_not_live")
            plan = (
                await request(
                    "POST", "training-plans/generate", json={"mode": "ai_assisted"}
                )
            ).json()
            if plan.get("ai_metadata", {}).get("execution_mode") != "live":
                raise SmokeBlocked("plan_not_live")
            return plan

        try:
            guest = (await request("POST", "auth/guest")).json()
            client.headers["Authorization"] = "Bearer " + guest["access_token"]
            await request("POST", "demo-personas/maya/load")
            first = await generate()
            context = (await request("GET", "ai-context")).json()
            context_body = {
                key: context[key]
                for key in (
                    "self_description",
                    "preferred_coach_style",
                    "preferred_language",
                    "additional_preferences",
                )
            }
            context_body["self_description"] = (
                "I now have 15 minutes and want gentle mobility only, with no equipment."
            )
            await request("PUT", "ai-context", json=context_body)
            profile = (await request("GET", "profile")).json()
            profile.pop("created_at", None)
            profile.pop("updated_at", None)
            profile["days_per_week"] = 2 if profile["days_per_week"] != 2 else 4
            await request("PUT", "profile", json=profile)
            second = await generate()
            if fingerprint(first) == fingerprint(second):
                raise SmokeBlocked("plan_change_not_observed")
            spec_found = False
            for item in second["items"][:3]:
                spec = (
                    await request("GET", "exercise-specs/" + item["exercise"]["key"])
                ).json()
                if spec["model"] == "gpt-5.4" and spec.get("movement_spec"):
                    spec_found = True
                    break
            if not spec_found:
                raise SmokeBlocked("live_spec_not_observed")
            voices = (await request("GET", "voices?language=ru&page_size=6")).json()[
                "voices"
            ]
            if not voices:
                raise SmokeBlocked("voice_unavailable")
            voice = voices[0]["voice_id"]
            await request(
                "PUT",
                "coach/preferences",
                json={
                    "voice_id": voice,
                    "language": "ru",
                    "style": "calm",
                    "audio_enabled": True,
                },
            )
            preview = await request(
                "POST",
                "voices/" + voice + "/preview",
                json={"language": "ru", "style": "calm"},
            )
            if not preview.content or not preview.headers.get(
                "content-type", ""
            ).startswith("audio/"):
                raise SmokeBlocked("preview_not_audio")
            prefs = (await request("GET", "schedule/preferences")).json()
            await request(
                "PUT",
                "schedule/preferences",
                json={
                    "expected_revision": prefs["revision"],
                    "timezone": "UTC",
                    "duration_minutes": 20,
                    "availability": [
                        {"weekday": day, "start_minute": 540, "end_minute": 1200}
                        for day in range(7)
                    ],
                },
            )
            turn = (
                await request(
                    "POST",
                    "coach/turns",
                    json={
                        "operation_id": str(uuid.uuid4()),
                        "conversation_id": None,
                        "screen": "schedule",
                        "exercise_key": second["items"][0]["exercise"]["key"],
                        "text": "Explain my first exercise and propose one available workout slot using schedule tools.",
                    },
                )
            ).json()
            if turn["provenance"]["execution_mode"] != "live":
                raise SmokeBlocked("coach_not_live")
            proposal = next(
                (row for row in turn["proposals"] if row["kind"] == "schedule"), None
            )
            if proposal is None:
                raise SmokeBlocked("schedule_tool_proposal_not_observed")
            result = (
                await request(
                    "POST",
                    "coach/proposals/" + proposal["id"] + "/confirm",
                    json={"operation_id": str(uuid.uuid4())},
                )
            ).json()
            if result["status"] != "confirmed" or not result["result"].get("saved"):
                raise SmokeBlocked("appointment_not_saved")
            schedule = (await request("GET", "schedule")).json()
            if not any(
                row["id"] == result["result"]["appointment_id"]
                for row in schedule["appointments"]
            ):
                raise SmokeBlocked("appointment_not_readable")
            audio = await request(
                "POST",
                "speech",
                json={
                    "message_id": turn["message_id"],
                    "cue_id": None,
                    "exercise_key": None,
                    "spec_revision": None,
                },
            )
            if not audio.content or not audio.headers.get(
                "content-type", ""
            ).startswith("audio/"):
                raise SmokeBlocked("message_not_audio")
            report(
                "application",
                "gpt-5.4",
                "VERIFIED",
                started,
                requests=calls,
                audio_bytes=len(audio.content),
                google="NOT_TOUCHED",
                runtime="browser_manual_check_required",
            )
            return 0
        except (SmokeBlocked, httpx.HTTPError, KeyError, ValueError) as exc:
            reason = str(exc) if isinstance(exc, SmokeBlocked) else "network_or_schema"
            report(
                "application",
                "gpt-5.4",
                "BLOCKED",
                started,
                requests=calls,
                reason=reason,
            )
            return 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    parser.add_argument("--max-requests", type=int, choices=range(24, 41), default=30)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args.base_url, args.live, args.max_requests)))
