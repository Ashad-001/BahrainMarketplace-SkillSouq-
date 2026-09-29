import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize the mailroom with your secret key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. Grab the details sent from your Admin Dashboard
    const { email, actionType, message } = await request.json();

    // 2. Set up the subject and body based on if it's a Ban or a Warning
    const subjectLine = actionType === 'ban' 
      ? '🚨 Account Terminated - SkillSouq' 
      : '⚠️ Official Warning - SkillSouq';

    const htmlBody = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: ${actionType === 'ban' ? '#ef4444' : '#f59e0b'};">
          ${subjectLine}
        </h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">${message}</p>
        <br/>
        <p style="font-size: 14px; color: #666;">- The SkillSouq Trust & Safety Team</p>
      </div>
    `;

    // 3. Fire the email!
    const { data, error } = await resend.emails.send({
      from: 'SkillSouq Admin <onboarding@resend.dev>',
      to: [email],
      subject: subjectLine,
      html: htmlBody,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
