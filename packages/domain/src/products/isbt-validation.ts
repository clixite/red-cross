import { BloodGroupAboRhD } from '../types/enums.js';

export interface BloodProductValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  productTypeInferred?: 'CGR' | 'PLAQUETTES' | 'PLASMA' | 'AUTRE';
}

export interface BloodProductInput {
  productCode: string;
  donationNumber: string;
  bloodGroup?: string;
  expirationDate?: Date | string;
  quantity?: number;
  measuredTemperature?: number;
}

export const KNOWN_PRODUCT_CODES: Record<string, { label: string; type: 'CGR' | 'PLAQUETTES' | 'PLASMA' | 'AUTRE'; tempMin: number; tempMax: number }> = {
  'E0388V00': { label: 'Concentré de Globules Rouges déleucocyté (CGR)', type: 'CGR', tempMin: 2, tempMax: 6 },
  'E0388': { label: 'Concentré de Globules Rouges (CGR)', type: 'CGR', tempMin: 2, tempMax: 6 },
  'E3845V00': { label: 'Mélange de Concentrés de Plaquettes déleucocyté (MCP)', type: 'PLAQUETTES', tempMin: 20, tempMax: 24 },
  'E3845': { label: 'Concentré de Plaquettes d aphérèse (CPA)', type: 'PLAQUETTES', tempMin: 20, tempMax: 24 },
  'E0799V00': { label: 'Plasma Frais Congelé déleucocyté (PFC)', type: 'PLASMA', tempMin: -40, tempMax: -20 },
  'E0799': { label: 'Plasma Frais Congelé (PFC)', type: 'PLASMA', tempMin: -40, tempMax: -20 },
};

export class BloodProductValidator {
  /**
   * Valide le format du numéro de don ISBT 128 / Eurocode / Standard Belge
   * Exemples valides : =A99992412345600, B999924123456, BE999925000001, SFS24-123456
   */
  public static validateDonationNumber(donationNumber: string): { isValid: boolean; error?: string } {
    if (!donationNumber || typeof donationNumber !== 'string') {
      return { isValid: false, error: 'Le numéro de don / d unité est obligatoire.' };
    }

    const cleaned = donationNumber.trim().toUpperCase();

    // Doit faire entre 8 et 22 caractères alphanumériques (peut inclure tirets, slashes ou signe =)
    const isbtRegex = /^(=?[A-Z0-9][A-Z0-9\-\/]{6,20}[A-Z0-9])$/;
    if (!isbtRegex.test(cleaned)) {
      return {
        isValid: false,
        error: `Le numéro de don '${donationNumber}' ne respecte pas le format réglementaire (ex: =A99992512345600 ou BE999925000001).`,
      };
    }

    return { isValid: true };
  }

  /**
   * Valide le code produit (ISBT 128 Product Code ou code national)
   */
  public static validateProductCode(productCode: string): { isValid: boolean; error?: string } {
    if (!productCode || typeof productCode !== 'string') {
      return { isValid: false, error: 'Le code produit est obligatoire pour un produit sanguin labile.' };
    }

    const cleaned = productCode.trim().toUpperCase();
    const productRegex = /^[EBP][0-9A-Z]{3,8}$/;
    if (!productRegex.test(cleaned)) {
      return {
        isValid: false,
        error: `Le code produit '${productCode}' est invalide. Il doit commencer par une lettre (E, B, P) suivie de 3 à 8 caractères alphanumériques.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Valide le groupe sanguin ABO-RhD
   */
  public static validateBloodGroup(group: string): { isValid: boolean; error?: string } {
    const validGroups = Object.values(BloodGroupAboRhD) as string[];
    if (!validGroups.includes(group)) {
      return {
        isValid: false,
        error: `Groupe sanguin '${group}' non reconnu. Valeurs autorisées: ${validGroups.join(', ')}.`,
      };
    }
    return { isValid: true };
  }

  /**
   * Validation complète d'un produit concerné
   */
  public static validate(input: BloodProductInput): BloodProductValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const donVal = this.validateDonationNumber(input.donationNumber);
    if (!donVal.isValid && donVal.error) errors.push(donVal.error);

    const prodVal = this.validateProductCode(input.productCode);
    if (!prodVal.isValid && prodVal.error) errors.push(prodVal.error);

    if (input.bloodGroup) {
      const bgVal = this.validateBloodGroup(input.bloodGroup);
      if (!bgVal.isValid && bgVal.error) errors.push(bgVal.error);
    }

    if (input.quantity !== undefined && (input.quantity <= 0 || !Number.isInteger(input.quantity))) {
      errors.push('La quantité de poches doit être un entier positif supérieur à 0.');
    }

    // Analyse du code produit connu et vérification des températures
    const cleanCode = input.productCode ? input.productCode.trim().toUpperCase() : '';
    const known = KNOWN_PRODUCT_CODES[cleanCode];
    const inferredType = known ? known.type : 'AUTRE';

    if (input.measuredTemperature !== undefined && input.measuredTemperature !== null) {
      const temp = input.measuredTemperature;
      if (known) {
        if (temp < known.tempMin || temp > known.tempMax) {
          warnings.push(
            `Température mesurée (${temp}°C) hors plage réglementaire recommandée [${known.tempMin}°C, ${known.tempMax}°C] pour un ${known.label}.`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      productTypeInferred: inferredType,
    };
  }
}
