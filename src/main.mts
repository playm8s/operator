'use strict';

import { default as winston } from 'winston';

import { pm8s } from '@playm8s/crds';
import * as K8s from '@kubernetes/client-node';

import {
  default as K8sOperator,
  ResourceEvent,
  ResourceEventType,
  OperatorLogger,
} from '@dot-i/k8s-operator';

import { PM8S_LOGO as PM8S_LOGO } from './lib/logo.mjs';

// Loglevel
const PM8S_LOG_LEVEL: string = process.env.PM8S_LOG_LEVEL || 'debug';

// List CRDs to manage with the operator here
const crdsToManage = [
  {
    group: pm8s.Gameserver.details.group,
    version: pm8s.Gameserver.details.version,
    plural: pm8s.Gameserver.details.plural,
  },
  {
    group: pm8s.GameserverBase.details.group,
    version: pm8s.GameserverBase.details.version,
    plural: pm8s.GameserverBase.details.plural,
  },
  {
    group: pm8s.GameserverOverlay.details.group,
    version: pm8s.GameserverOverlay.details.version,
    plural: pm8s.GameserverOverlay.details.plural,
  },
];

// Setup logging
const log: winston.Logger = winston.createLogger({
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
class opLogger implements OperatorLogger {
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

// Setup some k8s stuff early
let op: Pm8sOperator | null = null;
const kc = new K8s.KubeConfig();
kc.loadFromDefault();

process.on('SIGTERM', () => exit('SIGTERM'));
process.on('SIGINT', () => exit('SIGINT'));

class Pm8sOperator extends K8sOperator {
  protected async init() {
    // Setup watches for CR instances
    for (let i = 0; i < crdsToManage.length; i++) {
      try {
        await this.watchResource(
          crdsToManage[i].group,
          crdsToManage[i].version,
          crdsToManage[i].plural,
          async (event: ResourceEvent) => {
            log.debug(event);
            try {
              if (
                event.type === ResourceEventType.Added ||
                event.type === ResourceEventType.Modified
              ) {
                if (
                  !(await this.handleResourceFinalizer(
                    event,
                    `${crdsToManage[i].plural}.${crdsToManage[i].group}`,
                    (event: ResourceEvent) => this.resourceDeleted(event)
                  ))
                ) {
                  await this.resourceModified(event);
                }
              }
            } catch (error) {
              log.error(error);
            }
          }
        );
      } catch (error) {
        log.error(error);
      }
    }
  }

  private async resourceModified(event: ResourceEvent) {
    log.debug('resourceModified event', event);
    const object = event.object as pm8s.GameserverBase.GameserverBaseResource;
    const metadata = object.metadata;

    if (!object || !metadata) {
      log.warn('metadata is undefined for the GameserverBase resource');
      return;
    }

    if (
      !object.status ||
      object.status.observedGeneration !== metadata.generation
    ) {
      // TODO: handle resource modification here

      await this.setResourceStatus(event.meta, {
        observedGeneration: metadata.generation,
      });
    }
  }

  private async resourceDeleted(event: ResourceEvent) {
    // TODO: handle resource deletion here
    log.debug('resourceDeleted event', event);
  }
}

async function main() {
  console.error(PM8S_LOGO);
  log.info('playm8s-operator starting up...');
  if (!(await checkCRDs())) {
    log.error('crds not found! Exiting...');
    return;
  }
  op = new Pm8sOperator(new opLogger());
  await op.start();
}

async function exit(reason: string) {
  log.info(`exiting due to ${reason}`);
  if (op) op.stop();
  process.exitCode = 0;
}

/**
 * Ensure all our CRDs are installed in the cluster
 */
async function checkCRDs() {
  log.info('checking for crds');
  const customObjectsApi = kc.makeApiClient(K8s.CustomObjectsApi);
  const crds: K8s.V1APIResourceList[] = [];
  for (let i = 0; i < crdsToManage.length; i++) {
    try {
      const found = await customObjectsApi.getAPIResources(crdsToManage[i]);
      crds.push(found);
    } catch (error) {
      if (error.message.includes('404')) {
        return false;
      }
    }
  }
  if (crds.length === crdsToManage.length) {
    return crds;
  } else {
    return false;
  }
}

// Call main()
await main();
