import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('AquaYa API (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    jest.setTimeout(120000);
    mongoServer = await MongoMemoryServer.create();
    const originalUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
    if (mongoServer) await mongoServer.stop();
    // Reset env
    delete process.env.MONGODB_URI;
  });

  describe('Health Check', () => {
    it('GET / should return health status', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.status).toBe('ok');
        });
    });
  });

  describe('Auth', () => {
    it('POST /auth/register should send verification code', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('Código');
        });
    });

    it('POST /auth/login with unregistered user should fail', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'test1234' })
        .expect(401);
    });
  });
});
