# Sprint 4A — инструкция агентам по VPS и CD

Целевое размещение Dungeon Master: собственный VPS, один домен, HTTPS,
Nginx для frontend и reverse proxy, FastAPI в Docker, PostgreSQL в постоянном
volume. Это руководство для будущей настройки. Оно само не подключает CD и не
означает, что сервер уже настроен. Sprint 4B не входит в эту работу.

## 1. Прочитать и проверить до изменений

Прочитать [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md),
[архитектуру](ARCHITECTURE.md), [vision pipeline](VISION_PIPELINE.md),
[frontend README](../frontend/README.md) и ближайшие инструкции изменяемых папок.
Затем изучить существующие:

- [CI](../.github/workflows/ci.yml) и [корневой Makefile](../Makefile);
- [backend Dockerfile](../backend/Dockerfile),
  [development Compose](../backend/docker-compose.yml),
  [изолированный CI Compose](../backend/docker-compose.ci.yml);
- [backend env example](../backend/.env.example),
  [frontend env example](../frontend/.env.example),
  [настройки backend](../backend/src/core/config.py);
- [проверку frontend assets](../scripts/check_frontend_build.py) и
  [Docker smoke test](../scripts/check-docker.sh).

Снять `git status`, текущую ветку и SHA. Сохранить чужие изменения. Для этой
работы текущая разрешённая ветка — `sprint/ai-personalized-coach`; другую ветку
для публикации определяет владелец. Не переключать CD на `main` автоматически.

Перед работой на сервере выяснить домен, IP, ОС, SSH-пользователя/порт, текущие
сервисы на 80/443, каталог приложения, registry и выбранную ветку/SHA релиза.
Проверить наличие данных PostgreSQL и способ backup. Не угадывать эти значения.
Доступ и публикация должны соответствовать запросу владельца; уже выданное
разрешение не запрашивать повторно. Вводные получать без вывода секретов в чат.

## 2. Схема размещения и ограничения

| Внешний адрес | Обработчик |
|---|---|
| `https://DOMAIN/`, `/context`, `/plan`, `/progress` | Nginx → frontend `index.html` |
| `https://DOMAIN/api/v1/...` | Nginx → `127.0.0.1:8000` → FastAPI |
| `/assets/`, `/design/`, `/models/`, `/mediapipe/wasm/` | Настоящие файлы frontend |
| PostgreSQL | Внутренняя Docker-сеть, без публичного порта |

Frontend размещать **в корне домена**. Для него `BASE_URL=/`,
`VITE_API_BASE_URL=/api/v1`. Внешний адрес API не должен содержать `localhost`:
иначе браузер посетителя обращается к его собственному компьютеру.
Ключ OpenAI хранится только в backend environment. Камера, MediaPipe и подсчёт
повторений работают в браузере; видео не проксировать и не отправлять на сервер.
Сохранить прототипные ограничения, synthetic personas и deterministic fallback.

