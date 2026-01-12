FROM docker.io/node:24-alpine AS builder

USER root

RUN set -exu \
  && apk add --no-cache \
    make \
    bash \
    curl \
    python3 \
    g++ \
    gcc

RUN set -exu \
  && curl -sSL https://github.com/pulumi/crd2pulumi/releases/download/v1.6.0/crd2pulumi-v1.6.0-linux-amd64.tar.gz \
      | tar -xzv -C /usr/bin crd2pulumi \
  && curl -sSL https://github.com/arttor/helmify/releases/download/v0.4.19/helmify_Linux_x86_64.tar.gz \
      | tar -xzv -C /usr/bin helmify

WORKDIR /build

COPY package.json package-lock.json /build/

RUN set -exu \
  && cd /build \
  && npm install --include=dev --legacy-peer-deps

COPY eslint.config.mjs .prettierrc.yaml tsconfig.json Makefile /build/
COPY app /build/app

RUN set -exu \
  && cd /build \
  && make package

FROM docker.io/node:24-alpine

USER node

WORKDIR /app

COPY --from=builder --chown=node:node /build/bin/app /app
COPY --chown=node:node package.json package-lock.json /app/

ENV NODE_ENV=production

RUN set -exu \
  && cd /app \
  && npm install --omit=dev --legacy-peer-deps

ENTRYPOINT ["/bin/sh"]

CMD ["-c", "node /app/main.mjs"]
