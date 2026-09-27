import { isKnownWord } from "./dictionary.js";
import { correctWord } from "./spellChecker.js";

/**
 * The Correctness engine — fully offline, no third-party API of any kind.
 *
 *   1. Spelling: tokenizes the text, looks up every word against our local
 *      ~188k-word dictionary (dictionary.js), and generates ranked
 *      correction candidates through a layered pipeline (spellChecker.js):
 *      common-misspellings lookup -> compound-word split -> keyboard-
 *      adjacency-aware edit-distance correction.
 *   2. Grammar: a large set of hand-written pattern rules covering the
 *      mistakes that are common enough to catch reliably without a trained
 *      model — missing-apostrophe contractions, a/an misuse, subject-verb
 *      agreement, commonly confused words (their/there/they're,
 *      your/you're, its/it's, then/than, to/too, whose/who's,
 *      weather/whether, loose/lose, "could of"), double negatives, double
 *      comparatives/superlatives, much/many & less/fewer misuse, repeated
 *      words, capitalization, and spacing/punctuation slips.
 */

const VOWEL_SOUND_START = /^(hour|honest|honor|honou?rable|heir|mba|mri|fbi|f\.?[a-z]|l\.?[a-z]|m\.?[a-z]|n\.?[a-z]|r\.?[a-z]|s\.?[a-z]|x-ray)/i;
const CONSONANT_SOUND_U = /^(uni|use[dsr]?|user|usual|utensil|utility|utopia?n?|european|euro|ubiquitous|unicorn|unify|unicycle|unit)/i;

// contraction typo -> correct form (missing apostrophe is the #1 informal-writing error)
const CONTRACTIONS = {
  dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", couldnt: "couldn't",
  wouldnt: "wouldn't", shouldnt: "shouldn't", wont: "won't", isnt: "isn't", arent: "aren't",
  wasnt: "wasn't", werent: "weren't", hasnt: "hasn't", havent: "haven't", hadnt: "hadn't",
  mustnt: "mustn't", neednt: "needn't", shant: "shan't",
  im: "I'm", ive: "I've", id: "I'd", ill: "I'll", youre: "you're", youve: "you've",
  youll: "you'll", youd: "you'd", theyre: "they're", theyve: "they've", theyll: "they'll",
  theyd: "they'd", weve: "we've", wed2: "we'd", well2: "we'll",
  whos: "who's", wholl: "who'll", whats: "what's", whens: "when's", wheres: "where's",
  whys: "why's", hows: "how's", thats: "that's", thatll: "that'll", theres: "there's",
  heres: "here's", lets: "let's", itll: "it'll", oclock: "o'clock",
  its: null, // "its" is legitimate; handled separately
};
delete CONTRACTIONS.wed2;
delete CONTRACTIONS.well2; // both "wed"/"well" collide with real standalone words — too risky to auto-flag

const DOUBLE_NEGATIVE_PATTERNS = [
  /\b(don't|doesn't|didn't|isn't|aren't|wasn't|weren't|can't|won't|couldn't|wouldn't|shouldn't|hasn't|haven't|hadn't)\s+\w*\s*\b(no|nothing|nobody|none|nowhere|never)\b/gi,
];

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

function makeIssue({ offset, length, message, shortMessage, replacements = [], severity }) {
  return {
    message,
    shortMessage,
    offset,
    length,
    replacements,
    ruleId: "LOCAL_" + shortMessage.toUpperCase().replace(/\s+/g, "_"),
    severity,
  };
}

// ---------- Spelling ----------
function checkSpelling(text) {
  const issues = [];
  const wordRe = /[A-Za-z']+/g;
  let m;
  while ((m = wordRe.exec(text)) !== null) {
    const word = m[0];
    // skip pure apostrophes / single letters used as initials mid-sentence
    if (word.length < 2 && !/^[aAiI]$/.test(word)) continue;
    if (isKnownWord(word)) continue;

    const { suggestions, reason } = correctWord(word, 5);

    let message;
    if (reason === "common") {
      message = `"${word}" is a common misspelling of "${suggestions[0]}".`;
    } else if (reason === "split") {
      message = `"${word}" isn't a recognized word — did you mean it as two words, "${suggestions[0]}"?`;
    } else if (suggestions.length) {
      message = `"${word}" doesn't look like a word we recognize.`;
    } else {
      message = `"${word}" doesn't look like a word we recognize. No close matches found.`;
    }

    issues.push(
      makeIssue({
        offset: m.index,
        length: word.length,
        message,
        shortMessage: "Spelling",
        severity: "spelling",
        replacements: suggestions,
      })
    );
  }
  return issues;
}

// ---------- Missing-apostrophe contractions ----------
function checkContractions(text) {
  const issues = [];
  const wordRe = /\b[A-Za-z]+\b/g;
  let m;
  while ((m = wordRe.exec(text)) !== null) {
    const lower = m[0].toLowerCase();
    const fix = CONTRACTIONS[lower];
    if (!fix) continue;
    // preserve capitalization of the first letter
    const replacement =
      m[0][0] === m[0][0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: `Did you mean "${replacement}"?`,
        shortMessage: "Grammar",
        severity: "grammar",
        replacements: [replacement],
      })
    );
  }
  return issues;
}

