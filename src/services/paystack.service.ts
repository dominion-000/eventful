import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const paystackClient = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

interface InitializeParams {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface InitializeResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(params: InitializeParams): Promise<InitializeResponse> {
  try {
    const res = await paystackClient.post('/transaction/initialize', {
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // paystack works in kobo
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    });

    const { authorization_url, access_code, reference } = res.data.data;
    return { authorizationUrl: authorization_url, accessCode: access_code, reference };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new AppError(
        `Paystack initialize failed: ${err.response?.data?.message ?? err.message}`,
        502
      );
    }
    throw err;
  }
}

export type PaystackVerifyStatus = 'success' | 'failed' | 'abandoned' | 'pending';

interface VerifyResponse {
  status: PaystackVerifyStatus;
  reference: string;
  amountNaira: number;
  paidAt: string | null;
}

export async function verifyTransaction(reference: string): Promise<VerifyResponse> {
  try {
    const res = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = res.data.data;
    return {
      status: data.status,
      reference: data.reference,
      amountNaira: data.amount / 100,
      paidAt: data.paid_at ?? null,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new AppError(
        `Paystack verify failed: ${err.response?.data?.message ?? err.message}`,
        502
      );
    }
    throw err;
  }
}

/**
 * Paystack signs every webhook body with HMAC-SHA512 using your secret key.
 * Never trust a webhook payload without checking this first - anyone can POST
 * a fake "payment successful" body to a public endpoint otherwise.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const hash = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  return hash === signatureHeader;
}
