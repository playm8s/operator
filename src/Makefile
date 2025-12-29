# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

all: clean lint crds crd-libs compile package

clean:
	rm -rf dist

lint:
	npx eslint .

crds:
	cd app/types && rm -rf api/**/*.yaml && npx pepr crd generate --output api/v1

crd-libs: crds
	cd app && rm -rf api && crd2pulumi --nodejsPath ./api types/api/v1/*.yaml

compile: crd-libs
	npx tsc --project .

package: crds compile
	mkdir -p dist && cp package.json package-lock.json dist/ && cd dist && NODE_ENV=production npm install --omit=dev --legacy-peer-deps
	mkdir -p dist/crds && cp -v $(wildcard app/types/api/v1/*.yaml) dist/crds

run: crd-libs compile package
	node dist/app/main.mjs
