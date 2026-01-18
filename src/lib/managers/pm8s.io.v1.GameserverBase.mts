'use strict';

import { pm8s } from '@playm8s/crds';
import { ResourceEvent } from '@thehonker/k8s-operator';

import { log } from '../../lib/logging.mjs';
import { managedCrd } from '../../lib/managers/types.mjs';

export const managedCrds: managedCrd[] = [
  {
    group: pm8s.GameserverBase.details.group,
    version: pm8s.GameserverBase.details.version,
    plural: pm8s.GameserverBase.details.plural,
    handler: handleResourceEvent,
  },
];

async function handleResourceEvent(event: ResourceEvent): Promise<void> {
  log.debug(event);
}
