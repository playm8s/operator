'use strict';

import { pm8s } from '@playm8s/crds';
import {
  ResourceEvent,
} from '@thehonker/k8s-operator';

export interface managedCrd {
  group: typeof pm8s.Gameserver.details.group;
  version: typeof pm8s.Gameserver.details.version;
  plural: typeof pm8s.Gameserver.details.plural;
  handler: (event: ResourceEvent) => Promise<void>;
}