// ---------- a / an ----------
function checkArticles(text) {
  const issues = [];
  const re = /\b(a|an)\s+([A-Za-z]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const article = m[1];
    const next = m[2];
    const startsWithVowelLetter = /^[aeiouAEIOU]/.test(next);
    const isSilentH = VOWEL_SOUND_START.test(next);
    const isConsonantU = CONSONANT_SOUND_U.test(next);

    const shouldBeAn = (startsWithVowelLetter || isSilentH) && !isConsonantU;
    const isAn = article.toLowerCase() === "an";

    if (shouldBeAn && !isAn) {
      const fixed = article[0] === article[0].toUpperCase() ? "An" : "an";
      issues.push(
        makeIssue({
          offset: m.index,
          length: article.length,
          message: `Use "an" before a word that starts with a vowel sound, like "${next}".`,
          shortMessage: "Grammar",
          severity: "grammar",
          replacements: [fixed],
        })
      );
    } else if (!shouldBeAn && isAn) {
      const fixed = article[0] === article[0].toUpperCase() ? "A" : "a";
      issues.push(
        makeIssue({
          offset: m.index,
          length: article.length,
          message: `Use "a" before a word that starts with a consonant sound, like "${next}".`,
          shortMessage: "Grammar",
          severity: "grammar",
          replacements: [fixed],
        })
      );
    }
  }
  return issues;
}

