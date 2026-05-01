import { NextRequest, NextResponse } from 'next/server'
import { buildMoatManagementPrompt } from '@/app/investing/lib/qualitative/buildMoatManagementPrompt'

type AnthropicTextBlock = {
  type: 'text'
  text: string
}

type AnthropicResponse = {
  content?: Array<AnthropicTextBlock | { type: string }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticker, company, sector, thesisNotes } = body as {
      ticker?: string
      company?: string
      sector?: string | null
      thesisNotes?: string | null
    }

    if (!ticker || !company) {
      return NextResponse.json({ error: 'Missing ticker or company.' }, { status: 400 })
    }

    const prompt = buildMoatManagementPrompt({
      ticker,
      company,
      sector: sector ?? null,
      thesisNotes: thesisNotes ?? null,
    })

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      return NextResponse.json(
        {
          error:
            'ANTHROPIC_API_KEY not configured. Set it in Vercel environment variables.',
        },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status} — ${errorText}` },
        { status: 500 }
      )
    }

    const data = (await response.json()) as AnthropicResponse
    const textContent = data.content?.find(
      (c): c is AnthropicTextBlock => c.type === 'text'
    )?.text

    if (!textContent) {
      return NextResponse.json({ error: 'No text response from AI.' }, { status: 500 })
    }

    const cleaned = textContent
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Try again.', rawResponse: textContent },
        { status: 422 }
      )
    }

    return NextResponse.json({ data: parsed, rawResponse: textContent })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Qualitative analysis failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}