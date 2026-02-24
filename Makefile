# GitStat Makefile

# Frontend commands
.PHONY: install dev build test lint format archive

install:
	cd gitstat && npm install

dev:
	cd gitstat && npm run dev

build:
	cd gitstat && npm run build

test:
	cd gitstat && npm run test

lint:
	cd gitstat && npm run lint

format:
	cd gitstat && npx prettier --write .

# Archive command - archives .ralph/prd.json, .ralph/progress.txt, and specs/* into .ralph/archive/NNNN/
SHELL := /bin/bash
.PHONY: archive
archive:
	@LAST=$$(ls -1d .ralph/archive/[0-9][0-9][0-9][0-9] 2>/dev/null | sort | tail -1 | xargs -I{} basename {}); \
	if [ -z "$$LAST" ]; then \
		NEXT=0001; \
	else \
		NEXT=$$(printf '%04d' $$(( 10#$$LAST + 1 ))); \
	fi; \
	DIR=.ralph/archive/$$NEXT; \
	mkdir -p $$DIR/specs; \
	mv .ralph/prd.json $$DIR/ 2>/dev/null || true; \
	mv .ralph/progress.txt $$DIR/ 2>/dev/null || true; \
	find specs -type f ! -name '.gitkeep' -exec mv {} $$DIR/specs/ \; 2>/dev/null || true; \
	echo "Archived to $$DIR"
