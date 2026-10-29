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

    // Required fields check
    if (!data.name || !data.email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers,
      });
    }

    const resendApiKey = env.RESEND_API_KEY || 're_VbtwkioN_6ffuTywdZqYJrGxFXqu12mgD';
    const recipient = env.CONTACT_RECIPIENT || 'connect@integratedretail.com';
    const fromAddress = env.FROM_EMAIL || 'Integrated Retail <website@integratedretail.com>';

    const subject = `New Website Inquiry: ${data.name} (${data.interest || 'Consultation'})`;
    
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #002b49; padding: 20px 24px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">New Consultation Request</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Submitted via integratedretail.com</p>
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

    // Try primary send (to designated recipient)
    let resendRes = await sendResend(resendApiKey, {
      from: fromAddress,
      to: [recipient],
      reply_to: data.email,
      subject,
      html,
    });

    if (!resendRes.ok) {
      const errData = await resendRes.json().catch(() => ({}));
      console.warn('Primary recipient send failed:', errData);

      // Fallback: Resend sandbox allows sending from onboarding@resend.dev to the account owner
      const fallbackRes = await sendResend(resendApiKey, {
        from: 'Integrated Retail Website <onboarding@resend.dev>',
        to: ['yithanglee@gmail.com'],
        reply_to: data.email,
        subject: `[Lead Notification] ${subject}`,
        html: `<div style="background:#fee2e2;border:1px solid #ef4444;color:#991b1b;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;">
          <strong>Notice:</strong> The primary domain (${fromAddress}) is not yet verified on Resend. This lead was automatically routed to the registered admin email so no leads are lost.
        </div>` + html,
      });

      if (fallbackRes.ok) {
        return new Response(JSON.stringify({ success: true, mode: 'fallback' }), {
          status: 200,
          headers,
        });
      }

      return new Response(JSON.stringify({ error: errData.message || 'Email delivery failed' }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
