import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { text, type } = await request.json();

    if (!text) {
      return NextResponse.json({ polishedText: "" });
    }

    // Give the AI strict instructions to act as an elite copywriter
    const systemPrompt = `You are an elite copywriter for SkillSouq, a premium freelance marketplace. 
    The user will give you a rough, messy title or description for their service.
    Your job is to rewrite it to sound highly professional, premium, and trustworthy.
    
    RULES:
    - If it's a title, keep it short and punchy (under 60 characters).
    - Fix any grammar or spelling mistakes.
    - DO NOT wrap the output in quotes.
    - DO NOT say "Here is your title:" or add any conversational filler. 
    - RETURN ONLY THE POLISHED TEXT.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please polish this gig title: ${text}` }
      ],
      model: "llama-3.1-8b-instant", 
      temperature: 0.5,
    });

    // Clean up any weird quotes the AI might try to add
    let polishedText = chatCompletion.choices[0]?.message?.content?.trim() || text;
    polishedText = polishedText.replace(/^["']|["']$/g, ''); 

    return NextResponse.json({ polishedText, result: polishedText });

  } catch (error) {
    console.error("AI Polish Error:", error);
    return NextResponse.json({ polishedText: "Error generating text." }, { status: 500 });
  }
}
