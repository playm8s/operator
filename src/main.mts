'use strict';

import { default as winston } from 'winston';

import { pm8s } from '@playm8s/crds';

import { PM8S_LOGO as PM8S_LOGO } from './lib/logo.mjs';

const PM8S_LOG_LEVEL = process.env.PM8S_LOG_LEVEL || 'debug';

const log = winston.createLogger({
  level: PM8S_LOG_LEVEL,
  defaultMeta: {},
  transports: [],
});

if (process.env.NODE_ENV === 'production') {
  log.add(new winston.transports.Console({
    format: winston.format.json(),
  }));
} else {
  log.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const GSBaseSpec = {
  Game: pm8s.v1.Enums.Games.csgo,
  StorageClassName: 'vfs',
  StorageStrategy: pm8s.v1.Enums.StorageStrategies.raw,
  Status: {
    lastTransitionTime: new Date(),
    message: 'new object created',
    reason: pm8s.v1.Enums.StatusReasons.created,
  }
}

const myGSBase = new pm8s.v1.GameserverBase(GSBaseSpec);

async function main() {
  console.log(PM8S_LOGO);
  log.info('playm8s-operator starting up...');
  log.debug(JSON.stringify(myGSBase, null, 2));
}

await main();
