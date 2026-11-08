'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { env, isTest, features } = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { mongoSanitize, originGuard, isAllowedOrigin } = require('./middleware/security');
const { ensureCsrfToken, csrfProtection } = require('./middleware/csrf');
const { generalLimiter } = require('./middleware/rateLimit');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

/* --------------------------------------------------------------- security --- */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // the SPA is served separately by Vite/CDN
  })
);

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  maxAge: 86400,
};

// Built per request so the origin check can compare against the host actually
// serving the API (same-origin deployments need no CLIENT_URL entry).
app.use((req, res, next) =>
  cors({ ...corsOptions, origin: (origin, callback) => callback(null, isAllowedOrigin(origin, req)) })(req, res, next)
);

/* --------------------------------------------------------------- parsing --- */

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

/* ------------------------------------------------------ request hardening --- */

app.use(mongoSanitize);
app.use(originGuard);
app.use(ensureCsrfToken);
app.use(csrfProtection);
app.use('/api', generalLimiter);

/* --------------------------------------------------------------- logging --- */

if (!isTest) {
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: { write: (message) => logger.http(message.trim()) },
      skip: (req) => req.path === '/api/health',
    })
  );
}

/* ---------------------------------------------------------------- routes --- */

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'BCA SmartLearn AI API',
      version: '1.0.0',
      docs: '/api/health',
      configuredFeatures: features,
    },
  });
});

/* ----------------------------------------------------------- error handling --- */

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
