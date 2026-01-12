'use strict';

import { default as winston } from 'winston';

// import { pm8s as pm8s } from './api/index.js';

import { PM8S_LOGO as PM8S_LOGO } from '../lib/logo.mjs';

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

async function main() {
  console.log(PM8S_LOGO);
  log.info('playm8s-operator starting up...');
}

await main();
