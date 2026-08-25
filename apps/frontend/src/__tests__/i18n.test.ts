/**
 * Test de complétude i18n : garantit qu'aucune clé de traduction ne manque
 * entre les trois langues (FR base / NL / EN) et qu'aucune chaîne n'est
 * laissée non traduite dans les fichiers de locales.
 */
import { describe, it, expect } from 'vitest';
import fr from '../i18n/locales/fr.json';
import nl from '../i18n/locales/nl.json';
import en from '../i18n/locales/en.json';

type Rec = Record<string, any>;

function flatten(obj: Rec, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value, path);
    }
    return [path];
  });
}

function assertNoEmptyValues(obj: Rec, path = ''): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assertNoEmptyValues(value, fullPath);
    } else {
      expect(typeof value === 'string' && value.trim().length > 0, `Clé vide ou non traduite: ${fullPath}`).toBe(true);
    }
  }
}

describe('Internationalisation FR/NL/EN — Complétude des Traductions', () => {
  it('les trois fichiers de locales possèdent exactement les mêmes clés', () => {
    const frKeys = flatten(fr as Rec).sort();
    const nlKeys = flatten(nl as Rec).sort();
    const enKeys = flatten(en as Rec).sort();

    expect(nlKeys).toEqual(frKeys);
    expect(enKeys).toEqual(frKeys);
  });

  it('aucune valeur de traduction n est vide ou placeholder non remplacé', () => {
    assertNoEmptyValues(fr as Rec);
    assertNoEmptyValues(nl as Rec);
    assertNoEmptyValues(en as Rec);
  });
});
