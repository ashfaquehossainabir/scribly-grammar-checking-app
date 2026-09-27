/**
 * Sentence-level rewrite suggestions: "Tone" (Formal / Confident / Friendly
 * variants) and "Improved" (a tightened, clearer version of the sentence).
 *
 * Like the rest of the AI engine, this is 100% offline and rule-based —
 * no third-party APIs, no model calls. It reuses the same word/phrase maps
 * as the Clarity/Engagement detectors so the two stay in sync.
 */
import { splitSentencesWithOffsets, WORDY_PHRASES, FILLER_WORDS, WEAK_VOCAB } from "./textAnalysis.js";

const CONTRACTIONS_EXPAND = {
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "don't": "do not", "doesn't": "does not", "didn't": "did not",
  "can't": "cannot", "couldn't": "could not", "won't": "will not", "wouldn't": "would not",
  "shouldn't": "should not", "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "i'm": "I am", "you're": "you are", "we're": "we are", "they're": "they are", "it's": "it is",
  "i've": "I have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'll": "I will", "you'll": "you will", "we'll": "we will", "they'll": "they will",
  "i'd": "I would", "you'd": "you would", "we'd": "we would", "they'd": "they would",
  "let's": "let us", "that's": "that is", "there's": "there is", "who's": "who is",
};

const CONTRACTIONS_CONTRACT = Object.fromEntries(
  Object.entries(CONTRACTIONS_EXPAND).map(([full, expanded]) => [expanded.toLowerCase(), full])
);

const HEDGES = [
  "i think that", "i believe that", "i think", "i believe", "i guess", "i feel like",
  "sort of", "kind of", "maybe", "perhaps", "possibly", "i'm not sure but",
  "it could be that", "just wanted to say", "just wanted to", "if that's okay", "if that is okay",
];

const FORMAL_SWAP = {
  "a lot": "significantly", get: "obtain", got: "obtained", stuff: "material",
  thing: "matter", guy: "individual", guys: "colleagues", okay: "acceptable",
  yeah: "yes", kids: "children", big: "substantial", huge: "significant",
};

const CASUAL_SWAP = {
  obtain: "get", assistance: "help", purchase: "buy", require: "need",
  individuals: "people", utilize: "use", commence: "start", terminate: "end",
  regarding: "about", additional: "more", "prior to": "before", "subsequent to": "after",
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCase(sample, word) {
  if (sample === sample.toUpperCase()) return word.toUpperCase();
  if (sample[0] === sample[0]?.toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}

function replaceWordsCaseAware(str, map) {
  let out = str;
  for (const [from, to] of Object.entries(map)) {
    const re = new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi");
    out = out.replace(re, (match) => matchCase(match, to));
  }
  return out;
}

function stripHedges(sentence) {
  let out = sentence;
  for (const hedge of HEDGES) {
    const re = new RegExp(`\\b${escapeRegExp(hedge)}\\b,?\\s*`, "gi");
    out = out.replace(re, "");
  }
  return out;
}

function cleanupSentence(s) {
  let out = s.replace(/\s{2,}/g, " ").trim();
  out = out.replace(/\s+([.,!?])/g, "$1");
  if (!out) return out;
  return out[0].toUpperCase() + out.slice(1);
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function toFormal(sentence) {
  let out = stripHedges(sentence);
  out = replaceWordsCaseAware(out, CONTRACTIONS_EXPAND);
  out = replaceWordsCaseAware(out, FORMAL_SWAP);
  out = out.replace(/!+/g, ".");
  return cleanupSentence(out);
}

function toConfident(sentence) {
  let out = stripHedges(sentence);
  out = out.replace(/\b(might|may)\b/gi, (m) => matchCase(m, "will"));
  return cleanupSentence(out);
}

function toFriendly(sentence) {
  let out = replaceWordsCaseAware(sentence, CASUAL_SWAP);
  out = replaceWordsCaseAware(out, CONTRACTIONS_CONTRACT);
  return cleanupSentence(out);
}

function improveSentence(sentence) {
  let out = sentence;
  for (const [regex, replacement] of WORDY_PHRASES) {
    out = out.replace(regex, replacement);
  }
  for (const word of FILLER_WORDS) {
    const re = new RegExp(`\\b${escapeRegExp(word)}\\b\\s*`, "gi");
    out = out.replace(re, "");
  }
  for (const [word, alts] of Object.entries(WEAK_VOCAB)) {
    const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
    out = out.replace(re, (m) => matchCase(m, alts[0]));
  }
  return cleanupSentence(out);
}

const MIN_WORDS = 4;
const MAX_WORDS = 60;
const MAX_SENTENCES_PROCESSED = 60; // keep large documents fast

function eligibleSentences(text) {
  return splitSentencesWithOffsets(text)
    .slice(0, MAX_SENTENCES_PROCESSED)
    .map((s) => ({ ...s, wordCount: s.trimmed.split(/\s+/).filter(Boolean).length }))
    .filter((s) => s.wordCount >= MIN_WORDS && s.wordCount <= MAX_WORDS);
}

// ---------- Tone rewrites ----------
export function analyzeToneRewrites(text) {
  const issues = [];
  for (const s of eligibleSentences(text)) {
    const original = s.text;
    const options = [];

    const formal = toFormal(original);
    if (normalize(formal) !== normalize(original)) options.push({ label: "Formal", text: formal });

    const confident = toConfident(original);
    if (normalize(confident) !== normalize(original) && normalize(confident) !== normalize(formal)) {
      options.push({ label: "Confident", text: confident });
    }

    const friendly = toFriendly(original);
    if (normalize(friendly) !== normalize(original)) options.push({ label: "Friendly", text: friendly });

    if (options.length === 0) continue;

    issues.push({
      type: "rewrite",
      rewriteKind: "tone",
      category: "delivery",
      severity: "delivery",
      ruleId: "REWRITE_TONE",
      offset: s.start,
      length: s.text.length,
      original,
      message: "Try adjusting the tone of this sentence.",
      shortMessage: "Tone rewrite",
      options: options.slice(0, 3),
      replacements: options.map((o) => o.text),
    });
  }
  return issues;
}

// ---------- Improved sentence rewrites ----------
export function analyzeImprovedSentences(text) {
  const issues = [];
  for (const s of eligibleSentences(text)) {
    if (s.wordCount < 6) continue; // very short sentences rarely benefit
    const improved = improveSentence(s.text);
    if (normalize(improved) === normalize(s.text)) continue;

    issues.push({
      type: "rewrite",
      rewriteKind: "improve",
      category: "clarity",
      severity: "clarity",
      ruleId: "REWRITE_IMPROVE",
      offset: s.start,
      length: s.text.length,
      original: s.text,
      message: "Here's a tighter, clearer version of this sentence.",
      shortMessage: "Improved sentence",
      options: [{ label: "Improved", text: improved }],
      replacements: [improved],
    });
  }
  return issues;
}
