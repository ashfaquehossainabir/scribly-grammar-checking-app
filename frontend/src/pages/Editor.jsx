import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import SuggestionCard from "../components/SuggestionCard.jsx";
import ScoreBreakdown from "../components/ScoreBreakdown.jsx";
import ToneBadge from "../components/ToneBadge.jsx";
import api from "../api/axios.js";

const DEBOUNCE_MS = 900;
const UNDERLINE_CLASS = {
  correctness: "underline-error",
  clarity: "underline-clarity",
  engagement: "underline-engagement",
  delivery: "underline-delivery",
};
const TABS = [
  { key: "all", label: "All" },
  { key: "correctness", label: "Correctness" },
  { key: "clarity", label: "Clarity" },
  { key: "engagement", label: "Engagement" },
  { key: "delivery", label: "Delivery" },
];

function issueKey(i) {
  return `${i.offset}-${i.length}-${i.category}-${i.type || "issue"}`;
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("Untitled document");
  const [content, setContent] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [checking, setChecking] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const checkTimer = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await api.get(`/documents/${id}`);
      setTitle(res.data.title);
      setContent(res.data.content);
      setLoading(false);
    })();
  }, [id]);

  const runAnalysis = useCallback(async (text) => {
    setChecking(true);
    try {
      const res = await api.post("/ai/analyze", { text });
      setAnalysis(res.data);
    } catch {
      setAnalysis(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => runAnalysis(content), DEBOUNCE_MS);
    return () => clearTimeout(checkTimer.current);
  }, [content, loading, runAnalysis]);

  useEffect(() => {
    if (loading) return;
    setSaveState("dirty");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      await api.put(`/documents/${id}`, {
        title,
        content,
        issues: analysis?.issues?.length || 0,
      });
      setSaveState("saved");
    }, 1000);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  function applySuggestion(issue, replacement) {
    const before = content.slice(0, issue.offset);
    const after = content.slice(issue.offset + issue.length);
    setContent(before + (replacement ?? "") + after);
    setAnalysis((prev) => {
      if (!prev) return prev;
      if (issue.type === "rewrite") {
        return { ...prev, rewrites: (prev.rewrites || []).filter((i) => i !== issue) };
      }
      return { ...prev, issues: prev.issues.filter((i) => i !== issue) };
    });
  }

  function dismissSuggestion(issue) {
    setDismissed((prev) => new Set(prev).add(issueKey(issue)));
    setAnalysis((prev) => {
      if (!prev) return prev;
      if (issue.type === "rewrite") {
        return { ...prev, rewrites: (prev.rewrites || []).filter((i) => i !== issue) };
      }
      return { ...prev, issues: prev.issues.filter((i) => i !== issue) };
    });
  }

  function syncScroll() {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  const underlineIssues = (analysis?.issues || []).filter((i) => !dismissed.has(issueKey(i)));
  const allIssues = [...(analysis?.issues || []), ...(analysis?.rewrites || [])].filter(
    (i) => !dismissed.has(issueKey(i))
  );
  const visibleIssues =
    activeTab === "all" ? allIssues : allIssues.filter((i) => i.category === activeTab);

  function renderHighlighted() {
    if (!underlineIssues.length) return escapeHtml(content) + "\n";
    const sorted = [...underlineIssues].sort((a, b) => a.offset - b.offset);
    let cursor = 0;
    let html = "";
    for (const issue of sorted) {
      if (issue.offset < cursor) continue;
      html += escapeHtml(content.slice(cursor, issue.offset));
      const cls = UNDERLINE_CLASS[issue.category] || "underline-error";
      html += `<span class="${cls}">${escapeHtml(
        content.slice(issue.offset, issue.offset + issue.length)
      )}</span>`;
      cursor = issue.offset + issue.length;
    }
    html += escapeHtml(content.slice(cursor)) + "\n";
    return html;
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characters = content.length;

  const tabCounts = {
    all: allIssues.length,
    correctness: allIssues.filter((i) => i.category === "correctness").length,
    clarity: allIssues.filter((i) => i.category === "clarity").length,
    engagement: allIssues.filter((i) => i.category === "engagement").length,
    delivery: allIssues.filter((i) => i.category === "delivery").length,
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] flex flex-col">
      <Navbar />

      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-ink-700/60 hover:text-ink-900 p-1.5 rounded-lg hover:bg-black/5"
          >
            <ArrowLeft size={18} />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-bold text-ink-900 text-base bg-transparent focus:outline-none focus:bg-black/[0.03] rounded-lg px-2 py-1 flex-1 min-w-0"
          />
          <SaveIndicator state={saveState} />
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-[1400px] w-full px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="bg-white rounded-2xl shadow-card border border-black/5 overflow-hidden">
          <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto no-scrollbar border-b border-black/5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-700/50 hover:text-ink-900"
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className="ml-1.5 text-[10px] bg-black/10 text-ink-800 rounded-full px-1.5 py-0.5">
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative min-h-[55vh]">
            <div
              ref={highlightRef}
              aria-hidden="true"
              className="absolute inset-0 p-6 sm:p-8 whitespace-pre-wrap break-words font-[inherit] text-base leading-relaxed text-transparent pointer-events-none overflow-auto"
              dangerouslySetInnerHTML={{ __html: renderHighlighted() }}
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={syncScroll}
              placeholder="Start writing, or paste your text here…"
              spellCheck={false}
              className="relative w-full h-full min-h-[55vh] resize-none p-6 sm:p-8 bg-transparent text-base leading-relaxed text-ink-900 focus:outline-none placeholder:text-ink-700/30"
            />
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-t border-black/5 text-xs text-ink-700/50">
            <span>
              {words} words · {characters} characters
            </span>
            <span className="flex items-center gap-1.5">
              {checking && <Loader2 size={13} className="animate-spin" />}
              {checking ? "Analyzing…" : `${allIssues.length} suggestion${allIssues.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 space-y-4 w-full">
          <ScoreBreakdown scores={analysis?.scores} />
          <ToneBadge tone={analysis?.tone} readability={analysis?.readability} />

          {visibleIssues.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card border border-black/5 p-6 text-center">
              <Check className="mx-auto mb-2 text-brand-600" size={28} />
              <p className="text-sm font-semibold text-ink-900">Looking good!</p>
              <p className="text-xs text-ink-700/50 mt-1">
                No {activeTab === "all" ? "" : activeTab + " "}issues found right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {visibleIssues.map((issue, idx) => (
                <SuggestionCard
                  key={`${issue.offset}-${issue.length}-${issue.category}-${issue.type || "issue"}-${idx}`}
                  issue={issue}
                  onApply={applySuggestion}
                  onDismiss={dismissSuggestion}
                />
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function SaveIndicator({ state }) {
  const map = {
    saved: { text: "Saved", cls: "text-brand-700 bg-brand-50" },
    saving: { text: "Saving…", cls: "text-ink-700/60 bg-black/5" },
    dirty: { text: "Unsaved", cls: "text-amber-700 bg-amber-50" },
  };
  const s = map[state] || map.saved;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>
      {s.text}
    </span>
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
