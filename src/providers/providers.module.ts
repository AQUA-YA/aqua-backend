import { Global, Module, Logger } from '@nestjs/common';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
export const MAIL_PROVIDER = 'MAIL_PROVIDER';
export const PUSH_PROVIDER = 'PUSH_PROVIDER';
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface PaymentProvider {
  createDeposit(
    userId: string,
    amount: number,
  ): Promise<{ success: true; reference: string }>;
  createPayout(
    userId: string,
    amount: number,
  ): Promise<{ success: true; reference: string }>;
}

export interface MailProvider {
  sendVerificationCode(email: string, code: string): Promise<void>;
}

export interface PushProvider {
  send(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void>;
}

export interface StorageProvider {
  upload(file: Buffer | string, folder: string): Promise<{ url: string }>;
}

const logger = new Logger('Providers');

const MockPaymentProvider: PaymentProvider = {
  createDeposit(_userId: string, amount: number) {
    const reference = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    logger.log(
      `[PAYMENT] Depósito de $${amount} para usuario ${_userId}: ${reference}`,
    );
    return Promise.resolve({ success: true, reference });
  },
  createPayout(_userId: string, amount: number) {
    const reference = `po_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    logger.log(
      `[PAYMENT] Pago de $${amount} para usuario ${_userId}: ${reference}`,
    );
    return Promise.resolve({ success: true, reference });
  },
};

const MockMailProvider: MailProvider = {
  sendVerificationCode(email: string, code: string) {
    logger.log(`[MAIL] Código para ${email}: ${code}`);
    return Promise.resolve();
  },
};

const MockPushProvider: PushProvider = {
  send(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    logger.log(`[PUSH] A ${tokens.length} dispositivos — ${title}: ${body}`);
    if (data) logger.log(`[PUSH] Data: ${JSON.stringify(data)}`);
    return Promise.resolve();
  },
};

const MockStorageProvider: StorageProvider = {
  upload(_file: Buffer | string, folder: string) {
    const url = `https://storage.aquaya.mock/${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    logger.log(`[STORAGE] Archivo subido a ${url}`);
    return Promise.resolve({ url });
  },
};

@Global()
@Module({
  providers: [
    { provide: PAYMENT_PROVIDER, useValue: MockPaymentProvider },
    { provide: MAIL_PROVIDER, useValue: MockMailProvider },
    { provide: PUSH_PROVIDER, useValue: MockPushProvider },
    { provide: STORAGE_PROVIDER, useValue: MockStorageProvider },
  ],
  exports: [PAYMENT_PROVIDER, MAIL_PROVIDER, PUSH_PROVIDER, STORAGE_PROVIDER],
})
export class ProvidersModule {}
