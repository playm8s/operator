# PlayM8s Operator

The PlayM8s Operator is a Kubernetes controller that manages the lifecycle of game servers in the PlayM8s platform. It watches for custom resources and ensures the desired state matches the actual state in the cluster.

## Overview

PlayM8s is a Kubernetes-native gaming platform that allows you to deploy and manage game servers at scale. The operator is responsible for:

1. Watching PlayM8s custom resources (Gameservers, GameserverBases, GameserverOverlays)
2. Reconciling the desired state with the actual state in the cluster
3. Managing the lifecycle of game server deployments
4. Exposing metrics and health information via HTTP API

## Architecture

The operator is built using the `@thehonker/k8s-operator` framework and follows the Kubernetes operator pattern. It watches for changes to PlayM8s custom resources and takes appropriate actions to ensure the cluster state matches the desired state.

### Managed Resources

The operator manages three types of custom resources:

1. **Gameservers** - Deployed game server instances
2. **GameserverBases** - Base configurations for game servers
3. **GameserverOverlays** - Overlay configurations that can be applied to game servers

## Features

- **Resource Watching** - Watches for changes to PlayM8s custom resources
- **Reconciliation Loop** - Ensures cluster state matches desired state
- **HTTP API** - Exposes health checks and metrics
- **Prometheus Metrics** - Detailed operational metrics for monitoring

## HTTP API

The operator exposes an HTTP API on port 9000 (configurable via `HTTP_API_PORT` environment variable):

- `GET /` - API root with basic information
- `GET /api/health` - Health check endpoint
- `GET /api/metrics` - Prometheus metrics endpoint

## Environment Variables

- `NAMESPACE` - Namespace the operator lives in (default: "pm8s-system")
- `WATCH_OTHER_NAMESPACES` - Whether to watch resources in all namespaces (default: "false")
- `KUBE_IN_CLUSTER_CONFIG` - Whether to use in-cluster Kubernetes configuration (default: parsed from env)
- `HTTP_API_PORT` - Port for the HTTP API (default: "9000")
- `OPERATOR_API_TOKEN` - Token for API authentication (required for most endpoints)

## Development

### Prerequisites

- Node.js >= 24.0.0
- Kubernetes cluster for testing
- kubectl configured for your cluster

### Building

```bash
npm install
npm run build
```

### Running Locally

```bash
npm run dev
```

### Linting

```bash
npm run test
```

## Deployment

The operator can be deployed to a Kubernetes cluster using the provided Docker image. It requires the PlayM8s CRDs to be installed in the cluster first.

## License

This project is licensed under the MIT License.