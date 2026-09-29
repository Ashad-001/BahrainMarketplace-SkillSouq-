import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, model } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing from server.' }, { status: 500 });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: typeof model === 'string' && model.trim() ? model : 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              typeof systemPrompt === 'string' && systemPrompt.trim()
                ? systemPrompt
                : 'You are a professional assistant for a freelance marketplace chat app. Follow the user instruction exactly and return only the requested output format, with no extra preface.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('GROQ MESSAGES AI ERROR:', response.status, JSON.stringify(data, null, 2));
      const message = data?.error?.message || 'Groq API request failed.';
      return NextResponse.json({ error: `Groq error: ${message}` }, { status: response.status });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error('GROQ MESSAGES AI EMPTY RESPONSE:', JSON.stringify(data, null, 2));
      return NextResponse.json({ error: 'Groq returned an empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Messages AI route error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response.' }, { status: 500 });
  }
}
