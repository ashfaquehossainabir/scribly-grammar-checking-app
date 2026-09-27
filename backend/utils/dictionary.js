import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * A fully offline English dictionary — ~188,000 word forms, expanded from
 * the standard open-source hunspell en_US base dictionary + its affix rules
 * (a one-time build step, not fetched at runtime). Loaded once into memory;
 * every lookup after that is a plain in-process Set check — no network,
 * no API, no external service of any kind.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDLIST_PATH = path.join(__dirname, "..", "data", "wordlist.txt");

const raw = fs.readFileSync(WORDLIST_PATH, "utf-8");
export const DICTIONARY = new Set(raw.split("\n").map((w) => w.trim()).filter(Boolean));

// Index by first letter, so the spell-suggester only has to scan a small
// slice of the dictionary instead of all ~188k words.
const BY_FIRST_LETTER = new Map();
for (const word of DICTIONARY) {
  const key = word[0] || "#";
  if (!BY_FIRST_LETTER.has(key)) BY_FIRST_LETTER.set(key, []);
  BY_FIRST_LETTER.get(key).push(word);
}

export function isKnownWord(word) {
  if (!word) return true;
  const w = word.toLowerCase();
  if (/^\d+$/.test(w)) return true; // pure numbers aren't spelling errors
  return DICTIONARY.has(w);
}

export function wordsStartingWith(letter) {
  return BY_FIRST_LETTER.get(letter) || [];
}

export const DICTIONARY_SIZE = DICTIONARY.size;
