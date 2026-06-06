import express, { Request, Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtGuard } from './middleware/auth.middleware';
import { createSuccess, createError } from '@transvirex/shared';

const app = express();

app.use(cors());
// Note: do NOT use express.json() globally — the proxy must forward the raw body.
// Only parse JSON for the gateway's own routes (health, 404).

// ── Service URLs (overridden by env in Docker) ───────────────────────────────
const AUTH_URL     = process.env.AUTH_SERVICE_URL     ?? 'http://localhost:4001';
const MISSION_URL  = process.env.MISSION_SERVICE_URL  ?? 'http://localhost:4002';
const BILLING_URL  = process.env.BILLING_SERVICE_URL  ?? 'http://localhost:4003';
const AI_URL       = process.env.AI_SERVICE_URL       ?? 'http://localhost:4004';

// ── Proxy factory ────────────────────────────────────────────────────────────
// Express's app.use('/prefix', middleware) strips the prefix from req.url before
// the middleware sees it. pathRewrite re-attaches the prefix so the upstream
// service receives the full path (e.g. /auth/register, not just /register).
function proxyTo(target: string, prefix: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { '^/': `/${prefix}/` },
    on: {
      // res can be Socket | Response depending on whether the connection was upgraded;
      // cast to any and guard with 'status in res' to handle both cases safely.
      error: (_err: Error, _req: Request, res: any) => {
        if (typeof res.status === 'function') {
          res.status(502).json(
            createError('BAD_GATEWAY', `Upstream service at ${target} is unavailable`)
          );
        }
      },
    },
  });
}

// ── Health (no JWT) ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json(
    createSuccess({
      service: 'gateway',
      uptime: process.uptime(),
      routes: {
        auth:         AUTH_URL,
        mission:      MISSION_URL,
        'billing-svc': BILLING_URL,
        ai:           AI_URL,
      },
    })
  );
});

// ── Proxied routes ───────────────────────────────────────────────────────────
//  Auth service handles: /auth/* (login, register, me) + /drivers/* + /users/*
app.use('/auth',     jwtGuard, proxyTo(AUTH_URL,    'auth'));
app.use('/drivers',  jwtGuard, proxyTo(AUTH_URL,    'drivers'));
app.use('/users',    jwtGuard, proxyTo(AUTH_URL,    'users'));

// Mission service handles: /missions/*
app.use('/missions', jwtGuard, proxyTo(MISSION_URL, 'missions'));

// Billing service handles: /billing/*
app.use('/billing',  jwtGuard, proxyTo(BILLING_URL, 'billing'));

// AI service handles: /ai/*
app.use('/ai',       jwtGuard, proxyTo(AI_URL,      'ai'));

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(createError('NOT_FOUND', 'Route not found on gateway'));
});

export default app;
