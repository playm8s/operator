FROM docker.io/node:24-alpine AS builder

USER root

RUN set -exu \
  && apk add --no-cache \
    bash \
    make

USER node

WORKDIR /build

COPY --chown=node:node package.json package-lock.json tsconfig.json eslint.config.mjs Makefile .npmrc /build/

ENV NODE_ENV=development

RUN --mount=type=secret,id=GITHUB_TOKEN,env=GITHUB_TOKEN \
  set -exu \
  && echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" | tee -a .npmrc

RUN set -exu \
  && cd /build \
  && npm install

COPY --chown=node:node src/ /build/src

RUN set -exu \
  && cd /build \
  && make ci \
  && rm -f .npmrc

FROM docker.io/node:24-alpine

USER node
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package.json package-lock.json .npmrc /app/

RUN --mount=type=secret,id=GITHUB_TOKEN,env=GITHUB_TOKEN \
  set -exu \
  && echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" | tee -a .npmrc

RUN set -exu \
  && cd /app \
  && npm install \
  && rm -f .npmrc

COPY --from=builder /build/dist /app/dist

ENTRYPOINT ["/bin/sh"]

CMD ["-c", " /app/dist/main.mjs"]
