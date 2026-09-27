/**
 * Lightweight lexicon-based tone detector — gives an overall "tone badge"
 * (e.g. "Confident", "Friendly", "Formal") the way Grammarly surfaces a
 * tone indicator, without needing an external ML model.
 */

const LEXICON = {
  formal: ["furthermore", "therefore", "consequently", "regarding", "shall", "pursuant", "hereby", "accordingly"],
  casual: ["hey", "gonna", "wanna", "yeah", "lol", "kinda", "stuff", "cool"],
  confident: ["will", "must", "definitely", "certainly", "clearly", "always", "guarantee"],
  hesitant: ["maybe", "perhaps", "might", "possibly", "i think", "i guess", "sort of", "kind of"],
  positive: ["great", "excellent", "happy", "love", "wonderful", "thanks", "appreciate", "glad", "excited"],
  negative: ["unfortunately", "problem", "issue", "concern", "disappointed", "sorry", "fail", "wrong", "bad"],
  friendly: ["thanks", "please", "appreciate", "hope", "welcome", "glad to", "looking forward"],
};

function score(text, words) {
  const lower = text.toLowerCase();
  let count = 0;
  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const found = lower.match(re);
    if (found) count += found.length;
  }
  return count;
}

export function analyzeTone(text) {
  if (!text || !text.trim()) {
    return { primary: "Neutral", secondary: null, confidence: 0, breakdown: {} };
  }

  const scores = {
    Formal: score(text, LEXICON.formal),
    Casual: score(text, LEXICON.casual),
    Confident: score(text, LEXICON.confident),
    Hesitant: score(text, LEXICON.hesitant),
    Positive: score(text, LEXICON.positive),
    Negative: score(text, LEXICON.negative),
    Friendly: score(text, LEXICON.friendly),
  };

  const entries = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return { primary: "Neutral", secondary: null, confidence: 0, breakdown: scores };
  }

  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const [primary, primaryScore] = entries[0];
  const secondary = entries[1]?.[0] || null;

  return {
    primary,
    secondary,
    confidence: Math.round((primaryScore / total) * 100),
    breakdown: scores,
  };
}
