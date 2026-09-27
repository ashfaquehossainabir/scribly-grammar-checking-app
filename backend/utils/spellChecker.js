import { isKnownWord, DICTIONARY } from "./dictionary.js";
import { COMMON_MISSPELLINGS } from "./commonMisspellings.js";
import { COMMON_WORDS } from "./commonWords.js";

// The ~100 highest-frequency words in English get an extra nudge, since a
// tie between e.g. "the" and "ten" should almost always resolve to "the".
const TOP_FREQUENCY_WORDS = new Set(
  "the of and a to in is it you that he was for on are with as I his they be at one have this from or had by not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who its now find long down day did get come made may part".split(" ")
);

/**
 * From-scratch spelling correction, layered like a real spell checker:
 *
 *   1. Common-misspellings lookup  — instant, high-confidence (commonMisspellings.js)
 *   2. Compound-word split         — "goodmorning" -> "good morning"
 *   3. Edit-distance correction    — generates every 1-edit (then 2-edit)
 *      variant of the word (deletions, transpositions, replacements,
 *      insertions), keeps the ones that are real dictionary words, and
 *      ranks them with a keyboard-adjacency-aware scorer so that likely
 *      "fat-finger" typos (hitting a neighboring key) outrank arbitrary
 *      same-distance alternatives.
 *
 * All of it runs against our own offline dictionary — no external service.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

// QWERTY physical layout, used only to score which letter-substitution is
// most *plausible* as a typo (adjacent keys are far more likely mistakes
// than random ones), not to look anything up externally.
const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const ADJACENCY = buildAdjacencyMap();

function buildAdjacencyMap() {
  const map = {};
  for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
    const row = KEYBOARD_ROWS[r];
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      const neighbors = new Set();
      if (row[i - 1]) neighbors.add(row[i - 1]);
      if (row[i + 1]) neighbors.add(row[i + 1]);
      const rowAbove = KEYBOARD_ROWS[r - 1];
      const rowBelow = KEYBOARD_ROWS[r + 1];
      if (rowAbove && rowAbove[i]) neighbors.add(rowAbove[i]);
      if (rowBelow && rowBelow[i]) neighbors.add(rowBelow[i]);
      map[c] = neighbors;
    }
  }
  return map;
}

function areAdjacent(a, b) {
  return ADJACENCY[a]?.has(b) || ADJACENCY[b]?.has(a) || false;
}

function edits1(word) {
  const splits = [];
  for (let i = 0; i <= word.length; i++) {
    splits.push([word.slice(0, i), word.slice(i)]);
  }

  const results = new Set();
  for (const [l, r] of splits) {
    if (r) results.add(l + r.slice(1)); // deletion
  }
  for (const [l, r] of splits) {
    if (r.length > 1) results.add(l + r[1] + r[0] + r.slice(2)); // transposition
  }
  for (const [l, r] of splits) {
    if (r) for (const c of ALPHABET) results.add(l + c + r.slice(1)); // replacement
  }
  for (const [l, r] of splits) {
    for (const c of ALPHABET) results.add(l + c + r); // insertion
  }
  return results;
}

function knownEdits1(word) {
  return [...edits1(word)].filter((w) => DICTIONARY.has(w));
}

function knownEdits2(word) {
  const found = new Set();
  for (const e1 of edits1(word)) {
    if (DICTIONARY.has(e1)) continue;
    for (const e2 of edits1(e1)) {
      if (DICTIONARY.has(e2)) found.add(e2);
    }
    if (found.size > 400) break; // safety cap for pathological inputs
  }
  return [...found];
}

/**
 * Scores a candidate correction against the original misspelled word.
 * Lower is better. Rewards: same length (substitution/transposition typos
 * are the most common), matching first letter (typos rarely change the
 * opening letter), and single-position substitutions where the two letters
 * are physically adjacent on a QWERTY keyboard (the single most common
 * real-world typo pattern).
 */
function scoreCandidate(original, candidate) {
  let score = 0;

  if (candidate.length !== original.length) score += 2;
  if (candidate[0] !== original[0]) score += 3;

  if (candidate.length === original.length) {
    let diffPositions = [];
    for (let i = 0; i < original.length; i++) {
      if (original[i] !== candidate[i]) diffPositions.push(i);
    }
    if (diffPositions.length === 1) {
      const i = diffPositions[0];
      if (areAdjacent(original[i], candidate[i])) {
        score -= 3; // strong bonus: classic fat-finger substitution
      }
    } else if (diffPositions.length === 2 && diffPositions[1] === diffPositions[0] + 1) {
      // adjacent-letter swap (transposition) — also a very common typo
      score -= 2;
    }
  }

  score += Math.abs(candidate.length - original.length);

  // Frequency signal: prefer everyday words over obscure dictionary
  // entries (rare terms, proper nouns) when nothing else distinguishes them.
  score += COMMON_WORDS.has(candidate) ? -2 : 0.5;
  if (TOP_FREQUENCY_WORDS.has(candidate)) score -= 1.5;

  return score;
}

function rankCandidates(original, candidates, limit) {
  const scored = candidates.map((c) => ({ word: c, score: scoreCandidate(original, c) }));
  scored.sort((a, b) => a.score - b.score || a.word.localeCompare(b.word));
  return scored.slice(0, limit).map((s) => s.word);
}

function matchCase(original, correction) {
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return correction
      .split(" ")
      .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  return correction;
}

/**
 * Tries to split an unrecognized word into two real dictionary words
 * ("goodmorning" -> "good morning"). Requires both halves to be at least
 * 3 letters, to avoid noisy splits like "i" + "nsight".
 */
export function trySplitWord(word) {
  const lower = word.toLowerCase();
  for (let i = 3; i <= lower.length - 3; i++) {
    const left = lower.slice(0, i);
    const right = lower.slice(i);
    if (DICTIONARY.has(left) && DICTIONARY.has(right)) {
      return `${left} ${right}`;
    }
  }
  return null;
}

/**
 * Full correction pipeline for a single unrecognized word. Returns
 * { suggestions, reason } where reason describes which layer produced
 * the match (used to tailor the message shown to the user).
 */
export function correctWord(word, limit = 5) {
  const lower = word.toLowerCase();

  if (COMMON_MISSPELLINGS[lower]) {
    return {
      suggestions: [matchCase(word, COMMON_MISSPELLINGS[lower])],
      reason: "common",
    };
  }

  const split = trySplitWord(lower);
  if (split) {
    return { suggestions: [matchCase(word, split)], reason: "split" };
  }

  if (lower.length > 24 || lower.length < 2) {
    return { suggestions: [], reason: "none" };
  }

  let candidates = knownEdits1(lower);
  if (candidates.length === 0) candidates = knownEdits2(lower);
  if (candidates.length === 0) return { suggestions: [], reason: "none" };

  const ranked = rankCandidates(lower, candidates, limit).map((c) => matchCase(word, c));
  return { suggestions: ranked, reason: "edit-distance" };
}

// Kept for backward compatibility with any existing callers.
export function suggestCorrections(word, limit = 5) {
  return correctWord(word, limit).suggestions;
}

export { isKnownWord };
