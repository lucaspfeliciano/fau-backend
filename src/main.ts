import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security: HTTP headers (OWASP)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Performance: GZIP compression
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.use(require('compression')());

  // Serve uploaded playground assets as static files
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FAU Backend API')
    .setDescription(
      'FAU API v1: multi-tenant CS/Product/Engineering platform (Auth, requests, product, engineering, integrations, roadmap, notifications, audit, analytics, durable domain events).',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocument);

  fs.writeFileSync('./openapi.json', JSON.stringify(swaggerDocument));

  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
