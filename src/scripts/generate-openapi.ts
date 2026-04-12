import 'dotenv/config';
import * as fs from 'fs';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '../app.module';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
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
  fs.writeFileSync('./openapi.json', JSON.stringify(swaggerDocument, null, 2));

  await app.close();
}

void generateOpenApi();
