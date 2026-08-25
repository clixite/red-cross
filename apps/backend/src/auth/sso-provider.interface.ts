import { UserRole, SupportedLanguage } from '@sfs/domain';

export interface SsoUserProfile {
  externalSubjectId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationBusinessNumber?: string;
  roles?: UserRole[];
  language?: SupportedLanguage;
}

export interface ISsoAuthProvider {
  providerName: 'OIDC' | 'SAML_2_0' | 'MOCK_HOSPITAL_SSO';
  getAuthorizationUrl(state: string, redirectUri: string): Promise<string>;
  handleCallback(codeOrSAMLResponse: string): Promise<SsoUserProfile>;
}

export class MockHospitalSsoProvider implements ISsoAuthProvider {
  providerName = 'MOCK_HOSPITAL_SSO' as const;

  async getAuthorizationUrl(state: string, redirectUri: string): Promise<string> {
    return `${redirectUri}?state=${state}&mock_sso_code=mock_hospital_auth_code_12345`;
  }

  async handleCallback(_code: string): Promise<SsoUserProfile> {
    return {
      externalSubjectId: 'hosp-user-7788',
      email: 'dr.dupont@chu-wallonie-demo.be',
      firstName: 'Alain',
      lastName: 'Dupont',
      organizationBusinessNumber: 'BE 0422.333.444',
      roles: [UserRole.REFERENT_QUALITE],
      language: SupportedLanguage.FR,
    };
  }
}
