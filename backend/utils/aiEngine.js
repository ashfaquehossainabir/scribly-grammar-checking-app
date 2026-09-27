import { checkText } from "./grammarChecker.js";
import { analyzeClarity, analyzeEngagement, analyzeDelivery, computeReadability } from "./textAnalysis.js";
import { analyzeTone } from "./toneAnalyzer.js";
import { analyzeToneRewrites, analyzeImprovedSentences } from "./rewriteEngine.js";

/**
 * The AI engine: orchestrates every detector into one Grammarly-style
 * multi-category analysis. Everything here runs in-process, with zero
 * network calls and zero third-party APIs — the whole thing works
 * offline once the dependencies are installed.
 *
 *   Correctness  -> grammar & spelling, checked against a local ~188k-word
 *                   dictionary with our own edit-distance corrector
 *                   (grammarChecker.js + dictionary.js + spellChecker.js)
 *   Clarity      -> passive voice, wordiness, long sentences
 *   Engagement   -> filler words, weak vocabulary, sentence variety
 *   Delivery     -> tone, hedging, shouting, punctuation overuse
 *
 * Returns a single unified, offset-accurate issue list plus scores,
 * a tone badge, and readability stats.
 */
export async function analyzeWithAI(text) {
  if (!text || !text.trim()) {
    return {
      issues: [],
      rewrites: [],
      counts: { correctness: 0, clarity: 0, engagement: 0, delivery: 0 },
      scores: { overall: 100, correctness: 100, clarity: 100, engagement: 100, delivery: 100 },
      readability: computeReadability(""),
      tone: analyzeTone(""),
    };
  }

  const correctnessResult = await checkText(text);
  const correctnessIssues = (correctnessResult.matches || []).map((m) => ({
    ...m,
    category: "correctness",
  }));

  const clarityIssues = analyzeClarity(text);
  const engagementIssues = analyzeEngagement(text);
  const deliveryIssues = analyzeDelivery(text);

  // Sentence-level rewrite suggestions (tone variants + tightened rewrites).
  // Kept in their own array rather than merged into `all` below: they span
  // whole sentences, so merging them into the offset-based dedupe/underline
  // logic would swallow the smaller word-level issues inside that span.
  const toneRewrites = analyzeToneRewrites(text);
  const improvedRewrites = analyzeImprovedSentences(text);
  const rewrites = [...toneRewrites, ...improvedRewrites];

  // De-duplicate overlapping spans, preferring correctness > clarity > engagement > delivery
  const all = dedupeByOffset([
    ...correctnessIssues,
    ...clarityIssues,
    ...engagementIssues,
    ...deliveryIssues,
  ]);

  const counts = {
    correctness: all.filter((i) => i.category === "correctness").length,
    clarity: all.filter((i) => i.category === "clarity").length + improvedRewrites.length,
    engagement: all.filter((i) => i.category === "engagement").length,
    delivery: all.filter((i) => i.category === "delivery").length + toneRewrites.length,
  };

  const scores = {
    correctness: clamp(100 - counts.correctness * 6),
    clarity: clamp(100 - counts.clarity * 5),
    engagement: clamp(100 - counts.engagement * 4),
    delivery: clamp(100 - counts.delivery * 5),
  };
  scores.overall = clamp(
    Math.round(
      scores.correctness * 0.4 + scores.clarity * 0.25 + scores.engagement * 0.2 + scores.delivery * 0.15
    )
  );

  return {
    issues: all.sort((a, b) => a.offset - b.offset),
    rewrites,
    counts,
    scores,
    readability: computeReadability(text),
    tone: analyzeTone(text),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

function dedupeByOffset(issues) {
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
