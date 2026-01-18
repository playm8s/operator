'use strict';

import * as K8s from '@kubernetes/client-node';

import { default as Operator } from '@thehonker/k8s-operator';

// Critical
import { PM8S_LOGO as PM8S_LOGO } from './lib/logo.mjs';

// Logging
import { log, opLogger } from './lib/logging.mjs';

// Import managedCrd objects
import { managedCrd } from './lib/managers/types.mjs';
import { managedCrds as Gameserver } from './lib/managers/pm8s.io.v1.Gameserver.mjs';
import { managedCrds as GameserverBase } from './lib/managers/pm8s.io.v1.GameserverBase.mjs';
import { managedCrds as GameserverOverlay } from './lib/managers/pm8s.io.v1.GameserverOverlay.mjs';
const managedCrds: managedCrd[] = [];
managedCrds.push(...Gameserver);
managedCrds.push(...GameserverBase);
managedCrds.push(...GameserverOverlay);

// Get some runtime config from envvars
// Namespace the operator lives in
const PM8S_NAMESPACE = process.env.PM8S_NAMESPACE || 'pm8s-system';

// Should the operator only watch its own namespace for CRs
const PM8S_WATCH_OTHER_NAMESPACES_ENV =
  process.env.PM8S_WATCH_OTHER_NAMESPACES || 'false';
const PM8S_WATCH_OTHER_NAMESPACES = parseBool(PM8S_WATCH_OTHER_NAMESPACES_ENV);

// Setup some k8s stuff early
const kc = new K8s.KubeConfig();
kc.loadFromDefault();
const op = new Operator(kc, new opLogger());

// Signal handlers
process.on('SIGTERM', () => exit('SIGTERM'));
process.on('SIGINT', () => exit('SIGINT'));

// Start of logic
console.error(PM8S_LOGO);
log.info('playm8s-operator starting up...');
if (!(await checkCRDs())) {
  log.error('crds not found! exiting...');
  await exit('crds not found', 1);
}
await setupResourceWatchers();

/**
 * Cleanup before exit
 * Forces exit after 5 seconds if cleanup fails
 */
async function exit(reason: string, exitcode: number = 0) {
  log.info(`exiting due to ${reason}`);
  if (op) op.stop();
  process.exitCode = exitcode;
  setTimeout(() => {
    log.error('timeout expired, forcing exit');
    process.exit(exitcode != 0 ? exitcode : 127);
  }, 5000).unref();
}

/**
 * Ensure all our CRDs are installed in the cluster
 */
async function checkCRDs() {
  log.info('checking for crds');
  const customObjectsApi = kc.makeApiClient(K8s.CustomObjectsApi);
  const crds: K8s.V1APIResourceList[] = [];
  for (let i = 0; i < managedCrds.length; i++) {
    try {
      const found = await customObjectsApi.getAPIResources(managedCrds[i]);
      crds.push(found);
    } catch (error) {
      if (error.message.includes('404')) {
        return false;
      }
    }
  }
  if (crds.length === managedCrds.length) {
    return crds;
  } else {
    return false;
  }
}

/**
 * Setup resource watches in k8s api
 */
async function setupResourceWatchers() {
  managedCrds.forEach(async (crd: managedCrd) => {
    await op.watchResource(
      crd.group,
      crd.version,
      crd.plural,
      crd.handler,
      PM8S_WATCH_OTHER_NAMESPACES ? PM8S_NAMESPACE : undefined
    );
  });
}

function parseBool(value: string | undefined): boolean {
  if (value) {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
}
