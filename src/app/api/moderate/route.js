import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { text } = await request.json();

    // 1. Give the AI its strict instructions
    const systemPrompt = `You are the strict Trust & Safety AI for SkillSouq, a freelancer marketplace. 
    Your job is to analyze user text and block attempts to bypass platform fees.
    Flag the text if it contains:
    1. Intent to communicate off-platform (e.g., "hit me up on insta", "call my agency").
    2. Intent to pay off-platform (e.g., "I take crypto", "cash only").
    3. Illegal or highly inappropriate services.
    
    You must respond in pure JSON format:
    {
      "isSafe": boolean,
      "reason": "String explaining why it was blocked, or null if safe"
    }`;

    // 2. Send it to Groq's lightning-fast Llama 3 model
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      model: "llama-3.1-8b-instant", // The 8B model is insanely fast and smart enough for this
      response_format: { type: "json_object" }, // Forces Groq to return perfect JSON!
      temperature: 0, // 0 makes it analytical and strict, no creative guessing
    });

    // 3. Parse the JSON response
    const result = JSON.parse(chatCompletion.choices[0]?.message?.content);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Groq Moderation Error:", error);
    // If the AI goes down, we fail "open" so users can still use the site
    return NextResponse.json({ isSafe: true, reason: null }); 
  }
}