// src/utils/trust-safety.ts

export function scanForBannedContent(text: string) {
  if (!text) return { isSafe: true, reason: null };

  const lowerText = text.toLowerCase();

  // 1. The Financial & Competitor Blocklist
  const bannedWords = [
    'whatsapp', 'telegram', 'crypto', 'bitcoin', 
    'paypal', 'pay me outside', 'wire transfer', 'western union'
  ];

  for (const word of bannedWords) {
    if (lowerText.includes(word)) {
      return { 
        isSafe: false, 
        reason: `Action blocked: Using the term '${word}' violates SkillSouq's off-platform communication policy.` 
      };
    }
  }

  // 2. The Email Sniper (Basic Regex)
  // Catches things like "hamdan@gmail.com" or "contact@agency.net"
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  if (emailRegex.test(lowerText)) {
    return { 
      isSafe: false, 
      reason: "Action blocked: Sharing email addresses is strictly prohibited for your security." 
    };
  }

  // 3. The Phone Number Sniper
  // Catches sequences of 7+ numbers, even if separated by spaces or dashes
  const phoneRegex = /(?:\d[ -]*?){7,}/;
  if (phoneRegex.test(lowerText)) {
    return { 
      isSafe: false, 
      reason: "Action blocked: Sharing phone numbers is strictly prohibited." 
    };
  }

  // If it survives the gauntlet, it's cleared for the database (or the AI)
  return { isSafe: true, reason: null };
}