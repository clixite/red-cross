import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { UserRole } from '@sfs/domain';

export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string | null;
  roles: UserRole[];
  mfaVerified: boolean;
}

export class JwtService {
  public static sign(payload: JwtPayload, expiresIn = config.jwtExpiresIn): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn } as jwt.SignOptions);
  }

  public static verify(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }
}