// ---------- Subject-verb agreement (pronoun + "be"/"do"/"have", the most common ESL slip) ----------
const SVA_RULES = [
  [/\b(he|she|it)\s+(are|am)\b/gi, (pronoun) => `${pronoun} is`],
  [/\b(he|she|it)\s+don't\b/gi, (pronoun) => `${pronoun} doesn't`],
  [/\b(he|she|it)\s+have\b/gi, (pronoun) => `${pronoun} has`],
  [/\b(I)\s+(is|are)\b/gi, () => "I am"],
  [/\b(I)\s+has\b/gi, () => "I have"],
  [/\b(you|we|they)\s+(is|am)\b/gi, (pronoun) => `${pronoun} are`],
  [/\b(you|we|they)\s+doesn't\b/gi, (pronoun) => `${pronoun} don't`],
  [/\b(you|we|they)\s+has\b/gi, (pronoun) => `${pronoun} have`],
];

function checkSubjectVerbAgreement(text) {
  const issues = [];
  for (const [regex, fixFn] of SVA_RULES) {
    for (const m of findAll(regex, text)) {
      const pronoun = m[1];
      const fixed = fixFn(pronoun);
      issues.push(
        makeIssue({
          offset: m.index,
          length: m[0].length,
          message: `Subject-verb agreement: did you mean "${fixed}"?`,
          shortMessage: "Grammar",
          severity: "grammar",
          replacements: [fixed],
        })
      );
    }
  }
  return issues;
}

// ---------- Double negatives ----------
function checkDoubleNegatives(text) {
  const issues = [];
  for (const regex of DOUBLE_NEGATIVE_PATTERNS) {
    for (const m of findAll(regex, text)) {
      issues.push(
        makeIssue({
          offset: m.index,
          length: m[0].length,
          message: "This looks like a double negative, which can reverse your intended meaning.",
          shortMessage: "Grammar",
          severity: "grammar",
          replacements: [],
        })
      );
    }
  }
  return issues;
}

// ---------- Commonly confused words ----------
// High-confidence, pattern-scoped checks only: each rule fires on a specific
// surrounding context so it catches the real error without flagging the
// (far more common) correct usage of the same word elsewhere.
const CONFUSED_WORD_RULES = [
  // their / there / they're
  {
    regex: /\btheir\s+(is|are|was|were|going|gonna|has|have|will|be)\b/gi,
    build: (m) => "they're " + m[1],
    note: () => '"their" is possessive (their book). Here it looks like you mean "they\'re" (they are).',
  },
  {
    regex: /\bthere\s+(own|house|car|dog|cat|kids|family|job|money|team|idea|plan|decision)\b/gi,
    build: (m) => "their " + m[1],
    note: () => '"there" refers to a place. Here it looks like you mean the possessive "their".',
  },
  // your / you're
  {
    regex: /\byour\s+welcome\b/gi,
    build: () => "you're welcome",
    note: () => '"your" is possessive. Here it looks like you mean "you\'re" (you are).',
  },
  {
    regex: /\byour\s+(going|gonna|being|trying|kidding|joking|doing great|the best|amazing|awesome|right about)\b/gi,
    build: (m) => "you're " + m[1],
    note: () => '"your" is possessive. Here it looks like you mean "you\'re" (you are).',
  },
  // its / it's
  {
    regex: /\bits\s+(is|was|has|will|been|going|about|a|the|not|very|really)\b/gi,
    build: (m) => "it's " + m[1],
    note: () => '"its" is possessive (its color). Here it looks like you mean "it\'s" (it is).',
  },
  // then / than
  {
    regex: /\b(more|less|better|worse|greater|smaller|bigger|larger|rather|other|fewer|higher|lower)\s+then\b/gi,
    build: (m) => `${m[1]} than`,
    note: () => '"then" is for sequence/time. For comparisons, use "than".',
  },
  // to / too
  {
    regex: /\bto\s+(much|many|late|early|good|bad|hot|cold|big|small|far|long|short|expensive|difficult|hard|easy|slow|fast|tired|busy)\b/gi,
    build: (m) => `too ${m[1]}`,
    note: () => '"to" is a preposition/infinitive marker. For "excessively", use "too".',
  },
  // whose / who's
  {
    regex: /\bwhose\s+(is|are|was|were|going|been)\b/gi,
    build: (m) => "who's " + m[1],
    note: () => '"whose" is possessive (whose book). Here it looks like you mean "who\'s" (who is).',
  },
  // weather / whether
  {
    regex: /\bweather\s+or\s+not\b/gi,
    build: () => "whether or not",
    note: () => '"weather" refers to climate. Here you mean "whether" (a choice/condition).',
  },
  // "wether" is a rare, real dictionary word (a castrated ram) that almost
  // always shows up as an accidental typo of "whether" instead
  {
    regex: /\bwether\b/gi,
    build: () => "whether",
    note: () => '"wether" is a real but very rare word (a castrated ram). You almost certainly mean "whether".',
  },
  // loose / lose
  {
    regex: /\bloose\s+(weight|the game|the match|control|track|interest|hope|patience|my|your|his|her|their|our)\b/gi,
    build: (m) => `lose ${m[1]}`,
    note: () => '"loose" means not tight. Here it looks like you mean "lose" (to not win, or misplace).',
  },
  // could/should/would/might/must + "of" (should be "have")
  {
    regex: /\b(could|should|would|might|must)\s+of\b/gi,
    build: (m) => `${m[1]} have`,
    note: (m) => `"of" should be "have" after "${m[1]}".`,
  },
  // affect / effect (one very safe, high-confidence direction)
  {
    regex: /\bthe\s+affect\s+of\b/gi,
    build: () => "the effect of",
    note: () => '"affect" is usually a verb. As a noun here, you mean "effect".',
  },
];

function checkConfusedWords(text) {
  const issues = [];
  for (const rule of CONFUSED_WORD_RULES) {
    for (const m of findAll(rule.regex, text)) {
      const fixed = rule.build(m);
      issues.push(
        makeIssue({
          offset: m.index,
          length: m[0].length,
          message: `${rule.note(m)} Did you mean "${fixed}"?`,
          shortMessage: "Commonly confused words",
          severity: "grammar",
          replacements: [fixed],
        })
      );
    }
  }
  return issues;
}

// ---------- Double comparatives / superlatives ----------
const IRREGULAR_COMPARATIVES = [
  "better", "best", "worse", "worst", "more", "most", "less", "least",
  "further", "furthest", "farther", "farthest",
];
function checkComparatives(text) {
  const issues = [];
  const regex = new RegExp(`\\b(more|most)\\s+(${IRREGULAR_COMPARATIVES.join("|")}|\\w+er|\\w+est)\\b`, "gi");
  for (const m of findAll(regex, text)) {
    const qualifier = m[1];
    const word = m[2];
    const isIrregularDouble = IRREGULAR_COMPARATIVES.includes(word.toLowerCase());
    const endsComparative = /er$/i.test(word) && qualifier.toLowerCase() === "more";
    const endsSuperlative = /est$/i.test(word) && qualifier.toLowerCase() === "most";
    if (!isIrregularDouble && !endsComparative && !endsSuperlative) continue;

    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: `"${qualifier} ${word}" doubles up the comparison. Use just "${word}".`,
        shortMessage: "Double comparative",
        severity: "grammar",
        replacements: [word],
      })
    );
  }
  return issues;
}

