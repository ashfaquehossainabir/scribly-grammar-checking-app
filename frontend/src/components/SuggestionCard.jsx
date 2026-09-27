import { Check, X, Wand2 } from "lucide-react";

const CATEGORY_STYLE = {
  correctness: { label: "Correctness", dot: "bg-red-500", text: "text-red-700" },
  clarity: { label: "Clarity", dot: "bg-purple-500", text: "text-purple-700" },
  engagement: { label: "Engagement", dot: "bg-orange-500", text: "text-orange-700" },
  delivery: { label: "Delivery", dot: "bg-teal-500", text: "text-teal-700" },
};

export default function SuggestionCard({ issue, onApply, onDismiss }) {
  const style = CATEGORY_STYLE[issue.category] || CATEGORY_STYLE.correctness;

  if (issue.type === "rewrite") {
    return (
      <RewriteSuggestionCard issue={issue} style={style} onApply={onApply} onDismiss={onDismiss} />
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-card animate-fadeUp">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>
          {issue.shortMessage || style.label}
        </span>
      </div>

      <p className="text-sm text-ink-700 mb-3 leading-snug">{issue.message}</p>

      {issue.replacements && issue.replacements.length > 0 && issue.replacements.some(Boolean) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {issue.replacements.filter(Boolean).map((r, i) => (
            <button
              key={i}
              onClick={() => onApply(issue, r)}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1 border-t border-black/5">
        {issue.replacements?.[0] !== undefined && (
          <button
            onClick={() => onApply(issue, issue.replacements[0])}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 mt-2"
          >
            <Check size={14} /> Accept
          </button>
        )}
        <button
          onClick={() => onDismiss(issue)}
          className="flex items-center gap-1 text-xs font-semibold text-ink-700/60 hover:text-ink-900 mt-2"
        >
          <X size={14} /> Dismiss
        </button>
      </div>
    </div>
  );
}

// Sentence-level rewrite suggestion: tone variants (Formal / Confident /
// Friendly) or a single tightened "Improved" rewrite. Shows the original
// sentence for context, then one option per candidate rewrite.
function RewriteSuggestionCard({ issue, style, onApply, onDismiss }) {
  const isTone = issue.rewriteKind === "tone";

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-card animate-fadeUp">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 size={13} className={style.text} />
        <span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>
          {issue.shortMessage || (isTone ? "Tone rewrite" : "Improved sentence")}
        </span>
      </div>

      <p className="text-sm text-ink-700 mb-2 leading-snug">{issue.message}</p>

      {issue.original && (
        <p className="text-xs text-ink-700/50 italic mb-3 leading-snug line-clamp-2">
          "{issue.original.trim()}"
        </p>
      )}

      <div className="space-y-2 mb-3">
        {(issue.options || []).map((option, i) => (
          <div key={i} className="rounded-xl bg-black/[0.03] p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-wide ${style.text}`}>
                {option.label}
              </span>
              <button
                onClick={() => onApply(issue, option.text)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 shrink-0"
              >
                <Check size={13} /> Use this
              </button>
            </div>
            <p className="text-sm text-ink-900 leading-snug">{option.text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-black/5">
        <button
          onClick={() => onDismiss(issue)}
          className="flex items-center gap-1 text-xs font-semibold text-ink-700/60 hover:text-ink-900 mt-2"
        >
          <X size={14} /> Dismiss
        </button>
      </div>
    </div>
  );
}
