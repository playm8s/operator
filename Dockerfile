FROM docker.io/node:24-alpine

USER node

WORKDIR /app

COPY --chown=node:node package.json package-lock.json /app/

ENV NODE_ENV=production

RUN --mount=type=secret,id=GITHUB_TOKEN,env=GITHUB_TOKEN \
  set -exu \
  && cat <<EOF >> $HOME/.npmrc
  //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
  @playm8s:registry=https://npm.pkg.github.com/
  EOF \
  && cd /app \
  && npm install --legacy-peer-deps \
  && rm -f $HOME/.npmrc

COPY --chown=node:node dist/ /app

ENTRYPOINT ["/bin/sh"]

CMD ["-c", " /app/main.mjs"]
