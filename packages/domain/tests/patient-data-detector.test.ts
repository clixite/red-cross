import { describe, it, expect } from 'vitest';
import { PatientDataDetector } from '../src/privacy/patient-data-detector.js';

describe('PatientDataDetector (RGPD & Détection Données de Santé)', () => {
  it('identifie un numéro de registre national belge NISS valide (modulo 97)', () => {
    // Calcul d'un NISS fictif valide pre-2000 : 850412123 -> modulo 97 -> checksum
    const base = 850412123;
    const check = 97 - (base % 97);
    const checkStr = check.toString().padStart(2, '0');
    const validNiss = `85.04.12-123.${checkStr}`;

    expect(PatientDataDetector.isValidBelgianNISS(validNiss)).toBe(true);

    const scanResult = PatientDataDetector.scan(`Le patient porte le NISS ${validNiss} et a reçu la poche.`);
    expect(scanResult.hasPatientData).toBe(true);
    expect(scanResult.blockReason).toBeDefined();
  });

  it('ne bloque pas pour des suites de chiffres ordinaires qui ne sont pas un NISS', () => {
    const text = 'Poche numéro BE999925000001 livrée le 14/05/2025 à 14h30. Température relevée: 5.4°C.';
    const scanResult = PatientDataDetector.scan(text);
    expect(scanResult.hasPatientData).toBe(false);
  });

  it('bloque lors de la détection de mentions explicites de date de naissance de patient', () => {
    const text = 'Incident lors de la transfusion : patient né le 12/05/1974 avec choc frisson.';
    const scanResult = PatientDataDetector.scan(text);
    expect(scanResult.hasPatientData).toBe(true);
    expect(scanResult.detectedPatterns.some((p) => p.includes('Date de naissance'))).toBe(true);
  });

  it('bloque lors de la détection d un identifiant de dossier hospitalier (IPP / NIP / DPI)', () => {
    const text = 'Vérification du dossier IPP: 849204 suite à réclamation.';
    const scanResult = PatientDataDetector.scan(text);
    expect(scanResult.hasPatientData).toBe(true);
    expect(scanResult.detectedPatterns.some((p) => p.includes('IPP/NIP/DPI'))).toBe(true);
  });
});
