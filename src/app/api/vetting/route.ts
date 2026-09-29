import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { title, description, level } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing.' }, { status: 500 });
    }

    const levelMap: Record<string, string> = {
      simple: 'simple, short, easy-to-understand questions',
      intermediate: 'balanced, moderately detailed questions',
      high: 'advanced, more probing and strategic questions',
    };

    const difficulty = levelMap[level] || levelMap.intermediate;

    const systemPrompt = `You are an expert hiring advisor for a Bahraini freelance marketplace. Generate exactly 3 ${difficulty} to help a buyer evaluate this professional. Keep the questions concise, practical, and direct. Return only the numbered questions with no markdown or extra commentary.`;
    const userContent = `Professional title: ${title}\nProfessional bio: ${description}\nGenerate exactly 3 interview questions.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('GROQ VETTING API ERROR:', response.status, JSON.stringify(data, null, 2));
      const message = data?.error?.message || 'Groq API request failed.';
      return NextResponse.json({ error: `Groq error: ${message}` }, { status: response.status });
    }

    const questions = data.choices?.[0]?.message?.content?.trim();
    if (!questions) {
      console.error('GROQ VETTING API EMPTY RESPONSE:', JSON.stringify(data, null, 2));
      return NextResponse.json({ error: 'Groq returned an empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ result: questions });
  } catch (error) {
    console.error('Vetting route error:', error);
    return NextResponse.json({ error: 'Failed to generate interview questions.' }, { status: 500 });
  }
}
