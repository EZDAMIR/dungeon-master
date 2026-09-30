# Installed in /srv/dungeon-master/backend after a successful deployment.
RUNTIME_ENV ?= /etc/dungeon-master/runtime.env
COMPOSE = docker compose --project-name dungeon-master --env-file $(RUNTIME_ENV) --env-file image.env --file compose.yml

.DEFAULT_GOAL := status
.PHONY: status logs backup

status:
	$(COMPOSE) ps
	@cat ../deployed.json

logs:
	$(COMPOSE) logs --follow --tail=100 backend

backup:
	@umask 077; $(COMPOSE) exec -T postgres sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -Fc' > "../backups/manual-$$(date -u +%Y%m%dT%H%M%SZ).dump"
