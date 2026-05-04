import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter, ApiEnvelopeInterceptor } from './common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS to allow requests from any origin
  app.enableCors({
    origin: true, // Allow all origins (can be restricted in production)
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Starter BE API')
    .setDescription('Starter BE API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  console.log(`Swagger is running on: http://0.0.0.0:${process.env.PORT}/api`);

  // Enable global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable class-transformer serialization (@Exclude, @Expose)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ApiEnvelopeInterceptor(),
  );

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set global prefix (QLDL contract: /api/v1)
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 5000;
  // Listen on 0.0.0.0 to accept connections from outside the container
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
void bootstrap();
