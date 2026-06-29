import { Resend } from 'resend'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
const envLines = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8').split('\n')
const env: Record<string, string> = {}
for (const line of envLines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const apiKey = env['RESEND_API_KEY']
const from   = env['RESEND_FROM_EMAIL'] ?? 'Front Door <noreply@frontdooruk.co.uk>'

if (!apiKey) { console.error('RESEND_API_KEY not set'); process.exit(1) }

async function main() {
  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from,
    to: 'dankux92@gmail.com',
    subject: 'Test — New verified buyer in your area — Front Door',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" align="center"
        style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;
               border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="background:#1d4ed8;padding:20px 32px;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">Front Door</p>
            <p style="margin:3px 0 0;font-size:12px;color:#93c5fd;">UK property verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 14px;font-size:15px;color:#374151;">
              Hi <strong>Test Agent</strong>,
            </p>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;">
              A new verified <strong>buyer</strong> is actively looking in
              <strong>SW1, London</strong>.
            </p>
            <table cellpadding="0" cellspacing="0"
              style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;
                     padding:16px 20px;margin:0 0 16px;">
              <tr>
                <td>
                  <p style="margin:0;font-size:28px;font-weight:bold;color:#1d4ed8;">
                    62<span style="font-size:16px;color:#93c5fd;"> / 100</span>
                  </p>
                  <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Intent score</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              Log in to view their anonymised profile and unlock contact details when
              you&rsquo;re ready to reach out.
            </p>
            <a href="https://frontdooruk.co.uk/agent/dashboard"
              style="display:inline-block;background:#1d4ed8;color:#ffffff;font-weight:bold;
                     text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">
              View lead on dashboard &rarr;
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Front Door &middot; UK Property Verification
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">
              This is a test email sent from the development environment.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  if (error) { console.error('Send failed:', error); process.exit(1) }
  console.log('✓ Email sent. Resend message ID:', data?.id)
}

main().catch(err => { console.error(err); process.exit(1) })
