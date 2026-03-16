'use strict';

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

// Create a new registry for our metrics
const register = new Registry();

// Collect default metrics (Node.js internals, event loop, etc.)
collectDefaultMetrics({ register });

register.setDefaultLabels({
  app: 'playm8s-operator'
});

// Custom metrics

// Counter for total number of API requests
const apiRequestsTotal = new Counter({
  name: 'pm8s_operator_api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Counter for total number of Kubernetes resource events
const k8sResourceEventsTotal = new Counter({
  name: 'pm8s_operator_k8s_resource_events_total',
  help: 'Total number of Kubernetes resource events processed',
  labelNames: ['resource_type', 'event_type'],
  registers: [register]
});

// Gauge for active Kubernetes watches
const k8sActiveWatches = new Gauge({
  name: 'pm8s_operator_k8s_active_watches',
  help: 'Number of active Kubernetes watches',
  registers: [register]
});

// Histogram for API request duration
const apiRequestDurationSeconds = new Histogram({
  name: 'pm8s_operator_api_request_duration_seconds',
  help: 'Duration of API requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

export {
  register,
  apiRequestsTotal,
  k8sResourceEventsTotal,
  k8sActiveWatches,
  apiRequestDurationSeconds
};