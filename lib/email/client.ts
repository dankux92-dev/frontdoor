import { Resend } from 'resend'

let _client: Resend | null = null

export function getResendClient(): Resend {
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

// Set this to a verified sending domain in Resend.
// For local testing with no key, emails fail silently.
// Resend's shared test address (onboarding@resend.dev) works without domain setup.
export const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? 'Front Door <noreply@frontdooruk.co.uk>'
