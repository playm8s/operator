FROM docker.io/node:24-alpine

USER node

WORKDIR /app

COPY --chown=node:node package.json package-lock.json /app/

ENV NODE_ENV=production

RUN --mount=type=secret,id=GITHUB_TOKEN,env=GITHUB_TOKEN \
  set -exu \
  && echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" | tee -a $HOME/.npmrc \
  && echo "@playm8s:registry=https://npm.pkg.github.com/" | tee -a $HOME/.npmrc \
  && echo "always-auth=true" | tee -a $HOME/.npmrc \
  && cd /app \
  && npm install \
  && rm -f $HOME/.npmrc

COPY --chown=node:node dist/ /app

ENTRYPOINT ["/bin/sh"]

CMD ["-c", " /app/main.mjs"]
