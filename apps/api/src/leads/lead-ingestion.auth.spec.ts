import { ingestionSecretsMatch } from './lead-ingestion.auth';

describe('Phase 2A lead ingestion auth', () => {
  it('accepts matching secrets via timing-safe compare', () => {
    expect(ingestionSecretsMatch('secret-value', 'secret-value')).toBe(true);
  });

  it('rejects mismatched secrets and length differences', () => {
    expect(ingestionSecretsMatch('secret-value', 'other-secret')).toBe(false);
    expect(ingestionSecretsMatch('short', 'longer-secret')).toBe(false);
    expect(ingestionSecretsMatch('', 'secret')).toBe(false);
  });
});
