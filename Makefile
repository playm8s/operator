SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

all: lint build

lint:
	npm run test

build:
	npx tsc

docker-build-dev: lint
	cd app && docker build --platform linux/amd64 --tag local.dev/playm8s/operator:latest .

docker-run-dev: docker-build-dev
	docker run --rm local.dev/playm8s/operator:latest
