SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

all: lint build

lint:
	npx eslint src/

build:
	npx tsc

upgrade-crd-lib:
	npm upgrade --save @playm8s/crds

dev-link:
	cd node_modules/@playm8s && rm -rf crds && ln -s "$${HOME}/Repos/playm8s/pm8s-crds" crds
	npm list

dev: build
	node dist/main.mjs
