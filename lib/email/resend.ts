// Server only — do not import in client components

export type EmailPayload = {
  to: string
  subject: string
  html: string
}

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: string }

export async function sendEmail(
  payload: EmailPayload,
  options?: { apiKey?: string; fromEmail?: string }
): Promise<SendEmailResult> {
  try {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY
    const fromEmail = options?.fromEmail ?? process.env.RESEND_FROM_EMAIL

    if (!apiKey) {
      return { sent: false, reason: 'RESEND_API_KEY is not configured' }
    }

    if (!fromEmail) {
      return { sent: false, reason: 'RESEND_FROM_EMAIL is not configured' }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    })

    const json = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; error?: { message?: string } }
      | null

    if (!response.ok) {
      const reason =
        json?.message ??
        json?.error?.message ??
        `Resend request failed with status ${response.status}`

      console.error(`[sendEmail] Failed to send "${payload.subject}": ${reason}`)
      return { sent: false, reason }
    }

    if (!json?.id) {
      const reason = 'Resend response did not include an email id'
      console.error(`[sendEmail] Failed to send "${payload.subject}": ${reason}`)
      return { sent: false, reason }
    }

    return { sent: true, id: json.id }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`[sendEmail] Failed to send "${payload.subject}": ${reason}`)
    return { sent: false, reason }
  }
}