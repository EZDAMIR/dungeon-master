PYTHON ?= python3
NPM ?= npm
RUFF ?= backend/.venv/bin/ruff
VPS_SSH ?= backend-hr

.DEFAULT_GOAL := help
.PHONY: help fix format check check-architecture check-automation check-backend check-frontend ci ci-backend ci-frontend ci-frontend-checks ci-docker
.PHONY: smoke-tests smoke-tests-frontend smoke-tests-docker
.PHONY: release deploy check-deploy vps-status vps-logs

help:
	@echo 'make fix          Format Python and apply frontend lint fixes'
	@echo 'make format       Alias for make fix'
	@echo 'make check        Check architecture, Python style and frontend types/lint'
	@echo 'make ci           Run backend, frontend and Docker verification'
	@echo 'make ci-backend   Run backend checks and database-backed tests'
	@echo 'make ci-frontend  Run frontend checks, tests and both production builds'
	@echo 'make ci-frontend-checks Run frontend CI checks and unit tests'
	@echo 'make ci-docker    Build and smoke-test an isolated Docker stack'
	@echo 'make smoke-tests  Run frontend and Docker smoke tests'
	@echo 'make release      Build and publish a SHA-pinned VPS release (CD)'
	@echo 'make deploy       Deploy the built release over verified SSH (CD)'
	@echo 'make check-deploy Check deployment scripts and regression tests'
	@echo 'make vps-status   Show only Dungeon Master services on the VPS'
	@echo 'make vps-logs     Follow only Dungeon Master backend logs'

fix:
	$(MAKE) -C backend format
	$(RUFF) check --fix --select E,F,I,UP,B,SIM --ignore E501 --target-version py312 scripts/
	$(RUFF) format --config 'line-length = 95' --config 'format.quote-style = "double"' scripts/
	$(NPM) --prefix frontend run lint -- --fix

format: fix

check: check-architecture check-automation check-backend check-frontend

check-architecture:
	$(PYTHON) scripts/verify_architecture.py

check-automation:
	$(RUFF) check --select E,F,I,UP,B,SIM --ignore E501 --target-version py312 scripts/
	$(RUFF) format --check --config 'line-length = 95' --config 'format.quote-style = "double"' scripts/
	bash -n scripts/check-docker.sh
	@for script in scripts/build-release.sh scripts/deploy-ssh.sh deploy/*.sh; do bash -n "$$script" || exit; done
	$(RUFF) check --select E,F,I,UP,B,SIM --ignore E501 --target-version py312 deploy/*.py
	$(RUFF) format --check --config 'line-length = 95' --config 'format.quote-style = "double"' deploy/*.py

check-backend:
	$(MAKE) -C backend check

check-frontend:
	$(NPM) --prefix frontend run check:instructions
	$(NPM) --prefix frontend run test:instructions
	$(NPM) --prefix frontend run lint
	$(NPM) --prefix frontend run type-check

ci: ci-backend ci-frontend ci-docker

ci-backend: check-architecture check-automation
	$(MAKE) -C backend ci

ci-frontend: ci-frontend-checks
	$(MAKE) smoke-tests-frontend

ci-frontend-checks: check-frontend
	$(PYTHON) -m unittest discover -s scripts -p 'test_*.py'
	$(NPM) --prefix frontend run test:coverage

smoke-tests: smoke-tests-frontend smoke-tests-docker

smoke-tests-frontend:
	$(NPM) --prefix frontend run build
	$(PYTHON) scripts/check_frontend_build.py
	$(NPM) --prefix frontend run build -- --base=/dungeon-master/
	$(PYTHON) scripts/check_frontend_build.py --base=/dungeon-master/

ci-docker: smoke-tests-docker

smoke-tests-docker:
	bash scripts/check-docker.sh

release:
	bash scripts/build-release.sh

deploy:
	bash scripts/deploy-ssh.sh

check-deploy: check-automation
	$(PYTHON) -m unittest discover -s scripts -p 'test_deploy*.py'
	node --check scripts/check_deployed_browser.cjs

vps-status:
	ssh "$(VPS_SSH)" 'make -C /srv/dungeon-master/backend status'

vps-logs:
	ssh "$(VPS_SSH)" 'make -C /srv/dungeon-master/backend logs'
