import { getResendClient, FROM_ADDRESS } from './client'

// ─── HTML wrapper ────────────────────────────────────────────────────────────

function html(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" align="center"
        style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;
               border:1px solid #e5e7eb;overflow:hidden;">

        <tr>
          <td style="background:#1d4ed8;padding:20px 32px;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;
                      letter-spacing:-0.3px;">Front Door</p>
            <p style="margin:3px 0 0;font-size:12px;color:#93c5fd;">
              UK property verification
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>

        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Front Door &middot; UK Property Verification
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">
              You&rsquo;re receiving this because you have a Front Door account.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function cta(href: string, label: string): string {
  return `<a href="${href}"
    style="display:inline-block;background:#1d4ed8;color:#ffffff;font-weight:bold;
           text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;
           margin-top:20px;">
    ${label} &rarr;
  </a>`
}

// Minimal HTML escaping for user-supplied strings inserted into email bodies
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const P = (text: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#374151;">${text}</p>`

const STRONG = (text: string) =>
  `<strong style="color:#111827;">${esc(text)}</strong>`

// ─── 1. New lead in area ─────────────────────────────────────────────────────

export async function sendNewLeadInAreaEmail({
  agentEmail,
  agentName,
  buyerArea,
  buyerRole,
  score,
  appUrl,
}: {
  agentEmail: string
  agentName: string
  buyerArea: string
  buyerRole: 'buyer' | 'renter'
  score: number
  appUrl: string
}) {
  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: agentEmail,
      subject: `New verified ${buyerRole} in your area — Front Door`,
      html: html(`
        ${P(`Hi ${STRONG(agentName)},`)}
        ${P(`A new verified <strong>${buyerRole}</strong> is actively looking in
             ${STRONG(buyerArea)}.`)}

        <table cellpadding="0" cellspacing="0"
          style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;
                 padding:16px 20px;margin:0 0 16px;">
          <tr>
            <td>
              <p style="margin:0;font-size:28px;font-weight:bold;color:#1d4ed8;">
                ${score}<span style="font-size:16px;color:#93c5fd;"> / 100</span>
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Intent score</p>
            </td>
          </tr>
        </table>

        ${P(`Log in to view their anonymised profile. Unlock their contact details
             when you&rsquo;re ready to reach out.`)}

        ${cta(`${appUrl}/agent/dashboard`, 'View lead on dashboard')}
      `),
    })
  } catch (err) {
    console.error('[email] sendNewLeadInAreaEmail failed:', err)
  }
}

// ─── 2. Knock alert ──────────────────────────────────────────────────────────

export async function sendKnockAlertEmail({
  agentEmail,
  agentName,
  buyerRole,
  buyerScore,
  propertyAddress,
  propertyPostcode,
  appUrl,
}: {
  agentEmail: string
  agentName: string
  buyerRole: 'buyer' | 'renter'
  buyerScore: number
  propertyAddress: string
  propertyPostcode: string
  appUrl: string
}) {
  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: agentEmail,
      subject: 'New viewing request — respond within 2 hours — Front Door',
      html: html(`
        ${P(`Hi ${STRONG(agentName)},`)}
        ${P(`A verified ${buyerRole} (score: <strong>${buyerScore}/100</strong>) has
             requested a viewing at:`)}

        <table cellpadding="0" cellspacing="0"
          style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
                 padding:16px 20px;margin:0 0 16px;width:100%;">
          <tr>
            <td>
              <p style="margin:0;font-size:15px;font-weight:bold;color:#111827;">
                ${esc(propertyAddress)}
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
                ${esc(propertyPostcode)}
              </p>
            </td>
          </tr>
        </table>

        <table cellpadding="0" cellspacing="0"
          style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;
                 padding:12px 16px;margin:0 0 4px;">
          <tr>
            <td style="font-size:14px;color:#92400e;font-weight:bold;">
              &#9200; You have 2 hours to confirm this viewing request.
            </td>
          </tr>
        </table>

        ${P(`If you don&rsquo;t respond in time, the request will expire automatically.`)}

        ${cta(`${appUrl}/agent/dashboard`, 'Confirm viewing on dashboard')}
      `),
    })
  } catch (err) {
    console.error('[email] sendKnockAlertEmail failed:', err)
  }
}

// ─── 3. Viewing outcome request ───────────────────────────────────────────────

export async function sendViewingOutcomeRequestEmail({
  recipientEmail,
  recipientName,
  propertyAddress,
  role,
  appUrl,
}: {
  recipientEmail: string
  recipientName: string
  propertyAddress: string
  role: 'buyer' | 'renter' | 'agent'
  appUrl: string
}) {
  const dashboardPath = role === 'agent' ? '/agent/dashboard' : '/buyer/dashboard'
  const intro =
    role === 'agent'
      ? `Please confirm the outcome of the viewing at ${STRONG(propertyAddress)}.`
      : `We&rsquo;d love to know how the viewing went at ${STRONG(propertyAddress)}.`

  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: 'How did the viewing go? — Front Door',
      html: html(`
        ${P(`Hi ${STRONG(recipientName)},`)}
        ${P(intro)}
        ${P(`Log in to record the outcome. It only takes a second — just pick one of three options.`)}

        <ul style="padding-left:20px;margin:0 0 16px;color:#374151;font-size:14px;
                   line-height:1.8;">
          <li>Viewing booked</li>
          <li>Viewing booked and attended</li>
          <li>No further action</li>
        </ul>

        ${P(`Your response helps keep the Front Door record accurate and may update the
             buyer&rsquo;s intent score.`)}

        ${cta(`${appUrl}${dashboardPath}`, 'Record outcome')}
      `),
    })
  } catch (err) {
    console.error('[email] sendViewingOutcomeRequestEmail failed:', err)
  }
}