На сервере не запускать Vite dev/preview как публичный веб-сервер, не публиковать
PostgreSQL/8000 в интернет и не копировать весь checkout в Nginx document root.
Для камеры нужен HTTPS: обычный HTTP по адресу VPS не заменяет localhost.
См. [требования getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## 3. Подготовить VPS

Ubuntu 24.04 LTS соответствует ОС текущего CI; для другой ОС адаптировать пути
и менеджер пакетов. Установить Nginx, Docker Engine с Compose plugin и Certbot.
Docker устанавливать по [официальной инструкции](https://docs.docker.com/engine/install/ubuntu/).
Не менять одновременно Docker-версию и major-версию PostgreSQL при обычном релизе.

Использовать отдельного deploy-пользователя с SSH-ключом. Зафиксировать проверенный
SSH host key; не обходить проверку через `StrictHostKeyChecking=no`. Доступ к
Docker даёт широкие права на хосте — учитывать это при выдаче доступа агенту/CD.
Оставить доступным фактический SSH-порт при настройке firewall; открыть 80/443.
Проверить, что DNS A/AAAA указывают на этот VPS; неверный AAAA исправить до TLS.

Предлагаемая структура, создаваемая агентом при настройке:

```text
/srv/dungeon-master/
  frontend/releases/<SHA>/    # содержимое dist, включая models/WASM/design
  frontend/current           # symlink на выбранный frontend release
  backend/compose.yml        # отдельная VPS-конфигурация
  backups/                   # вне document root, ограниченный доступ
/etc/dungeon-master/runtime.env
/var/lib/letsencrypt/         # webroot для ACME challenge
```

Каталоги frontend должны читаться Nginx; environment и backups — только
уполномоченными пользователями. Секреты не хранить в репозитории или build artifacts.

## 4. Backend и PostgreSQL

Создать отдельный `deploy/docker-compose.vps.yml` и скопировать его в серверный
`backend/compose.yml`. Эти файлы пока **не существуют**. Не использовать текущий
development Compose без адаптации: в нём опубликован порт БД, включён DEBUG и
заданы development-пароли. Не предполагать, что обычный Compose override удалит
унаследованные `ports`: проверить итоговую конфигурацию.
Правила объединения: [Compose merge](https://docs.docker.com/reference/compose-file/merge/).

Требования к VPS Compose:

- стабильный project name `dungeon-master`, независимо от каталога release;
- PostgreSQL 17, постоянный volume с фиксированным именем;
- PostgreSQL без `ports`; backend: только `127.0.0.1:8000:8000`;
- backend image из registry с тегом SHA и записанным digest;
- backend использует существующий Dockerfile и его non-root user;
- `restart: unless-stopped`, healthcheck PostgreSQL и backend;
- `depends_on: condition: service_healthy` для БД;
- backend env_file — `/etc/dungeon-master/runtime.env`;
- credentials БД согласованы с `DATABASE_URL` и существующим volume.

В uvicorn настроить proxy headers и доверие только фактическому адресу Nginx,
видимому из контейнера. При host Nginx это может быть Docker bridge gateway,
а не `127.0.0.1`. Не считать `X-Forwarded-Proto` доверенным автоматически и не
включать `forwarded-allow-ips=*` для доступного посторонним backend.
См. [Uvicorn HTTP settings](https://www.uvicorn.org/settings/#http).

Compose ждёт healthcheck при `service_healthy`; это не заменяет проверки схемы
БД. См. [startup order](https://docs.docker.com/compose/how-tos/startup-order/).
Пароль в environment не меняет автоматически пароль уже созданной PostgreSQL БД.

Основные значения runtime environment (заменить placeholders до запуска):

```dotenv
APP_ENV=production
DEBUG=false
API_V1_PREFIX=/api/v1
SECRET_KEY=REPLACE_WITH_GENERATED_STABLE_SECRET
DATABASE_URL=postgresql+asyncpg://dungeon_master:URL_ENCODED_PASSWORD@postgres:5432/dungeon_master
CORS_ORIGINS=https://DOMAIN
LOG_LEVEL=INFO
ACCESS_TOKEN_EXPIRE_MINUTES=60
AI_FEATURE_ENABLED=false
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_EMBEDDING_MODEL=
OPENAI_TIMEOUT_SECONDS=30
OPENAI_MAX_RETRIES=1
ENABLE_DEMO_PERSONAS=true
RAG_TOP_K=5
RAG_CHUNK_SIZE=1600
RAG_CHUNK_OVERLAP=200
MAX_DOCUMENTS_PER_USER=5
MAX_DOCUMENT_SIZE_MB=5
MAX_EXTRACTED_CHARS=50000
```

Добавить необходимые Compose-переменные для БД/registry, не придумывая новые
настройки FastAPI. `SECRET_KEY` сохранять между релизами. Demo-флаг включён для
публичной synthetic jury-демонстрации; при другой цели размещения выбрать его
явно. Для live AI отдельно задать key/models и включить feature; без них сохранить
fallback. Не задавать production database как `TEST_DATABASE_URL` и не запускать
pytest на серверной БД.

Из серверного каталога `backend/` с подготовленным Compose:

```bash
docker compose --project-name dungeon-master --file compose.yml up -d --wait postgres
docker compose --project-name dungeon-master --file compose.yml pull backend
docker compose --project-name dungeon-master --file compose.yml run --rm --no-deps backend python -m alembic upgrade head
docker compose --project-name dungeon-master --file compose.yml run --rm --no-deps backend python -m alembic check
docker compose --project-name dungeon-master --file compose.yml up -d --wait backend
curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/ready
```

Если Compose интерполирует image/password из environment, к **каждому** вызову
добавить `--env-file /etc/dungeon-master/runtime.env` перед командой Compose.
Миграции запускать один раз отдельной командой до публикации backend, а не в каждом
uvicorn worker. В Docker нет `.venv/bin/alembic` и backend Makefile: использовать
`python -m alembic`. До миграции существующей БД сделать backup; при ошибке не
продолжать release. Для несовместимой миграции заранее предусмотреть короткое
окно обслуживания, чтобы старый backend не работал с неподходящей схемой.

## 5. Frontend: отдельный artifact для VPS

Собирать в CI из того же SHA, что backend. Node 24 — версия текущего CI.

```bash
npm --prefix frontend ci
VITE_API_BASE_URL=/api/v1 npm --prefix frontend run build -- --base=/
python3 scripts/check_frontend_build.py --base=/
```

`VITE_API_BASE_URL` подставляется **при сборке**. Environment Nginx не изменит уже
собранный JavaScript. Существующий `make ci-frontend` последним создаёт сборку
`--base=/dungeon-master/`; после него выполнить VPS build выше, а затем упаковать
artifact. Не публиковать последний `dist` из CI без проверки base/API URL.

В artifact включить весь `frontend/dist`, в том числе модели `.task`, WASM,
локальные шрифты и SVG. `prebuild` готовит официальные модели с checksum; git их
не хранит. Не заменять их плавающими CDN-ссылками. Записать SHA в `release.txt`
artifact и manifest с digest backend image. Устанавливать artifact в новый
`frontend/releases/<SHA>`, не выполнять `rsync --delete` по текущему live-каталогу.

## 6. Nginx: HTTPS, API и SPA fallback

Сначала поднять HTTP webroot для `/.well-known/acme-challenge/`, выпустить
сертификат Certbot и лишь затем включать конфигурацию с путями сертификата.
Не запускать `nginx -t` с ещё не существующим сертификатом. Использовать процедуру
установки/renewal для фактической ОС: [Certbot](https://certbot.eff.org/instructions).
Для webroot использовать [certonly/webroot](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot)
с `/var/lib/letsencrypt`; renewal deploy hook должен перезагрузить Nginx.

Шаблон для корня домена после выпуска сертификата. `DOMAIN` заменить реальным
именем; системный Nginx должен подключать `mime.types` внутри `http`.

```nginx
server {
    listen 80;
    server_name DOMAIN;

    location ^~ /.well-known/acme-challenge/ {
        root /var/lib/letsencrypt;
        try_files $uri =404;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name DOMAIN;
    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;

    root /srv/dungeon-master/frontend/current;
    index index.html;
    client_max_body_size 6m;

    location = /api {
        return 308 /api/;
    }
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
    }
    location ^~ /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location ^~ /models/ {
        try_files $uri =404;
        add_header Cache-Control "no-cache";
    }
    location ^~ /mediapipe/wasm/ {
        types { application/wasm wasm; application/javascript js; }
        try_files $uri =404;
        add_header Cache-Control "no-cache";
    }
    location ^~ /design/ {
        try_files $uri =404;
        add_header Cache-Control "no-cache";
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`proxy_pass` здесь **без завершающего `/`**: FastAPI должен получить
`/api/v1/...` целиком. API и assets не отправлять в SPA fallback. Потерянный
WASM/model обязан вернуть 404, а не HTML с кодом 200. `6m` допускает multipart
обёртку файла до 5 MB; ограничение документа проверяет backend. Таймаут proxy
учитывает Sprint 4A AI generation, у которой общий backend timeout до 90 секунд.
Семантика: [Nginx try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files),
[Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

После изменения проверить `sudo nginx -t`, затем reload и `certbot renew --dry-run`.
Настроить автоматическое обновление сертификата с reload Nginx после renewal.
Не включать запрет камеры в Permissions-Policy или непроверенную CSP, блокирующую
WASM/MediaPipe. Документация FastAPI `/docs` не проксируется этим шаблоном;
если нужна снаружи, добавить осознанно отдельный location.

## 7. CD через GitHub Actions

Существующий CI только проверяет код; он не публикует приложение. Создать отдельный
`.github/workflows/cd.yml` и серверный deploy script при задаче настройки CD.
Начать с `workflow_dispatch`; автоматический trigger включать для выбранной
владельцем ветки. Не считать push текущего Sprint автоматическим разрешением
публикации на произвольный сервер.

Требования к реализации CD:

1. Принимать конкретный trusted SHA и проверять успешные backend/frontend/Docker
   CI jobs **этого SHA**. Не подменять его текущим HEAD ветки после тестов.
2. Создавать backend image и VPS frontend artifact из одного SHA. Image фиксировать
   digest, Actions — полным проверенным commit SHA, как в текущем CI.
3. Доступ SSH хранить в GitHub Environment secrets: `SSH_HOST`, `SSH_PORT`,
   `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`. Для private registry выдать
   серверу read-only pull credential; ключ OpenAI остаётся в серверном env.
4. Не передавать deploy secrets в PR jobs и не выполнять произвольный PR-код
   в привилегированном deploy job. Ограничить token permissions нужными
   `contents: read` / `packages: write` в соответствующих jobs.
5. Использовать отдельную concurrency group для VPS с `cancel-in-progress: false`
   и серверный `flock`, чтобы SSH/manual deploy не пересекались. Не обрывать
   выполняющуюся миграцию из-за нового push. Для очереди релизов фиксировать SHA;
   В default режиме новая pending job заменяет прежнюю; если нужны все релизы,
   выбрать `queue: max`. Порядок ожидания не равен порядку dispatch — см.
   [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
6. Проверить свободное место, получить artifact/image, записать предыдущие SHA и
   digest, сделать backup БД, выполнить миграцию и readiness нового backend.
7. Опубликовать frontend переключением `current` на подготовленный release
   атомарным rename symlink на той же файловой системе. Не удалять старые релизы.
   Сохранить доступ к прежним hashed assets для уже открытых вкладок.
8. Проверить HTTPS/API/routes/assets и выполнить browser smoke. Записать deployed
   SHA только после успеха; при ошибке завершать job как failed.

Backend redeploy одного контейнера может дать краткое окно недоступности.
Не обещать zero downtime. При rollback frontend/backend использовать предыдущие
release и image digest; возможность запуска старого backend после миграции
проверяется отдельно. См. [GitHub deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).

## 8. Backup, rollback и проверка релиза

Перед изменением существующей схемы получить `pg_dump -Fc` из текущего PostgreSQL
в файл вне webroot, с ограниченными правами и проверенным кодом выхода.
Проверить restore на отдельной disposable БД; не тестировать восстановление
поверх действующей. При потере VPS локальный backup тоже пропадёт: сохранять
доступную владельцу копию вне сервера. Временную БД удалять только по её точному
созданному имени. Для первого запуска документировать отсутствие старых данных.

Миграции этого репозитория forward-only; downgrade не считать обратной миграцией.
При несовместимой схеме остановить release и использовать подготовленный план
восстановления/forward fix. Не выполнять `docker compose down -v`, volume prune,
DROP действующей БД, hard reset или удаление чужих контейнеров ради «чистого» deploy.

Обязательная проверка после установки:

- `/api/v1/health` — 200; `/api/v1/ready` — 200 и `database: reachable`.
  Readiness проверяет соединение, не заменяет `alembic check`.
- `/api/v1/profile` без Bearer — 401 JSON, неизвестный `/api/v1/...` — 404 JSON;
  Nginx не возвращает туда `index.html`.
- `/`, `/context`, `/context/documents`, `/context/review`, `/plan`, `/progress`
  загружаются напрямую и после refresh; Back/Forward работают.
- `/workout` без выбранного упражнения ведёт к plan; `/results` после полного
  reload без текущего результата ведёт к progress. Это ожидаемые route guards.
- JS/CSS/SVG/font/model/WASM возвращают настоящие bytes и правильный Content-Type;
  WASM — `application/wasm`. Проверить checksum моделей по репозиторному checker.
  Несуществующий `/models/missing.task` — 404. HTML не кешируется как immutable.
- Chrome по HTTPS: явный запрос камеры, denied/retry, calibration/countdown,
  корректировка, results/progress; остановка tracks при выходе из coaching.
- Jury Maya/Arman/Dana доступны при включённом demo flag; AI-off fallback работает;
  microphone не запрашивается; DEV fake controls в production отсутствуют.
- Снаружи открыты нужные SSH/80/443, 8000/5432 недоступны; restart сервисов не
  теряет БД; TLS renewal и получение release SHA проверены.

Не запускать `make smoke-tests-docker` против live Compose: его сценарий проверяет
отказ БД остановкой PostgreSQL. CI использует собственный изолированный project.
Не выводить env, guest JWT, provider keys, документы или POST bodies в deploy logs.

## 9. Отчёт агента

Указать Sprint, разрешённую ветку и deployed SHA/digests, домен и схему размещения,
созданные конфиги/workflow/script, изменения firewall/TLS, backup и результат
миграции, проверки routes/API/assets/камеры, rollback target и ограничения.
Отдельно перечислить проверки, которые реально не выполнялись. Не заявлять
production readiness или medical accuracy. После задачи обновить development log.
