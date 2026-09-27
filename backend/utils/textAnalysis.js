/**
 * Rule-based Clarity + Engagement + Delivery detectors.
 * These are the "classic NLP" layer of the AI engine: fast, deterministic,
 * offset-accurate (so the frontend can underline exact spans), and they
 * work with zero external dependencies or API keys.
 */

export const WORDY_PHRASES = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bat this point in time\b/gi, "now"],
  [/\bin the event that\b/gi, "if"],
  [/\ba large number of\b/gi, "many"],
  [/\bfor the purpose of\b/gi, "for"],
  [/\bin spite of the fact that\b/gi, "although"],
  [/\bwith regard to\b/gi, "regarding"],
  [/\bit is important to note that\b/gi, ""],
  [/\bthe fact that\b/gi, "that"],
  [/\bin the near future\b/gi, "soon"],
  [/\bis able to\b/gi, "can"],
  [/\bas a matter of fact\b/gi, "in fact"],
  [/\beach and every\b/gi, "every"],
  [/\bfirst and foremost\b/gi, "first"],
  [/\bwhether or not\b/gi, "whether"],
  [/\bpast history\b/gi, "history"],
  [/\bfree gift\b/gi, "gift"],
  [/\bfinal outcome\b/gi, "outcome"],
  [/\bbasic fundamentals\b/gi, "fundamentals"],
];

export const FILLER_WORDS = ["very", "really", "just", "actually", "basically", "literally", "definitely", "certainly", "totally", "simply"];

export const WEAK_VOCAB = {
  good: ["excellent", "outstanding", "solid", "commendable"],
  bad: ["poor", "subpar", "problematic", "unsatisfactory"],
  nice: ["pleasant", "delightful", "admirable"],
  big: ["substantial", "significant", "considerable"],
  small: ["minor", "modest", "compact"],
  happy: ["delighted", "thrilled", "pleased"],
  sad: ["disheartened", "downcast", "regretful"],
  said: ["stated", "explained", "noted", "remarked"],
  thing: ["aspect", "element", "factor"],
  stuff: ["material", "content", "items"],
  get: ["obtain", "acquire", "receive"],
  got: ["obtained", "received", "acquired"],
  "a lot": ["considerably", "substantially", "significantly"],
};

const HEDGING_PHRASES = [
  "i think", "i guess", "i feel like", "sort of", "kind of", "maybe",
  "perhaps", "i'm not sure but", "it could be that", "possibly",
  "i'm sorry to bother you", "just wanted to", "if that's okay",
];

function makeIssue({ text, offset, length, message, shortMessage, category, replacements = [] }) {
  return {
    message,
    shortMessage,
    offset,
    length,
    replacements,
    category,
    severity: category,
    ruleId: `RULE_${category.toUpperCase()}`,
  };
}

function findAll(regex, text) {
  const matches = [];
  const re = new RegExp(regex);
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push(m);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return matches;
}

// Splits text into sentences and locates each one's exact offset in the
// original string, so callers (clarity checks, the rewrite engine) can
// build offset-accurate issues without re-deriving this logic.
export function splitSentencesWithOffsets(text) {
  const rawSentences = text.split(/(?<=[.!?])\s+/);
  const result = [];
  let cursor = 0;
  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = text.indexOf(raw, cursor);
    if (start === -1) continue;
    result.push({ text: raw, trimmed, start, end: start + raw.length });
    cursor = start + raw.length;
  }
  return result;
}

// ---------- Clarity ----------
export function analyzeClarity(text) {
  const issues = [];

  // Wordy / redundant phrases
  for (const [regex, replacement] of WORDY_PHRASES) {
    for (const m of findAll(regex, text)) {
      issues.push(
        makeIssue({
          offset: m.index,
          length: m[0].length,
          message: replacement
            ? `"${m[0].trim()}" is wordy. Consider "${replacement}" instead.`
            : `"${m[0].trim()}" can usually be cut without losing meaning.`,
          shortMessage: "Wordiness",
          category: "clarity",
          replacements: replacement ? [replacement] : [""],
        })
      );
    }
  }

  // Passive voice (heuristic: to-be verb + past participle)
  const passiveRegex = /\b(is|are|was|were|be|been|being)\s+([a-z]+ed|written|done|made|given|taken|known|shown|seen|held|built|sent|told|found)\b/gi;
  for (const m of findAll(passiveRegex, text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: "This sentence may be in passive voice. Active voice is usually clearer and more direct.",
        shortMessage: "Passive voice",
        category: "clarity",
        replacements: [],
      })
    );
  }

  // Long sentences (>30 words)
  for (const sentence of splitSentencesWithOffsets(text)) {
    const wordCount = sentence.trimmed.split(/\s+/).length;
    if (wordCount > 30) {
      issues.push(
        makeIssue({
          offset: sentence.start,
          length: sentence.text.length,
          message: `This sentence is ${wordCount} words long. Consider splitting it up for easier reading.`,
          shortMessage: "Long sentence",
          category: "clarity",
          replacements: [],
        })
      );
    }
  }

  return issues;
}

