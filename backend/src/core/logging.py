import json
import logging
import logging.config
import typing
import urllib.parse

from . import config


class JSONFormatter(logging.Formatter):
    """Emits one JSON object per log record."""

    _SAFE_KEYS = frozenset(
        {
            'password',
            'token',
            'authorization',
            'secret',
            'api_key',
            'access_token',
            'refresh_token',
        },
    )

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, typing.Any] = {
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        if record.exc_info:
            payload['exc_info'] = self.formatException(record.exc_info)
        extra = {
            k: v
            for k, v in record.__dict__.items()
            if k not in logging.LogRecord.__dict__
            and k not in ('message', 'asctime', 'args', 'exc_info', 'exc_text', 'stack_info')
            and not k.startswith('_')
            and k.lower() not in self._SAFE_KEYS
        }
        if extra:
            payload.update(extra)
        return json.dumps(payload, default=str)


class HumanFormatter(logging.Formatter):
    FMT = '%(asctime)s %(levelname)-8s %(name)s  %(message)s'

    def __init__(self) -> None:
        super().__init__(fmt=self.FMT, datefmt='%H:%M:%S')


class PrivateRequestFilter(logging.Filter):
    """OAuth callback code/state must never enter the server access log."""

    def filter(self, record: logging.LogRecord) -> bool:
        if (
            record.name == 'uvicorn.access'
            and isinstance(record.args, tuple)
            and len(record.args) == 5
        ):
            arguments = list(record.args)
            arguments[2] = urllib.parse.urlsplit(str(arguments[2])).path
            record.args = tuple(arguments)
        return True


def configure_logging() -> None:
    settings = config.get_settings()
    level = settings.LOG_LEVEL.upper()
    use_json = settings.is_production

    formatter: logging.Formatter = JSONFormatter() if use_json else HumanFormatter()

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(PrivateRequestFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Quiet noisy third-party loggers
    for name in ('uvicorn.error', 'uvicorn.access', 'sqlalchemy.engine'):
        logging.getLogger(name).propagate = False
        logging.getLogger(name).handlers = [handler]

    # SQL parameter dumps may contain private source excerpts and provider credentials.
    # Application DEBUG does not authorize printing durable user data.
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
