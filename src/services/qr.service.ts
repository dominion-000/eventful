import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env';

function sign(ticketId: string): string {
  return crypto.createHmac('sha256', env.QR_SIGNING_SECRET).update(ticketId).digest('hex');
}

// token format: "<ticketId>.<signature>" - a scanner can't forge a valid
// token for a ticket id it doesn't know the secret for, and can't just
// increment ids to find valid tickets
export function generateQrToken(ticketId: string): string {
  return `${ticketId}.${sign(ticketId)}`;
}

export function verifyQrToken(token: string): { valid: boolean; ticketId?: string } {
  const [ticketId, signature] = token.split('.');
  if (!ticketId || !signature) return { valid: false };

  const expected = sign(ticketId);
  const providedBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (providedBuf.length !== expectedBuf.length) return { valid: false };
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return { valid: false };

  return { valid: true, ticketId };
}

export async function generateQrImageDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2, width: 400 });
}
