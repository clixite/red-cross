import { describe, it, expect } from 'vitest';
import { BloodProductValidator } from '../src/products/isbt-validation.js';

describe('BloodProductValidator (ISBT 128 / Standards Transfusionnels)', () => {
  it('valide des numéros de don conformes aux standards belges et internationaux', () => {
    const validDins = [
      '=A99992412345600',
      'B999924123456',
      'BE999925000001',
      'SFS24-12345678',
    ];

    for (const din of validDins) {
      const res = BloodProductValidator.validateDonationNumber(din);
      expect(res.isValid, `Doit être valide: ${din}`).toBe(true);
    }
  });

  it('rejette les numéros de don mal formés ou trop courts', () => {
    const invalidDins = ['', '123', 'A', 'INVALID#DIN$$'];
    for (const din of invalidDins) {
      const res = BloodProductValidator.validateDonationNumber(din);
      expect(res.isValid).toBe(false);
    }
  });

  it('valide les codes produits et infère le type de produit', () => {
    const res = BloodProductValidator.validate({
      donationNumber: 'BE999925000001',
      productCode: 'E0388V00',
      bloodGroup: 'O+',
      quantity: 2,
      measuredTemperature: 4.5,
    });

    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.productTypeInferred).toBe('CGR');
    expect(res.warnings.length).toBe(0);
  });

  it('génère un avertissement de température hors plage pour un CGR', () => {
    const res = BloodProductValidator.validate({
      donationNumber: 'BE999925000001',
      productCode: 'E0388V00',
      bloodGroup: 'A+',
      quantity: 1,
      measuredTemperature: 12.5, // CGR normal entre +2 et +6°C
    });

    expect(res.isValid).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('hors plage réglementaire');
  });

  it('rejette un groupe sanguin invalide', () => {
    const res = BloodProductValidator.validate({
      donationNumber: 'BE999925000001',
      productCode: 'E0388V00',
      bloodGroup: 'XYZ',
      quantity: 1,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('Groupe sanguin'))).toBe(true);
  });
});
