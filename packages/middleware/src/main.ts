import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { WsAdapter } from '@nestjs/platform-ws';
import type { NextFunction, Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Trust proxy when running behind a load balancer / ingress (needed for HTTPS enforcement + correct client IPs)
  const trustProxy = (process.env.TRUST_PROXY || (isProduction ? 'true' : 'false')) === 'true';
  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  // WebSockets (platform-ws)
  app.useWebSocketAdapter(new WsAdapter(app));

  // Security middleware
  app.use(
    helmet({
      hsts: isProduction
        ? {
            maxAge: 15552000, // 180 days
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );

  // Disable X-Powered-By header (Express)
  const httpInstance = app.getHttpAdapter().getInstance();
  if (httpInstance && typeof httpInstance.disable === 'function') {
    httpInstance.disable('x-powered-by');
  }

  // Enforce HTTPS in production (typically behind a reverse proxy terminating TLS)
  const enforceHttps = (process.env.ENFORCE_HTTPS || (isProduction ? 'true' : 'false')) === 'true';
  if (enforceHttps) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
        .split(',')[0]
        .trim()
        .toLowerCase();
      const isHttps = Boolean(req.secure) || forwardedProto === 'https';

      if (isHttps) return next();
      return res.status(400).json({ error: 'HTTPS required' });
    });
  }

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
  const allowedOrigins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // API versioning
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger / OpenAPI
  const swaggerEnabled = (process.env.SWAGGER_ENABLED || (!isProduction ? 'true' : 'false')) === 'true';
  if (swaggerEnabled) {
    const apiVersion = process.env.API_VERSION || apiPrefix.replace(/^\//, '');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CareBridge Middleware API')
      .setDescription('CareBridge middleware for consent-based health data exchange')
      .setVersion(apiVersion)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 CareBridge Middleware API running on http://localhost:${port}${apiPrefix}`);
}

bootstrap().catch((err) => {
  console.error('❌ Application failed to start:', err);
  process.exit(1);
});
