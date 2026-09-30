"""Run from backend: python -m src.cli.warm_voice_cache [--execute]."""

import argparse
import asyncio
import json

from ..ai import elevenlabs
from ..api.controllers import voice_cache
from ..core import http_client


def output(value: dict) -> None:
    print(json.dumps(value, ensure_ascii=False), flush=True)


async def run(args) -> int:
    await http_client.on_startup()
    try:
        prepared = await voice_cache.plan(args.languages, args.style, args.voice_id)
        output({key: value for key, value in prepared.items() if key != 'jobs'})
        if args.execute:
            output(await voice_cache.execute(prepared, args.max_characters, output))
        return 0
    except (elevenlabs.SpeechUnavailable, TimeoutError) as exc:
        output({'status': 'failed', 'category': str(exc)})
        return 2
    finally:
        await http_client.on_shutdown()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument(
        '--languages', nargs='+', choices=['ru', 'kk', 'en'], default=['ru', 'kk', 'en']
    )
    parser.add_argument(
        '--style', choices=['calm', 'supportive', 'energetic', 'strict'], default='supportive'
    )
    parser.add_argument('--voice-id')
    parser.add_argument('--max-characters', type=int, default=95000)
    return asyncio.run(run(parser.parse_args()))


if __name__ == '__main__':
    raise SystemExit(main())
