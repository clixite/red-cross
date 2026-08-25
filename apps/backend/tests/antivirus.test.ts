import { describe, it, expect } from 'vitest';
import { AntivirusService } from '../src/antivirus/antivirus.service.js';

describe('AntivirusService (Pipeline & Sécurité des Uploads)', () => {
  it('accepte un fichier PDF sain et propre', async () => {
    const cleanBuffer = Buffer.from('%PDF-1.4 ... rapport qualité transfusionnelle ...');
    const result = await AntivirusService.scanBuffer(cleanBuffer, 'releve_temperature.pdf', 'application/pdf');

    expect(result.isClean).toBe(true);
    expect(result.threatName).toBeUndefined();
  });

  it('bloque strictement une extension exécutable ou script interdite', async () => {
    const dangerousBuffer = Buffer.from('echo malicious script');
    const result = await AntivirusService.scanBuffer(dangerousBuffer, 'malware.exe', 'application/x-msdownload');

    expect(result.isClean).toBe(false);
    expect(result.threatName).toBe('BLOCKED_EXTENSION');
  });

  it('détecte et met en échec la signature de test standard EICAR', async () => {
    const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const eicarBuffer = Buffer.from(eicarString);
    const result = await AntivirusService.scanBuffer(eicarBuffer, 'test_eicar.txt', 'text/plain');

    expect(result.isClean).toBe(false);
    expect(result.threatName).toBe('EICAR_TEST_VIRUS_DETECTED');
  });
});
