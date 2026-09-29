import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GROQ_API_KEY; 
    
    if (!apiKey) {
      return NextResponse.json({ reply: "API key missing from server." }, { status: 500 });
    }

    const systemPrompt = `You are SouqBot, the official AI assistant for SkillSouq (a premium elite freelance marketplace in Bahrain).
Your job is to listen carefully to the user's intent and help them accordingly.

IF THE USER WANTS TO BUY OR HIRE:
- Suggest the specific types of freelancers they need for their project.
- Tell them to browse the SkillSouq Marketplace to find top talent.

IF THE USER WANTS TO SELL, FREELANCE, OR MAKE MONEY:
- DO NOT tell them to hire experts. Validate their skills!
- Explain the exact 4-step process to become a seller on SkillSouq:
  1. Click on "Seller Dashboard" in the navigation bar.
  2. Upload their professional documents for identity verification.
  3. Wait 24-48 hours for the Admin Trust & Safety team to approve them.
  4. Once approved, they can create their first Gig and start accepting orders.

RULES:
- Be concise, professional, and friendly.
- Never make up fake links.
- Actually read if they want to GIVE a service or GET a service.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });
    
    const data = await response.json();

    if (!response.ok) {
      console.error("GROQ API ERROR:", response.status, JSON.stringify(data, null, 2));
      const message = data?.error?.message || "Groq API request failed.";
      return NextResponse.json({ reply: `Groq error: ${message}` }, { status: response.status });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error("GROQ API UNEXPECTED RESPONSE:", JSON.stringify(data, null, 2));
      return NextResponse.json({ reply: "Groq returned an empty response. Please try again." }, { status: 502 });
    }
    
    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: "My servers are currently taking a quick break!" }, { status: 500 });
  }
}
