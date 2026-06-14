type PagesContext = {
  request: Request;
  env: Record<string, string | undefined>;
};

type QuotePayload = {
  projectType: string;
  finishPreference: string;
  squareFeet?: string;
  surfaceCondition?: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  timeline?: string;
  message: string;
  photoLinks?: string;
  companyWebsite?: string;
  'cf-turnstile-response'?: string;
};

const json = (body: Record<string, unknown>, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });

const clean = (value: unknown, max = 500) =>
  String(value ?? '')
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const requiredFields: Array<keyof QuotePayload> = [
  'projectType',
  'finishPreference',
  'name',
  'phone',
  'email',
  'location',
  'message',
];

const normalizePayload = (raw: Record<string, unknown>): QuotePayload => ({
  projectType: clean(raw.projectType, 120),
  finishPreference: clean(raw.finishPreference, 120),
  squareFeet: clean(raw.squareFeet, 40),
  surfaceCondition: clean(raw.surfaceCondition, 160),
  name: clean(raw.name, 120),
  phone: clean(raw.phone, 60),
  email: clean(raw.email, 160).toLowerCase(),
  location: clean(raw.location, 180),
  timeline: clean(raw.timeline, 120),
  message: clean(raw.message, 1600),
  photoLinks: clean(raw.photoLinks, 600),
  companyWebsite: clean(raw.companyWebsite, 200),
  'cf-turnstile-response': clean(raw['cf-turnstile-response'], 2000),
});

const validateTurnstile = async (secret: string, token: string, request: Request) => {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) formData.append('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });
  const result = (await response.json()) as { success?: boolean };
  return Boolean(result.success);
};

const buildEmail = (payload: QuotePayload) => {
  const rows = [
    ['Name', payload.name],
    ['Phone', payload.phone],
    ['Email', payload.email],
    ['Location', payload.location],
    ['Project type', payload.projectType],
    ['Finish preference', payload.finishPreference],
    ['Approx. square feet', payload.squareFeet || 'Not provided'],
    ['Surface condition', payload.surfaceCondition || 'Not provided'],
    ['Timeline', payload.timeline || 'Not provided'],
    ['Photo links', payload.photoLinks || 'Not provided'],
    ['Message', payload.message],
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <th style="padding:12px 14px;text-align:left;color:#a8b0bf;border-bottom:1px solid #223047;width:190px;">${escapeHtml(label)}</th>
          <td style="padding:12px 14px;color:#f5f7fb;border-bottom:1px solid #223047;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="margin:0;padding:28px;background:#05070a;color:#f5f7fb;font-family:Arial,sans-serif;">
      <div style="max-width:720px;margin:0 auto;border:1px solid #223047;border-radius:24px;overflow:hidden;background:#0c1118;">
        <div style="padding:28px;background:linear-gradient(135deg,#0b54ff,#0c1118 62%);">
          <div style="font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#c7ced9;">PRVN Epoxy Solutions</div>
          <h1 style="margin:10px 0 0;font-size:30px;line-height:1.1;color:#fff;">New quote request</h1>
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
          ${htmlRows}
        </table>
        <div style="padding:18px 28px;color:#a8b0bf;font-size:13px;">Sent from the PRVN Epoxy Solutions website quote wizard.</div>
      </div>
    </div>`;

  return { text, html };
};

export async function onRequestPost(context: PagesContext) {
  let raw: Record<string, unknown>;

  try {
    raw = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const payload = normalizePayload(raw);

  if (payload.companyWebsite) {
    return json({ ok: true });
  }

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    return json({ ok: false, message: `Missing required field: ${missing[0]}.` }, { status: 400 });
  }

  if (!isEmail(payload.email)) {
    return json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
  }

  if (context.env.TURNSTILE_SECRET_KEY) {
    const token = payload['cf-turnstile-response'];
    if (!token || !(await validateTurnstile(context.env.TURNSTILE_SECRET_KEY, token, context.request))) {
      return json({ ok: false, message: 'Security check failed. Refresh and try again.' }, { status: 400 });
    }
  }

  const apiKey = context.env.RESEND_API_KEY;
  const to = context.env.QUOTE_TO_EMAIL || 'PRVNEPOXY@OUTLOOK.COM';
  const from = context.env.QUOTE_FROM_EMAIL;

  if (!apiKey || !from) {
    return json(
      {
        ok: false,
        message: 'Email delivery is not configured yet. Add RESEND_API_KEY and QUOTE_FROM_EMAIL in Cloudflare Pages.',
      },
      { status: 503 }
    );
  }

  const email = buildEmail(payload);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: payload.email,
      subject: `PRVN quote request: ${payload.projectType} - ${payload.finishPreference}`,
      html: email.html,
      text: email.text,
    }),
  });

  if (!response.ok) {
    return json(
      { ok: false, message: 'Email provider rejected the request. Check Resend sender/domain settings.' },
      { status: 502 }
    );
  }

  return json({ ok: true });
}

export async function onRequestOptions() {
  return json({ ok: true });
}
