'use strict';

import { pm8s } from '@playm8s/crds';
import { ResourceEvent, ResourceEventType } from '@thehonker/k8s-operator';
import * as K8s from '@kubernetes/client-node';

import { log } from '../../lib/logging.mjs';
import { managedCrd } from '../../lib/managers/types.mjs';
import { parseBool } from '../../lib/functions.mjs';
import { k8sResourceEventsTotal } from '../../lib/metrics.mjs';

// Create KubeConfig for this manager
const kc = new K8s.KubeConfig();
const KUBE_IN_CLUSTER_CONFIG = parseBool(process.env.KUBE_IN_CLUSTER_CONFIG);
if (KUBE_IN_CLUSTER_CONFIG) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}

export const managedCrds: managedCrd[] = [
  {
    group: pm8s.Gameserver.details.group,
    version: pm8s.Gameserver.details.version,
    plural: pm8s.Gameserver.details.plural,
    handler: handleResourceEvent,
    reconciler: reconcileResource,
  },
];

async function handleResourceEvent(event: ResourceEvent): Promise<void> {
  log.debug('Received Gameserver resource event:', event);

  // Track Kubernetes resource events
  k8sResourceEventsTotal.inc({
    resource_type: 'Gameserver',
    event_type: event.type
  });

  // Handle specific event types differently
  switch (event.type) {
    case ResourceEventType.Added:
      log.info(
        `Gameserver resource added: ${event.meta.name} in namespace ${event.meta.namespace || 'unknown'}`
      );
      log.debug('Triggering reconciliation for added Gameserver resource');
      // The reconciler will ensure the deployment exists
      try {
        await reconcileResource(kc, event);
        log.debug('Reconciliation completed for added Gameserver resource');
      } catch (error) {
        log.error('Error during reconciliation:', error);
      }
      break;
    case ResourceEventType.Modified:
      log.info(
        `Gameserver resource modified: ${event.meta.name} in namespace ${event.meta.namespace || 'unknown'}`
      );
      log.debug('Triggering reconciliation for modified Gameserver resource');
      // The reconciler will ensure the deployment is in the correct state
      try {
        await reconcileResource(kc, event);
        log.debug('Reconciliation completed for modified Gameserver resource');
      } catch (error) {
        log.error('Error during reconciliation:', error);
      }
      break;
    case ResourceEventType.Deleted:
      log.info(
        `Gameserver resource deleted: ${event.meta.name} in namespace ${event.meta.namespace || 'unknown'}`
      );
      log.debug('Processing deletion of Gameserver resource');
      // Delete the associated deployment when Gameserver resource is deleted
      if (event.meta.namespace) {
        try {
          const appsV1Api = kc.makeApiClient(K8s.AppsV1Api);
          const deploymentName = `pm8s-${event.meta.name}-gameserver`;
          log.debug(
            `Attempting to delete deployment ${deploymentName} in namespace ${event.meta.namespace}`
          );
          await appsV1Api.deleteNamespacedDeployment({
            name: deploymentName,
            namespace: event.meta.namespace,
          });
          log.info(
            `Deleted deployment ${deploymentName} in namespace ${event.meta.namespace}`
          );
        } catch (error) {
          log.error(
            `Failed to delete deployment pm8s-${event.meta.name}-gameserver in namespace ${event.meta.namespace}:`,
            error
          );
        }
      } else {
        log.warn(
          `Cannot delete deployment for Gameserver ${event.meta.name} - no namespace specified`
        );
      }
      log.debug('Completed processing of Gameserver resource deletion');
      // No reconciliation needed for deletions
      break;
  }
}

async function reconcileResource(
  kc: K8s.KubeConfig,
  event: ResourceEvent
): Promise<void> {
  log.debug('Starting gameserver reconciliation for specific resource');
  if (!kc) {
    log.error('KubeConfig not provided to gameserver reconciler');
    return;
  }

  const appsV1Api = kc.makeApiClient(K8s.AppsV1Api);
  const coreV1Api = kc.makeApiClient(K8s.CoreV1Api);
  const customObjectsApi = kc.makeApiClient(K8s.CustomObjectsApi);

  try {
    // Get the specific resource that changed
    const resourceName = event.meta.name;
    const resourceNamespace = event.meta.namespace;

    if (!resourceName || !resourceNamespace) {
      log.error('Resource name or namespace missing from event');
      return;
    }

    log.debug(
      `Processing Gameserver resource ${resourceName} in namespace ${resourceNamespace}`
    );

    // Get the specific Gameserver resource
    const gameserverResponse = await customObjectsApi.getNamespacedCustomObject({
      group: pm8s.Gameserver.details.group,
      version: pm8s.Gameserver.details.version,
      namespace: resourceNamespace,
      plural: pm8s.Gameserver.details.plural,
      name: resourceName,
    });

    // Validate that the response contains a body
    if (!gameserverResponse) {
      log.error(
        `Failed to retrieve Gameserver resource ${resourceName} in namespace ${resourceNamespace}: Empty or invalid response`
      );
      return;
    }

    const item = gameserverResponse.body as pm8s.Gameserver.gameserverResource;
    const namespace = item.metadata?.namespace;
    const name = item.metadata?.name;

    if (!namespace || !name) {
      log.debug('Skipping Gameserver resource with missing namespace or name');
      return;
    }

    // Generate deployment name based on gameserver custom resource object name
    const deploymentName = `pm8s-${name}-gameserver`;
    log.debug(
      `Checking for deployment ${deploymentName} in namespace ${namespace}`
    );

    // Check if deployment exists
    try {
      await appsV1Api.readNamespacedDeployment({
        name: deploymentName,
        namespace: namespace,
      });
      log.debug(
        `Deployment ${deploymentName} already exists in namespace ${namespace}`
      );

      // Update the deployment if it exists
      await updateGameserverDeployment(appsV1Api, namespace, name);
    } catch {
      // Deployment doesn't exist, create it
      log.info(
        `Creating deployment ${deploymentName} in namespace ${namespace}`
      );
      await createGameserverDeployment(appsV1Api, coreV1Api, namespace, name, item as pm8s.Gameserver.gameserverResource);
    }

    log.debug('Gameserver reconciliation completed successfully');
  } catch (error) {
    log.error('Error during gameserver reconciliation:', error);
  }
}

