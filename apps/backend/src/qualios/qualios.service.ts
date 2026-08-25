import { IQualiosPort } from './qualios.port.js';
import { QualiosRestAdapter } from './adapters/rest.adapter.js';
import { QualiosFileAdapter } from './adapters/file.adapter.js';
import { QualiosManualAdapter } from './adapters/manual.adapter.js';
import { config } from '../config.js';

export class QualiosService {
  private static instance: IQualiosPort;

  public static getAdapter(): IQualiosPort {
    if (!this.instance) {
      const adapterType = config.qualios.adapter;
      switch (adapterType) {
        case 'rest':
          this.instance = new QualiosRestAdapter();
          break;
        case 'file':
          this.instance = new QualiosFileAdapter();
          break;
        case 'manual':
        default:
          this.instance = new QualiosManualAdapter();
          break;
      }
      console.log(`[QUALIOS_SERVICE] Adaptateur actif : '${this.instance.adapterName}'`);
    }
    return this.instance;
  }
}