// ---------- Engagement ----------
export function analyzeEngagement(text) {
  const issues = [];

  // Overused filler words
  for (const word of FILLER_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = findAll(regex, text);
    if (matches.length >= 2) {
      for (const m of matches) {
        issues.push(
          makeIssue({
            offset: m.index,
            length: m[0].length,
            message: `"${word}" appears ${matches.length} times. Consider removing it or varying your word choice.`,
            shortMessage: "Overused word",
            category: "engagement",
            replacements: [""],
          })
        );
      }
    }
  }

  // Weak vocabulary -> richer alternatives
  for (const [word, alts] of Object.entries(WEAK_VOCAB)) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    for (const m of findAll(regex, text)) {
      issues.push(
        makeIssue({
          offset: m.index,
          length: m[0].length,
          message: `"${word}" is common and a little flat. A more vivid word could strengthen this sentence.`,
          shortMessage: "Vocabulary enhancement",
          category: "engagement",
          replacements: alts,
        })
      );
    }
  }

  return issues;
}

// ---------- Delivery (tone / formality / hedging) ----------
export function analyzeDelivery(text) {
  const issues = [];
  const lower = text.toLowerCase();

  for (const phrase of HEDGING_PHRASES) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      issues.push(
        makeIssue({
          offset: idx,
          length: phrase.length,
          message: `"${phrase}" softens your point. If you want to sound more confident, consider stating it directly.`,
          shortMessage: "Hedging language",
          category: "delivery",
          replacements: [],
        })
      );
      idx = lower.indexOf(phrase, idx + phrase.length);
    }
  }

  // ALL CAPS shouting (word of 4+ letters, fully uppercase)
  for (const m of findAll(/\b[A-Z]{4,}\b/g, text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: "Writing in all caps can come across as shouting. Consider normal capitalization.",
        shortMessage: "Tone",
        category: "delivery",
        replacements: [m[0][0] + m[0].slice(1).toLowerCase()],
      })
    );
  }

  // Excess exclamation points
  const exclaims = findAll(/!/g, text);
  if (exclaims.length >= 3) {
    const m = exclaims[exclaims.length - 1];
    issues.push(
      makeIssue({
        offset: m.index,
        length: 1,
        message: `You've used ${exclaims.length} exclamation points. Overuse can undercut a professional tone.`,
        shortMessage: "Tone",
        category: "delivery",
        replacements: ["."],
      })
    );
  }

  return issues;
}

// ---------- Readability ----------
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function computeReadability(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { words: 0, sentences: 0, avgWordsPerSentence: 0, fleschScore: 0, gradeLevel: "N/A" };
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const wordCount = words.length || 1;
  const sentenceCount = sentences.length || 1;

  const fleschScore = Math.max(
    0,
    Math.min(
      100,
      206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount)
    )
  );

  let gradeLevel = "Graduate";
  if (fleschScore >= 90) gradeLevel = "Very easy (5th grade)";
  else if (fleschScore >= 80) gradeLevel = "Easy (6th grade)";
  else if (fleschScore >= 70) gradeLevel = "Fairly easy (7th grade)";
  else if (fleschScore >= 60) gradeLevel = "Standard (8th-9th grade)";
  else if (fleschScore >= 50) gradeLevel = "Fairly difficult (10th-12th grade)";
  else if (fleschScore >= 30) gradeLevel = "Difficult (College)";

  return {
    words: wordCount,
    sentences: sentenceCount,
    avgWordsPerSentence: Math.round((wordCount / sentenceCount) * 10) / 10,
    fleschScore: Math.round(fleschScore),
    gradeLevel,
  };
}
