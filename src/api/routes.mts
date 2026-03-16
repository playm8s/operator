'use strict';

import { Router, Request, Response, NextFunction } from 'express';
import * as K8s from '@kubernetes/client-node';
import { log } from '../lib/logging.mjs';
import { parseBool } from '../lib/functions.mjs';
import {
  register,
  apiRequestsTotal,
  apiRequestDurationSeconds,
} from '../lib/metrics.mjs';

// Setup Kubernetes client
const kc = new K8s.KubeConfig();
const KUBE_IN_CLUSTER_CONFIG = parseBool(process.env.KUBE_IN_CLUSTER_CONFIG);
if (KUBE_IN_CLUSTER_CONFIG) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}

const router = Router();

// Metrics endpoint (no authentication required)
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    log.error('Error generating metrics:', error);
    res.status(500).end();
  }
});

// Authentication middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = process.env.PM8S_OPERATOR_API_TOKEN;

  // If no token is configured, allow all requests (dev mode)
  if (!token) {
    log.warn('No PM8S_OPERATOR_API_TOKEN configured - API disabled');
    return res.status(401).json({ error: 'API Token not configured' });
  }

  // Check if authorization header exists
  if (!authHeader) {
    log.warn('Authorization header missing from request');
    return res.status(401).json({ error: 'Authorization header required' });
  }

  // Check if it's Bearer token format
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    log.warn('Invalid authorization header format');
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Check if token matches
  if (tokenParts[1] !== token) {
    log.warn('Invalid API token provided');
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Token is valid, proceed
  next();
};

// Apply authentication middleware to all routes except metrics
router.use((req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for metrics endpoint
  if (req.path === '/metrics') {
    return next();
  }
  authenticateToken(req, res, next);
});

// Request tracking middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Track response finish to record metrics
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds

    // Record request duration
    apiRequestDurationSeconds.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
      },
      duration
    );

    // Record request count
    apiRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
    });
  });

  next();
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;