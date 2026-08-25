import { describe, it, expect, vi } from 'vitest';
import { NotificationService } from '../src/notifications/notification.service.js';
import { SupportedLanguage } from '@sfs/domain';
import { prisma } from '../src/db/prisma.js';

describe('NotificationService (Notifications E-mail Multilingues FR/NL/EN)', () => {
  it('formate correctement les notifications en français, néerlandais et anglais', async () => {
    // Espionner prisma.notificationLog.create
    const spy = vi.spyOn(prisma.notificationLog, 'create').mockResolvedValue({} as any);

    // 1. Français
    await NotificationService.send({
      recipientEmail: 'declarant@chu-liege.be',
      recipientName: 'Dr. Martin',
      language: SupportedLanguage.FR,
      type: 'COMPLAINT_RECEIVED_ACK',
      data: { portalNumber: 'SFS-2025-00001', slaReceivabilityDate: '2 jours ouvrés' },
    });

    expect(spy).toHaveBeenCalled();
    const callFr = spy.mock.calls[0][0];
    expect(callFr.data.subject).toContain('[Service du Sang] Accusé de réception');
    expect(callFr.data.language).toBe('fr');

    // 2. Néerlandais
    await NotificationService.send({
      recipientEmail: 'declarant@uz-gent.be',
      recipientName: 'Dr. Peeters',
      language: SupportedLanguage.NL,
      type: 'COMPLAINT_RECEIVED_ACK',
      data: { portalNumber: 'SFS-2025-00002' },
    });

    const callNl = spy.mock.calls[1][0];
    expect(callNl.data.subject).toContain('[Bloeddienst] Ontvangstbevestiging');
    expect(callNl.data.language).toBe('nl');

    // 3. Anglais
    await NotificationService.send({
      recipientEmail: 'contact@euro-lab.com',
      recipientName: 'Dr. Smith',
      language: SupportedLanguage.EN,
      type: 'COMPLAINT_RECEIVED_ACK',
      data: { portalNumber: 'SFS-2025-00003' },
    });

    const callEn = spy.mock.calls[2][0];
    expect(callEn.data.subject).toContain('[Blood Service] Acknowledgment');
    expect(callEn.data.language).toBe('en');

    spy.mockRestore();
  });
});
