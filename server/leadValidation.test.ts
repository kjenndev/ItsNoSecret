import { describe, expect, it } from 'vitest';
import {
  normalizeLeadPayload,
  validateLeadPayload,
  type LeadPayload,
} from './leadValidation.ts';

describe('lead input validation and normalization', () => {
  it('normalizes trimmed lead payloads and defaults public submissions', () => {
    const payload: LeadPayload = {
      name: '  Jane Visitor  ',
      email: '  JANE@Example.COM ',
      phone: ' 210-555-0100 ',
      preferredContact: 'EMAIL',
      serviceNeed: ' Computer Repair ',
      message: ' Laptop will not start. ',
    };

    const result = validateLeadPayload(payload, { sourceDefault: 'CONSULTATION_MODAL' });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      name: 'Jane Visitor',
      email: 'jane@example.com',
      phone: '210-555-0100',
      preferredContact: 'EMAIL',
      serviceNeed: 'Computer Repair',
      message: 'Laptop will not start.',
      source: 'CONSULTATION_MODAL',
      status: 'NEW',
      notes: null,
    });
  });

  it('rejects public submissions without a follow-up contact method', () => {
    const result = validateLeadPayload({ name: 'Jane', message: 'Need help' }, { sourceDefault: 'CONSULTATION_MODAL' });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/email or phone/i);
  });

  it('rejects invalid enum values and email addresses', () => {
    const result = validateLeadPayload(
      {
        name: 'Jane',
        email: 'not-an-email',
        message: 'Need help',
        preferredContact: 'FAX',
        status: 'LOST',
      },
      { sourceDefault: 'ADMIN_CREATED' }
    );

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/valid email/i);
  });

  it('can normalize empty optional strings to null for admin updates', () => {
    expect(normalizeLeadPayload({
      name: ' Jane ',
      email: '',
      phone: ' ',
      serviceNeed: '',
      message: ' Followed up ',
      notes: ' ',
    })).toMatchObject({
      name: 'Jane',
      email: null,
      phone: null,
      serviceNeed: null,
      message: 'Followed up',
      notes: null,
    });
  });
});
