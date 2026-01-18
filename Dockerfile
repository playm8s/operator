FROM docker.io/node:24-alpine AS builder

USER node

WORKDIR /build

COPY --chown=node:node package.json package-lock.json tsconfig.json eslint.config.mjs Makefile /build/
COPY .npmrc /home/node/.npmrc

ENV NODE_ENV=development

RUN --mount=type=secret,id=GITHUB_TOKEN,env=GITHUB_TOKEN \
  set -exu \
  && echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" | tee -a /home/node/.npmrc

RUN set -exu \
  && cd /build \
  && npm install \
  && rm -f /home/node/.npmrc

COPY --chown=node:node src/ /app/src

RUN set -exu \
  && cd /build \
  && make ci

FROM docker.io/node:24-alpine

USER node
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package.json package-lock.json /app/

RUN set -exu \
  && cd /app \
  && npm install

COPY --from=builder /build/dist /app/dist

ENTRYPOINT ["/bin/sh"]

CMD ["-c", " /app/dist/main.mjs"]
