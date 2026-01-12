SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

all: lint build

lint:
	npx eslint src/

build:
	npx tsc

dev: build
	node dist/main.mjs
