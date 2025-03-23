import { NestFactory } from '@nestjs/core';
import { OnyxAppModule } from './modules';
import { Config } from '../application/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConsoleLogger } from '@nestjs/common';
import * as express from 'express';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

class NoPathResolveLogger extends ConsoleLogger {
  log(message: string, ...opts: any[]) {
    if (
      ['InstanceLoader', 'RoutesResolver', 'RouterExplorer'].includes(opts[0] || '')
    ) {
      return false;
    }
    super.log(message, opts[0]);
  }
}

async function bootstrap() {
  const yaml = readFileSync(__dirname + '/../config/pages.yaml');
  console.log(yaml.toString())
  const onyxApp = await NestFactory.create(OnyxAppModule, { logger: new NoPathResolveLogger() });
  onyxApp.use('/assets', express.static(__dirname + '/../assets'));
  await onyxApp.listen(Config.API_PORT ?? 3004);

  if (Config.NODE_ENV === 'local') {
    const docsConfig = new DocumentBuilder()
      .setTitle('Onyx Dev Portal API')
      .addServer(`http://localhost:${Config.API_PORT}/`)
      .addApiKey(
        {
          type: 'apiKey',
          name: 'authorization',
          in: 'header',
          scheme: 'authorization',
        },
        'HttpAuthHeader'
      )
      .build();

    const document = SwaggerModule.createDocument(onyxApp, docsConfig);
    SwaggerModule.setup('docs', onyxApp, document, {
      swaggerOptions: {
        tagsSorter: 'alpha',
        docExpansion: 'none',
        apisSorter: 'alpha',
        operationsSorter: 'alpha',
        filter: true,
        defaultModelExpandDepth: 100,
      },
    });
  }

  console.log(`Running app on http://localhost:${Config.API_PORT}`);
}
bootstrap();
