import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  app.useLogger(app.get(PinoLogger));
  app.use(helmet());

  const corsOrigins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Swagger / OpenAPI em /docs (integrado com schemas Zod).
  patchNestJsSwagger();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ad Sidera API')
    .setDescription('API REST do Ad Sidera — hábitos local-first com criatura companheira.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get('PORT', { infer: true });
  // O roteamento interno do Railway usa IPv6. '::' escuta em IPv6 e, por dual-stack,
  // também em IPv4 — ao contrário de '0.0.0.0', que deixaria o proxy sem rota.
  await app.listen(port, '::');
  // Endereço real de escuta no log: sem isso, um 502 do proxy é indistinguível de
  // um bind na porta errada.
  console.log(`[boot] API escutando em ${await app.getUrl()}`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
