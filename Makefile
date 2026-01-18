SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

all: lint build

lint:
	npx eslint src/

build:
	npx tsc

upgrade-libs:
	npm upgrade --save @playm8s/crds
	npm upgrade --save @thehonker/k8s-operator-node

dev-link:
	cd node_modules/@playm8s && rm -rf crds && ln -s "$${HOME}/Repos/playm8s/pm8s-crds" crds
	cd node_modules/@thehonker && rm -rf k8s-operator-node && ln -s "$${HOME}/Repos/playm8s/k8s-operator-node" k8s-operator-node
	npm list
	npm version

dev: build
	node dist/main.mjs