async function createGameserverDeployment(
  appsV1Api: K8s.AppsV1Api,
  coreV1Api: K8s.CoreV1Api,
  namespace: string,
  gameserverName: string,
  item: pm8s.Gameserver.gameserverResource
): Promise<void> {
  log.debug(
    `Creating gameserver deployment for "${gameserverName}" in namespace ${namespace}`
  );

  // Generate deployment name based on gameserver name
  const deploymentName = `pm8s-${gameserverName}-gameserver`;
  log.debug(`Generated deployment name: ${deploymentName}`);

  // Get configuration from the Gameserver spec
  const gameserverImage = 'ghcr.io/playm8s/gameserver:latest';
  const size = 1;
  const pullPolicy: K8s.V1Container['imagePullPolicy'] = 'Always';

  log.debug('Processing Gameserver spec for configuration');
  // Use default values for now since the spec doesn't have image/size properties
  log.debug(`Using default image: ${gameserverImage}`);
  log.debug(`Using default replica count: ${size}`);

  // Prepare environment variables for the gameserver
  const containerEnvVars: K8s.V1EnvVar[] = [
    {
      name: 'NAMESPACE',
      value: process.env.NAMESPACE || 'pm8s-system',
    },
    {
      name: 'RESOURCE_NAME',
      value: gameserverName,
    },
    {
      name: 'GAME',
      value: item.spec.Game.toString(),
    },
    {
      name: 'GAMESERVER_BASE',
      value: item.spec.GameserverBase,
    },
    {
      name: 'STORAGE_CLASS_NAME',
      value: item.spec.StorageClassName,
    },
  ];

  log.debug('Creating deployment object');

  const deployment: K8s.V1Deployment = {
    metadata: {
      name: deploymentName,
      namespace: namespace,
    },
    spec: {
      replicas: size,
      selector: {
        matchLabels: {
          'pm8s.io/gameserver': gameserverName,
        },
      },
      template: {
        metadata: {
          labels: {
            app: 'playm8s',
            'pm8s.io/gameserver': gameserverName,
          },
        },
        spec: {
          containers: [
            {
              name: 'gameserver',
              image: gameserverImage,
              imagePullPolicy: pullPolicy,
              env: containerEnvVars,
            },
          ],
        },
      },
    },
  };

  log.debug(
    `Attempting to create gameserver deployment ${deploymentName} in namespace ${namespace}`
  );
  try {
    await appsV1Api.createNamespacedDeployment({
      namespace: namespace,
      body: deployment,
    });
    log.info(
      `Successfully created gameserver deployment ${deploymentName} in namespace ${namespace}`
    );
    log.debug(`Gameserver deployment creation completed for ${deploymentName}`);
  } catch (error) {
    log.error(
      `Failed to create gameserver deployment in namespace ${namespace}:`,
      error
    );
  }
}

async function updateGameserverDeployment(
  appsV1Api: K8s.AppsV1Api,
  namespace: string,
  gameserverName: string
): Promise<void> {
  log.debug(
    `Updating gameserver deployment for "${gameserverName}" in namespace ${namespace}`
  );

  // Generate deployment name based on gameserver name
  const deploymentName = `pm8s-${gameserverName}-gameserver`;

  // Get configuration from the Gameserver spec
  const gameserverImage = 'ghcr.io/playm8s/gameserver:latest';
  const size = 1;
  const pullPolicy: K8s.V1Container['imagePullPolicy'] = 'Always';

  log.debug('Processing Gameserver spec for configuration');
  // Use default values for now since the spec doesn't have image/size properties
  log.debug(`Using default image: ${gameserverImage}`);
  log.debug(`Using default replica count: ${size}`);

  try {
    // Get the current deployment
    const deploymentResponse = await appsV1Api.readNamespacedDeployment({
      name: deploymentName,
      namespace: namespace,
    });

    const deployment = deploymentResponse as K8s.V1Deployment;

    // Update the deployment properties
    if (
      deployment &&
      deployment.spec &&
      deployment.spec.template.spec &&
      deployment.spec.template.spec.containers
    ) {
      deployment.spec.replicas = size;

      const container = deployment.spec.template.spec.containers[0];
      if (container) {
        container.image = gameserverImage;
        container.imagePullPolicy = pullPolicy;
      }

      // Update the deployment
      await appsV1Api.replaceNamespacedDeployment({
        name: deploymentName,
        namespace: namespace,
        body: deployment,
      });

      log.info(
        `Updated deployment ${deploymentName} in namespace ${namespace}`
      );
    }
  } catch (error) {
    log.error(`Failed to update deployment ${deploymentName}:`, error);
  }
}
