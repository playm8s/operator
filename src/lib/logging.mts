'use strict';

import { default as winston } from 'winston';

import { OperatorLogger } from '@thehonker/k8s-operator';

// Loglevel
const PM8S_LOG_LEVEL: string = process.env.PM8S_LOG_LEVEL || 'debug';

// Setup logging
export const log: winston.Logger = winston.createLogger({
  level: PM8S_LOG_LEVEL,
  defaultMeta: {},
  transports: [],
});

// Json in prod, pretty in dev
if (process.env.NODE_ENV === 'production') {
  log.add(
    new winston.transports.Console({
      format: winston.format.json(),
    })
  );
} else {
  log.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Logging for our Pm8sOperator class instance
export class opLogger implements OperatorLogger {
  public info(message: string): void {
    log.info(message);
  }
  public debug(message: string): void {
    log.debug(message);
  }
  public warn(message: string): void {
    log.debug(message);
  }
  public error(message: string): void {
    log.debug(message);
  }
}
