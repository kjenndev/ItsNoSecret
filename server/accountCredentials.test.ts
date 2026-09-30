import { describe, expect, it } from 'vitest';
import { validateAccountCredentialsPayload } from './accountCredentials.ts';

describe('account credential update validation', () => {
  it('normalizes profile credentials and accepts matching optional passwords', () => {
    const result = validateAccountCredentialsPayload({
      name: '  Jane Admin  ',
      email: '  JANE.ADMIN@Example.COM ',
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'new-password-123',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.error);
    expect(result.data).toEqual({
      name: 'Jane Admin',
      email: 'jane.admin@example.com',
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    });
  });

  it('rejects credential updates without the current password or with mismatched new passwords', () => {
    expect(validateAccountCredentialsPayload({
      name: 'Jane',
      email: 'jane@example.com',
      newPassword: 'new-password-123',
      confirmNewPassword: 'different-password',
    })).toMatchObject({
      success: false,
      error: 'Current password is required to update account credentials',
    });

    expect(validateAccountCredentialsPayload({
      name: 'Jane',
      email: 'jane@example.com',
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'different-password',
    })).toMatchObject({
      success: false,
      error: 'New passwords do not match',
    });
  });
});

it('rejects oversized credential fields and preserves password whitespace', () => {
 expect(validateAccountCredentialsPayload({email: 'a@b.test', currentPassword: 'old', newPassword: 'x'.repeat(73), confirmNewPassword: 'x'.repeat(73)}).success).toBe(false);
 expect(validateAccountCredentialsPayload({email: 'a@b.test', name: 'n'.repeat(201), currentPassword: 'old'}).success).toBe(false);
 expect(validateAccountCredentialsPayload({email: 'a@b.test', currentPassword: ' old ', newPassword: ' new-password ', confirmNewPassword: ' new-password '})).toMatchObject({success: true, data: {currentPassword: ' old ', newPassword: ' new-password '}});
});
