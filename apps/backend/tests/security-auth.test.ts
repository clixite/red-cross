import { describe, it, expect, vi } from 'vitest';
import { JwtService } from '../src/auth/jwt.service.js';
import { MfaService } from '../src/auth/mfa.service.js';
import { requireTenantMatch } from '../src/auth/tenant.middleware.js';
import { requirePermission, AuthenticatedRequest } from '../src/auth/auth.middleware.js';
import { UserRole } from '@sfs/domain';

describe('Sécurité, Authentification & Isolation Multi-Tenant (Phase 2)', () => {
  it('génère et valide un token JWT signé avec expiration', () => {
    const payload = {
      userId: 'user-123',
      email: 'qualite@hopital-namur.be',
      organizationId: 'org-namur',
      roles: [UserRole.DECLARANT],
      mfaVerified: true,
    };

    const token = JwtService.sign(payload);
    expect(typeof token).toBe('string');

    const decoded = JwtService.verify(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.organizationId).toBe('org-namur');
    expect(decoded.roles).toContain(UserRole.DECLARANT);
  });

  it('génère un secret TOTP et valide le code généré', () => {
    const secret = MfaService.generateSecret();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(10);

    // otplib generation
    const { authenticator } = require('otplib');
    const validCode = authenticator.generate(secret);

    expect(MfaService.verifyToken(validCode, secret)).toBe(true);
    expect(MfaService.verifyToken('000000', secret)).toBe(false);
  });

  it('bloque catégoriquement une tentative d accès transversal inter-organisations (HTTP 403)', () => {
    const mockReq = {
      user: {
        userId: 'user-client-1',
        email: 'user@chu-liege.be',
        organizationId: 'org-chu-liege',
        roles: [UserRole.REFERENT_QUALITE],
        mfaVerified: true,
      },
      params: { orgId: 'org-hopital-charleroi' },
      ip: '192.168.1.50',
      method: 'GET',
      originalUrl: '/api/v1/complaints/org/org-hopital-charleroi',
    } as unknown as AuthenticatedRequest;

    let responseStatus = 200;
    let responseBody: any = null;
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (body: any) => {
            responseBody = body;
          },
        };
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const middleware = requireTenantMatch((req) => req.params.orgId);
    middleware(mockReq, mockRes, next);

    expect(nextCalled).toBe(false);
    expect(responseStatus).toBe(403);
    expect(responseBody.error).toBe('TENANT_ACCESS_DENIED');
  });

  it('autorise l accès quand l organisation correspond', () => {
    const mockReq = {
      user: {
        userId: 'user-client-1',
        email: 'user@chu-liege.be',
        organizationId: 'org-chu-liege',
        roles: [UserRole.REFERENT_QUALITE],
        mfaVerified: true,
      },
      params: { orgId: 'org-chu-liege' },
    } as unknown as AuthenticatedRequest;

    const mockRes: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const middleware = requireTenantMatch((req) => req.params.orgId);
    middleware(mockReq, mockRes, next);

    expect(nextCalled).toBe(true);
  });

  it('autorise le personnel SFS interne à traverser les organisations', () => {
    const mockReq = {
      user: {
        userId: 'sfs-agent-1',
        email: 'agent@service-du-sang.be',
        organizationId: null,
        roles: [UserRole.RESPONSABLE_QUALITE],
        mfaVerified: true,
      },
      params: { orgId: 'org-chu-liege' },
    } as unknown as AuthenticatedRequest;

    const mockRes: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const middleware = requireTenantMatch((req) => req.params.orgId);
    middleware(mockReq, mockRes, next);

    expect(nextCalled).toBe(true);
  });
});
