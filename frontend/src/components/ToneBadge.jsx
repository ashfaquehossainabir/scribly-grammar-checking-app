import { Gauge, BookOpen } from "lucide-react";

export default function ToneBadge({ tone, readability }) {
  if (!tone) return null;
  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/5 p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-ink-700/50 uppercase tracking-wide mb-2">
          Tone
        </p>
        {tone.primary === "Neutral" ? (
          <span className="text-sm text-ink-700/60">Write a bit more to detect tone.</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-brand-50 text-brand-700">
              {tone.primary}
            </span>
            {tone.secondary && (
              <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-black/5 text-ink-700">
                {tone.secondary}
              </span>
            )}
          </div>
        )}
      </div>

      {readability && readability.words > 0 && (
        <div className="pt-3 border-t border-black/5 space-y-2">
          <p className="text-xs font-semibold text-ink-700/50 uppercase tracking-wide flex items-center gap-1.5">
            <BookOpen size={13} /> Readability
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-700/70">Reading level</span>
            <span className="font-semibold text-ink-900">{readability.gradeLevel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-700/70 flex items-center gap-1"><Gauge size={13}/> Flesch score</span>
            <span className="font-semibold text-ink-900">{readability.fleschScore}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-700/70">Avg. sentence length</span>
            <span className="font-semibold text-ink-900">{readability.avgWordsPerSentence} words</span>
          </div>
        </div>
      )}
    </div>
  );
}
