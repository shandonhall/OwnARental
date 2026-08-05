import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

function corsOrigins(): string[] {
  const fromEnv = [
    process.env.WEB_ORIGIN,
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(fromEnv)];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const origins = corsOrigins();
  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    console.warn(
      'WEB_ORIGIN is not set — browser clients cannot call the API (CORS).',
    );
  }

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Own A Rental API listening on http://localhost:${port}/api`);
}

void bootstrap();
