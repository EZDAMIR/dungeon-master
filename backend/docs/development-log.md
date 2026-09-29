# Development Log

Track progress here. Update after each commit.

---

## Initial Infrastructure

**Implemented:**
- FastAPI application with lifecycle management
- Pydantic Settings configuration
- SQLAlchemy 2.0 Core + asyncpg database layer (`@postgres.session`)
- Alembic migration setup (empty chain, ready for domain tables)
- JWT authentication foundation (token decode → UserCurrent, no DB lookup)
- Permission dependency infrastructure (PermsRequired, SuperUserRequired, NoPermsRequired)
- Limit/offset pagination (Paginator dependency)
- Structured logging + request ID middleware
- httpx async HTTP client (for external API calls)
- File storage abstraction (LocalStorage + StorageBackend interface)
- AI adapter placeholder (`src/ai/`)
- `/health` + `/ready` endpoints
- Docker + docker-compose setup
- Test foundation with 90%+ coverage

**Verification:**
- `make test` passes
- `/health` returns `{"status": "ok"}`
- `/docs` renders OpenAPI UI