// ---------- much / many & less / fewer (countable vs. uncountable nouns) ----------
const COUNTABLE_NOUNS = "people|things|cars|books|students|friends|times|problems|options|reasons|ideas|mistakes|items|questions|days|years|dollars|minutes|words|jobs|children|photos|emails|messages|files";
const UNCOUNTABLE_NOUNS = "information|money|water|advice|furniture|traffic|homework|luggage|equipment|news|patience|evidence|research|progress|software|content|feedback";

function checkCountableUncountable(text) {
  const issues = [];

  for (const m of findAll(new RegExp(`\\bmuch\\s+(${COUNTABLE_NOUNS})\\b`, "gi"), text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: `"${m[1]}" is countable, so use "many" instead of "much".`,
        shortMessage: "Countable/uncountable",
        severity: "grammar",
        replacements: [`many ${m[1]}`],
      })
    );
  }

  for (const m of findAll(new RegExp(`\\bmany\\s+(${UNCOUNTABLE_NOUNS})\\b`, "gi"), text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: `"${m[1]}" is uncountable, so use "much" instead of "many".`,
        shortMessage: "Countable/uncountable",
        severity: "grammar",
        replacements: [`much ${m[1]}`],
      })
    );
  }

  for (const m of findAll(new RegExp(`\\bless\\s+(${COUNTABLE_NOUNS})\\b`, "gi"), text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: `"${m[1]}" is countable, so use "fewer" instead of "less".`,
        shortMessage: "Countable/uncountable",
        severity: "grammar",
        replacements: [`fewer ${m[1]}`],
      })
    );
  }

  return issues;
}


function checkRepeatedWords(text) {
  const issues = [];
  for (const m of findAll(/\b(\w+)\s+\1\b/gi, text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: "Possible repeated word.",
        shortMessage: "Grammar",
        severity: "grammar",
        replacements: [m[1]],
      })
    );
  }
  return issues;
}

// ---------- Capitalization ----------
function checkCapitalization(text) {
  const issues = [];

  // standalone lowercase "i"
  for (const m of findAll(/\bi\b/g, text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: 1,
        message: 'The pronoun "I" should always be capitalized.',
        shortMessage: "Capitalization",
        severity: "grammar",
        replacements: ["I"],
      })
    );
  }

  // sentence start not capitalized (first letter of text, or after . ! ?)
  const sentenceStartRe = /(^\s*|[.!?]\s+)([a-z])/g;
  for (const m of findAll(sentenceStartRe, text)) {
    const letterOffset = m.index + m[1].length;
    issues.push(
      makeIssue({
        offset: letterOffset,
        length: 1,
        message: "Sentences should start with a capital letter.",
        shortMessage: "Capitalization",
        severity: "grammar",
        replacements: [m[2].toUpperCase()],
      })
    );
  }

  return issues;
}

// ---------- Spacing / punctuation ----------
function checkSpacingPunctuation(text) {
  const issues = [];

  for (const m of findAll(/ {2,}/g, text)) {
    issues.push(
      makeIssue({
        offset: m.index,
        length: m[0].length,
        message: "Extra whitespace.",
        shortMessage: "Punctuation",
        severity: "grammar",
        replacements: [" "],
      })
    );
  }

  for (const m of findAll(/[a-zA-Z]\s+([,.!?;:])/g, text)) {
    issues.push(
      makeIssue({
        offset: m.index + m[0].indexOf(m[1]) - 1,
        length: 2,
        message: `Remove the space before "${m[1]}".`,
        shortMessage: "Punctuation",
        severity: "grammar",
        replacements: [m[1]],
      })
    );
  }

  for (const m of findAll(/[,.!?;:](?=[A-Za-z])/g, text)) {
    issues.push(
      makeIssue({
        offset: m.index + 1,
        length: 0,
        message: `Add a space after "${m[0]}".`,
        shortMessage: "Punctuation",
        severity: "grammar",
        replacements: [" "],
      })
    );
  }

  return issues;
}

function dedupeOverlaps(issues) {
  const sorted = [...issues].sort((a, b) => a.offset - b.offset);
  const result = [];
  for (const issue of sorted) {
    const overlaps = result.some(
      (r) => issue.offset < r.offset + Math.max(r.length, 1) && r.offset < issue.offset + Math.max(issue.length, 1)
    );
    if (!overlaps) result.push(issue);
  }
  return result;
}

export async function checkText(text) {
  if (!text || !text.trim()) return { matches: [], source: "local" };

  const matches = dedupeOverlaps([
    ...checkContractions(text),
    ...checkArticles(text),
    ...checkSubjectVerbAgreement(text),
    ...checkConfusedWords(text),
    ...checkComparatives(text),
    ...checkCountableUncountable(text),
    ...checkDoubleNegatives(text),
    ...checkCapitalization(text),
    ...checkRepeatedWords(text),
    ...checkSpacingPunctuation(text),
    ...checkSpelling(text),
  ]);

  return { matches, source: "local" };
}
