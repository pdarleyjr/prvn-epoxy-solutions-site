import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequestPost } from '../../functions/api/quote';

const validPayload = {
  projectType: 'Residential garage',
  finishPreference: 'PRVN Flake System',
  finishStyle: 'Clean',
  name: 'Avery Customer',
  phone: '954-555-0199',
  email: 'avery@example.com',
  location: 'Miami, FL',
};

const post = (payload: Record<string, string>, env: Record<string, string | undefined>) =>
  onRequestPost({
    request: new Request('https://example.test/api/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    }),
    env,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/quote', () => {
  it('delivers a valid quote with blank optional notes and includes the selected style', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await post(
      { ...validPayload, message: '' },
      { RESEND_API_KEY: 'test-key', QUOTE_FROM_EMAIL: 'quotes@example.test' }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('Finish style');
  });

  it.each([
    ['project type', { ...validPayload, projectType: '' }],
    ['finish', { ...validPayload, finishPreference: '' }],
    ['name', { ...validPayload, name: '' }],
    ['phone', { ...validPayload, phone: '' }],
    ['location', { ...validPayload, location: '' }],
    ['email', { ...validPayload, email: 'not-an-email' }],
  ])('rejects invalid %s data without sending email', async (_label, payload) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await post(payload, { RESEND_API_KEY: 'test-key', QUOTE_FROM_EMAIL: 'quotes@example.test' });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts honeypot submissions without attempting delivery', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await post(
      { ...validPayload, companyWebsite: 'https://spam.example' },
      { RESEND_API_KEY: 'test-key', QUOTE_FROM_EMAIL: 'quotes@example.test' }
    );

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing Resend', {}],
    [
      'public Turnstile key without secret',
      { RESEND_API_KEY: 'test-key', QUOTE_FROM_EMAIL: 'quotes@example.test', PUBLIC_TURNSTILE_SITE_KEY: 'site-key' },
    ],
    [
      'Turnstile secret without public key',
      { RESEND_API_KEY: 'test-key', QUOTE_FROM_EMAIL: 'quotes@example.test', TURNSTILE_SECRET_KEY: 'secret' },
    ],
  ])('returns a configuration error when %s', async (_label, env) => {
    const response = await post(validPayload, env);

    expect(response.status).toBe(503);
    expect((await response.json()).ok).toBe(false);
  });

  it('verifies Turnstile before sending when both keys are configured', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await post(
      { ...validPayload, 'cf-turnstile-response': 'valid-token' },
      {
        RESEND_API_KEY: 'test-key',
        QUOTE_FROM_EMAIL: 'quotes@example.test',
        PUBLIC_TURNSTILE_SITE_KEY: 'site-key',
        TURNSTILE_SECRET_KEY: 'secret',
      }
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
