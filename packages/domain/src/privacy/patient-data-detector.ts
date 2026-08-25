export interface PatientDataDetectionResult {
  hasPatientData: boolean;
  detectedPatterns: string[];
  blockReason?: string;
}

export class PatientDataDetector {
  /**
   * Vérifie la validité d'un numéro de registre national belge (NISS/INSZ) via la règle Modulo 97
   */
  public static isValidBelgianNISS(rawInput: string): boolean {
    const cleaned = rawInput.replace(/[^0-9]/g, '');
    if (cleaned.length !== 11) return false;

    const baseNumberStr = cleaned.slice(0, 9);
    const checkDigits = parseInt(cleaned.slice(9, 11), 10);
    const baseNumber = parseInt(baseNumberStr, 10);

    // Cas 1 : Personne née avant 2000
    const expectedCheckPre2000 = 97 - (baseNumber % 97);
    if (expectedCheckPre2000 === checkDigits) return true;

    // Cas 2 : Personne née en 2000 ou après (on ajoute le préfixe 2)
    const baseNumberPost2000 = parseInt('2' + baseNumberStr, 10);
    const expectedCheckPost2000 = 97 - (baseNumberPost2000 % 97);
    if (expectedCheckPost2000 === checkDigits) return true;

    return false;
  }

  /**
   * Analyse un texte libre pour détecter des motifs de données de santé ou identifiants patients
   */
  public static scan(text: string | null | undefined): PatientDataDetectionResult {
    if (!text || typeof text !== 'string') {
      return { hasPatientData: false, detectedPatterns: [] };
    }

    const detectedPatterns: string[] = [];

    // 1. Recherche de numéro national belge NISS (ex: 85.04.12-123.45 ou 85041212345)
    const nissRegex = /\b(\d{2}[.\s]?\d{2}[.\s]?\d{2}[-\s]?\d{3}[.\s]?\d{2})\b/g;
    let match: RegExpExecArray | null;
    while ((match = nissRegex.exec(text)) !== null) {
      const candidate = match[1];
      if (this.isValidBelgianNISS(candidate)) {
        detectedPatterns.push(`Numéro de Registre National Belge (NISS/INSZ) détecté : [MASQUÉ]`);
      }
    }

    // 2. Recherche de mentions explicites de date de naissance de patient
    const dobRegex = /\b(né(?:e)?\s+le|date\s+de\s+naissance\s*:?|geboren\s+op|born\s+on)\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/i;
    if (dobRegex.test(text)) {
      detectedPatterns.push('Date de naissance de patient explicite détectée');
    }

    // 3. Recherche de numéro de dossier patient hospitalier (IPP, NIP, DPI)
    const hospitalIdRegex = /\b(IPP|NIP|DPI|dossier\s+patient|patient\s+id)\s*[:#=\s]\s*([A-Z0-9-]{4,12})\b/i;
    if (hospitalIdRegex.test(text)) {
      detectedPatterns.push('Identifiant de dossier patient hospitalier (IPP/NIP/DPI) détecté');
    }

    // 4. Recherche de mention explicite de nom de patient
    const patientNameRegex = /\b(patient\s*:\s*[A-Z][a-z]+\s+[A-Z][a-z]+|nom\s+du\s+patient\s*:|patiënt\s*:)\b/i;
    if (patientNameRegex.test(text)) {
      detectedPatterns.push('Mention nominative de patient détectée');
    }

    const hasPatientData = detectedPatterns.length > 0;

    return {
      hasPatientData,
      detectedPatterns,
      blockReason: hasPatientData
        ? `[ALERTE RGPD / DONNÉES DE SANTÉ] Le texte saisi semble contenir des informations identifiant un patient (${detectedPatterns.join(', ')}). Conformément à la réglementation et aux règles de confidentialité du Service du Sang, n inscrivez aucune donnée patient nominative.`
        : undefined,
    };
  }
}
