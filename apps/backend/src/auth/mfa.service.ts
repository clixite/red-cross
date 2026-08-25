import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class MfaService {
  /**
   * Génère un nouveau secret TOTP
   */
  public static generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Génère l'URI otpauth:// et un QR Code en base64 pour configuration dans une application (Google Authenticator, etc.)
   */
  public static async generateQrCode(email: string, secret: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    const serviceName = 'Service du Sang - Portail Clients';
    const otpauthUrl = authenticator.keyuri(email, serviceName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { otpauthUrl, qrCodeDataUrl };
  }

  /**
   * Vérifie la validité d'un code TOTP à 6 chiffres
   */
  public static verifyToken(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    try {
      return authenticator.verify({
        token: token.trim(),
        secret: secret.trim(),
      });
    } catch {
      return false;
    }
  }
}
