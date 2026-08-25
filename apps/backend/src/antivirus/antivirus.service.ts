export interface AntivirusScanResult {
  isClean: boolean;
  threatName?: string;
  details?: string;
}

export class AntivirusService {
  // Signature standard de test EICAR
  private static EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

  // Extensions interdites par politique de sécurité
  private static FORBIDDEN_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'sh', 'vbs', 'js', 'jar', 'msi', 'com', 'scr', 'ps1', 'dll', 'pif',
  ];

  public static async scanBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<AntivirusScanResult> {
    const ext = (fileName.split('.').pop() || '').toLowerCase();

    // 1. Contrôle d'extension
    if (this.FORBIDDEN_EXTENSIONS.includes(ext)) {
      return {
        isClean: false,
        threatName: 'BLOCKED_EXTENSION',
        details: `L extension de fichier .${ext} est strictement interdite pour des raisons de sécurité.`,
      };
    }

    // 2. Contrôle de taille maximale (ex: 25 Mo)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return {
        isClean: false,
        threatName: 'MAX_SIZE_EXCEEDED',
        details: 'Le fichier dépasse la taille maximale autorisée (25 Mo).',
      };
    }

    // 3. Détection de signature de test EICAR ou chaîne suspecte
    const contentString = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
    if (contentString.includes(this.EICAR_SIGNATURE)) {
      return {
        isClean: false,
        threatName: 'EICAR_TEST_VIRUS_DETECTED',
        details: 'Signature virale EICAR détectée dans la pièce jointe.',
      };
    }

    // En environnement simulé / normal
    return {
      isClean: true,
    };
  }
}
