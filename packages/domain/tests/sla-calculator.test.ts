import { describe, it, expect } from 'vitest';
import { SlaCalculator } from '../src/sla/sla-calculator.js';

describe('SlaCalculator (Délais, Jours Ouvrés Belges & Suspensions)', () => {
  it('reconnaît les jours fériés légaux belges fixes et mobiles', () => {
    // 1er mai (Fête du travail)
    expect(SlaCalculator.isBelgianHoliday(new Date('2025-05-01T00:00:00Z'))).toBe(true);
    // 21 juillet (Fête nationale)
    expect(SlaCalculator.isBelgianHoliday(new Date('2025-07-21T00:00:00Z'))).toBe(true);
    // 25 décembre (Noël)
    expect(SlaCalculator.isBelgianHoliday(new Date('2025-12-25T00:00:00Z'))).toBe(true);

    // Lundi de Pâques 2025 (Pâques = 20 avril 2025 -> Lundi = 21 avril 2025)
    expect(SlaCalculator.isBelgianHoliday(new Date('2025-04-21T00:00:00Z'))).toBe(true);
    // Jeudi de l Ascension 2025 (29 mai 2025)
    expect(SlaCalculator.isBelgianHoliday(new Date('2025-05-29T00:00:00Z'))).toBe(true);
  });

  it('calcule correctement les cibles de recevabilité (2 jours ouvrés) et réponse finale (30 jours calendrier)', () => {
    // Déclaration le vendredi 2 mai 2025 (après le 1er mai férié)
    const decDate = new Date('2025-05-02T10:00:00Z'); // Vendredi
    const targets = SlaCalculator.calculateInitialTargets(decDate, 2, 30);

    // 2 jours ouvrés après vendredi 2 mai = lundi 5 mai (J+1 ouvré), mardi 6 mai (J+2 ouvré)
    expect(targets.targetReceivabilityDate.getUTCDate()).toBe(6);
    expect(targets.targetReceivabilityDate.getUTCMonth()).toBe(4); // Mai (0-indexed: 4)

    // 30 jours calendrier après 2 mai = 1er juin 2025
    expect(targets.targetFinalResponseDate.getUTCDate()).toBe(1);
    expect(targets.targetFinalResponseDate.getUTCMonth()).toBe(5); // Juin (0-indexed: 5)
  });

  it('prolonge la date cible finale lors d une suspension pour complément d information', () => {
    const initialTarget = new Date('2025-06-01T10:00:00Z');
    const suspendedAt = new Date('2025-05-10T08:00:00Z');
    const resumedAt = new Date('2025-05-13T08:00:00Z'); // 3 jours (72h) de suspension

    const result = SlaCalculator.adjustFinalResponseDate(initialTarget, suspendedAt, resumedAt);
    expect(result.addedSuspensionHours).toBe(72);
    expect(result.updatedTarget.getUTCDate()).toBe(4); // 1er juin + 3 jours = 4 juin
  });

  it('évalue le respect des SLA avec jours restants et dépassements', () => {
    const now = new Date('2025-06-01T00:00:00Z');
    const future = new Date('2025-06-15T00:00:00Z');
    const past = new Date('2025-05-20T00:00:00Z');

    const ok = SlaCalculator.evaluateSlaStatus({
      declarationDate: new Date('2025-05-01T00:00:00Z'),
      targetReceivabilityDate: future,
      targetFinalResponseDate: future,
      currentDate: now,
    });
    expect(ok.isReceivabilityOverdue).toBe(false);
    expect(ok.isFinalResponseOverdue).toBe(false);
    expect(ok.receivabilityRemainingHours).toBeGreaterThan(0);

    const overdue = SlaCalculator.evaluateSlaStatus({
      declarationDate: new Date('2025-04-01T00:00:00Z'),
      targetReceivabilityDate: past,
      targetFinalResponseDate: past,
      isClosed: false,
      currentDate: now,
    });
    expect(overdue.isReceivabilityOverdue).toBe(true);
    expect(overdue.isFinalResponseOverdue).toBe(true);

    // Pas de dépassement imputé pendant une suspension
    const suspended = SlaCalculator.evaluateSlaStatus({
      declarationDate: new Date('2025-04-01T00:00:00Z'),
      targetFinalResponseDate: past,
      isClosed: false,
      suspendedAt: new Date('2025-05-25T00:00:00Z'),
      currentDate: now,
    });
    expect(suspended.isSuspended).toBe(true);
    expect(suspended.isFinalResponseOverdue).toBe(false);
  });

  it('ne compte pas les samedis et dimanches comme jours ouvrés', () => {
    // Samedi 3 mai 2025 et dimanche 4 mai 2025
    expect(SlaCalculator.isBusinessDay(new Date('2025-05-03T00:00:00Z'))).toBe(false);
    expect(SlaCalculator.isBusinessDay(new Date('2025-05-04T00:00:00Z'))).toBe(false);
    // Vendredi 2 mai 2025 est ouvré
    expect(SlaCalculator.isBusinessDay(new Date('2025-05-02T00:00:00Z'))).toBe(true);
  });
});
