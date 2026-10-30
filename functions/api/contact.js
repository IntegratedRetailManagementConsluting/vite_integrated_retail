export async function onRequestPost({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const data = await request.json();

    // Anti-spam honeypot
    if (data.botcheck || data.website_url) {
      return new Response(JSON.stringify({ success: true, note: 'ignored' }), {
        status: 200,
        headers,
      });
    }

    // Cloudflare Turnstile captcha. Only enforced once TURNSTILE_SECRET_KEY is set
    // in the Cloudflare Pages environment variables.
    if (env.TURNSTILE_SECRET_KEY) {
      let human = false;
      const token = typeof data.cf_turnstile_token === 'string' ? data.cf_turnstile_token : '';
      if (token) {
        try {
          const verifyBody = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
          const ip = request.headers.get('CF-Connecting-IP');
          if (ip) verifyBody.set('remoteip', ip);
          const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: verifyBody,
          });
          const verifyJson = await verifyRes.json();
          human = verifyJson.success === true;
        } catch (e) {
          human = false;
        }
      }
      if (!human) {
        return new Response(JSON.stringify({ error: 'Captcha verification failed. Please refresh the page and try again.' }), {
          status: 403,
          headers,
        });
      }
    }

    // Form ID detection
    const gfFormId = parseInt(data.form_id || env.GF_FORM_ID || '1', 10);

    // Required fields validation
    if (!data.email) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), {
        status: 400,
        headers,
      });
    }
    if (gfFormId !== 100 && !data.name) {
      return new Response(JSON.stringify({ error: 'Name and email are required.' }), {
        status: 400,
        headers,
      });
    }

    const wpOrigin = env.WP_API_ORIGIN || 'https://integratedretail.com';
    const gfKey = env.GF_CONSUMER_KEY || 'ck_e85bf48d0b0695b26a82c0b2f9535853255e5459';
    const gfSecret = env.GF_CONSUMER_SECRET || 'cs_8eed7cce951146dfaccb41945e9f3c26ea33840f';

    let gfSuccess = false;
    let gfEntryId = null;

    // 1. Submit entry into WordPress Gravity Forms database
    try {
      const gfAuth = btoa(`${gfKey}:${gfSecret}`);
      let gfPayload;

      if (gfFormId === 100) {
        // Form 100: Subscribe
        gfPayload = {
          form_id: 100,
          '1': data.name || (data.email ? data.email.split('@')[0] : 'Subscriber'),
          '10': data.email,
          '14': '',
          '17': data.company || '',
        };
      } else if (gfFormId === 91) {
        // Form 91: Cegid White Paper Response
        gfPayload = {
          form_id: 91,
          '3': data.name,
          '5': data.phone || '',
          '6': data.email,
          '7': data.message || data.remarks || 'Requested White Paper: Retail Stores in 2025',
          '8': '',
        };
      } else if (gfFormId === 98) {
        // Form 98: Aug 2025 ID Retail Summit
        gfPayload = {
          form_id: 98,
          '1': data.name,
          '5': data.phone || '',
          '6': data.email,
          '15': data.stores || '',
          '13': data.budget || '',
          '8': data.message || 'Retail Summit RSVP',
          '10': '',
        };
      } else {
        // Form 1 (and general consultation): Contact us / Demo Request
        gfPayload = {
          form_id: gfFormId,
          '1': data.name,
          '10': data.email,
          '16': data.phone || '',
          '8': data.country || '',
          '5': data.interest || '',
          '12': data.stores || '',
          '13': data.industry || '',
          '6': data.message || '',
          '17': '', // Hidden honeypot field
        };
      }

      const gfRes = await fetch(`${wpOrigin}/wp-json/gf/v2/entries`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${gfAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gfPayload),
      });

      if (gfRes.ok) {
        const gfResult = await gfRes.json();
        gfSuccess = true;
        gfEntryId = gfResult.id;
      } else {
        console.warn('Gravity Forms API error:', gfRes.status, await gfRes.text().catch(() => ''));
      }
    } catch (gfErr) {
      console.warn('Gravity Forms fetch failed:', gfErr.message);
    }

    // 2. Email Notification via Resend (high-deliverability direct send)
    const resendApiKey = env.RESEND_API_KEY || 're_VbtwkioN_6ffuTywdZqYJrGxFXqu12mgD';
    const fromAddress = env.FROM_EMAIL || 'Integrated Retail <website@integratedretail.com>';
    
    // Designated team recipients from Gravity Forms notification setup
    const defaultRecipients = [
      'kamal.lahria@integratedretail.com',
      'bikash.kumar@integratedretail.com',
      'somchai.singh@integratedretail.com',
      'sneha.varma@integratedretail.com',
      'anupama.singal@integratedretail.com',
    ];
    const recipients = env.CONTACT_RECIPIENT ? [env.CONTACT_RECIPIENT] : defaultRecipients;

    let subject = `New Website Inquiry: ${data.name || data.email} (${data.interest || 'Consultation'})`;
    let formTitle = 'New Consultation Request';

    if (gfFormId === 100) {
      subject = `[Newsletter] New Subscription: ${data.email}`;
      formTitle = 'New Newsletter Subscription';
    } else if (gfFormId === 91) {
      subject = `[White Paper Request] Cegid Retail 2025: ${data.name} (${data.email})`;
      formTitle = 'Cegid White Paper Request';
    } else if (gfFormId === 98) {
      subject = `[Event RSVP] Indonesia Retail Summit 2025: ${data.name}`;
      formTitle = 'Indonesia Retail Summit 2025 RSVP';
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #002b49; padding: 20px 24px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">${formTitle}</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Submitted via integratedretail.com ${gfEntryId ? `(Gravity Forms #${gfFormId} Entry #${gfEntryId})` : `(Form #${gfFormId})`}</p>
        </div>
        
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; width: 35%; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Full Name</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 500;">${escapeHtml(data.name)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Email Address</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;"><a href="mailto:${escapeHtml(data.email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(data.email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Phone / Contact</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${escapeHtml(data.phone || 'Not provided')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Country</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${escapeHtml(data.country || 'Not specified')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Interested In</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 500;">${escapeHtml(data.interest || 'General')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Number of Stores</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${escapeHtml(data.stores || 'Not specified')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Industry</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${escapeHtml(data.industry || 'Not specified')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Source Form</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">${escapeHtml(data.source || 'Website Form')}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; background: #f1f5f9; padding: 16px; border-left: 4px solid #002b49; border-radius: 4px;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Message:</div>
            <div style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #1e293b;">${escapeHtml(data.message || 'No additional message provided.')}</div>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 12px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          Sent from Integrated Retail Website Contact Endpoint
        </div>
      </div>
    `;

    try {
      const resendRes = await sendResend(resendApiKey, {
        from: fromAddress,
        to: recipients,
        reply_to: data.email,
        subject,
        html,
      });

      if (!resendRes.ok) {
        // Fallback for Resend sandbox (send to owner email if domain not yet verified in Resend)
        await sendResend(resendApiKey, {
          from: 'Integrated Retail Website <onboarding@resend.dev>',
          to: ['yithanglee@gmail.com'],
          reply_to: data.email,
          subject: `[Lead Alert] ${subject}`,
          html: `<div style="background:#fee2e2;border:1px solid #ef4444;color:#991b1b;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;">
            <strong>Notice:</strong> Resend domain verification pending. Routed to registered admin email.
          </div>` + html,
        });
      }
    } catch (resendErr) {
      console.warn('Resend send exception:', resendErr.message);
    }

    return new Response(JSON.stringify({ success: true, gf_entry_id: gfEntryId }), {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function sendResend(apiKey, payload) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
