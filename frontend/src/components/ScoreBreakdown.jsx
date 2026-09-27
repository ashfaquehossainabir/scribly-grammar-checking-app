const CATEGORY_META = {
  correctness: { label: "Correctness", color: "bg-red-500" },
  clarity: { label: "Clarity", color: "bg-purple-500" },
  engagement: { label: "Engagement", color: "bg-orange-500" },
  delivery: { label: "Delivery", color: "bg-teal-500" },
};

export default function ScoreBreakdown({ scores }) {
  if (!scores) return null;
  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/5 p-5">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-ink-700/50 uppercase tracking-wide mb-1">
            Overall score
          </p>
          <p className="text-4xl font-extrabold text-ink-900 leading-none">
            {scores.overall}
            <span className="text-lg font-semibold text-ink-700/30">/100</span>
          </p>
        </div>
        <div
          className="h-14 w-14 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
          style={{
            background: `conic-gradient(#22b26e ${scores.overall}%, #e5e9e7 0)`,
          }}
        >
          <span className="h-10 w-10 rounded-full bg-white text-ink-900 grid place-items-center">
            {scores.overall}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-ink-800 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${meta.color}`} />
                {meta.label}
              </span>
              <span className="text-ink-700/50 font-medium">{scores[key] ?? 100}</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${meta.color} transition-all duration-500`}
                style={{ width: `${scores[key] ?? 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
