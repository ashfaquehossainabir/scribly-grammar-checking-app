import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus, Trash2, Search, X, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import api from "../api/axios.js";

const SEARCH_DEBOUNCE_MS = 350;

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const isFirstRun = useRef(true);
  const debounceTimer = useRef(null);
  const requestId = useRef(0);

  // Initial load runs immediately; every later query change is debounced
  // so we don't hit the API on every keystroke.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      load(query);
      return;
    }
    setSearching(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => load(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function load(q) {
    const thisRequest = ++requestId.current;
    try {
      const res = await api.get("/documents", q ? { params: { q } } : undefined);
      // Ignore stale responses if a newer search has since been kicked off
      if (thisRequest !== requestId.current) return;
      setDocs(res.data);
    } finally {
      if (thisRequest === requestId.current) {
        setLoading(false);
        setSearching(false);
      }
    }
  }

  async function createDoc() {
    const res = await api.post("/documents", { title: "Untitled document", content: "" });
    navigate(`/editor/${res.data._id}`);
  }

  async function removeDoc(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this document?")) return;
    await api.delete(`/documents/${id}`);
    setDocs((prev) => prev.filter((d) => d._id !== id));
  }

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Your documents</h1>
            <p className="text-sm text-ink-700/60 mt-1">Pick up where you left off, or start something new.</p>
          </div>
          <button
            onClick={createDoc}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl shadow-card transition-colors"
          >
            <Plus size={18} /> New document
          </button>
        </div>

        <div className="relative max-w-md mb-8">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/40 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your documents…"
            className="w-full bg-white border border-black/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-ink-900 placeholder:text-ink-700/40 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-shadow"
          />
          {searching && !loading && (
            <Loader2
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-700/40 animate-spin"
            />
          )}
          {!searching && hasQuery && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-700/40 hover:text-ink-900 p-1 rounded-md hover:bg-black/5"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-white/60 animate-pulse border border-black/5" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          hasQuery ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-black/10">
              <Search className="mx-auto mb-4 text-ink-700/30" size={40} />
              <p className="text-ink-700/70 mb-5">
                No documents match <span className="font-semibold">"{query}"</span>.
              </p>
              <button
                onClick={() => setQuery("")}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-black/10">
              <FileText className="mx-auto mb-4 text-ink-700/30" size={40} />
              <p className="text-ink-700/70 mb-5">You don't have any documents yet.</p>
              <button
                onClick={createDoc}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Create your first document
              </button>
            </div>
          )
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {docs.map((doc) => (
              <Link
                key={doc._id}
                to={`/editor/${doc._id}`}
                className="group bg-white rounded-2xl p-5 shadow-card border border-black/5 hover:shadow-premium hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center">
                    <FileText size={17} />
                  </div>
                  <button
                    onClick={(e) => removeDoc(doc._id, e)}
                    className="opacity-0 group-hover:opacity-100 text-ink-700/40 hover:text-red-600 transition-all p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="font-bold text-ink-900 truncate mb-1">{doc.title || "Untitled document"}</h3>
                <p className="text-xs text-ink-700/50 mb-3">
                  Edited {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-ink-700/60 line-clamp-2 min-h-[2.5rem]">
                  {doc.content?.slice(0, 120) || "No content yet."}
                </p>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-black/5 text-xs text-ink-700/50">
                  <span>{doc.stats?.words || 0} words</span>
                  <span>·</span>
                  <span>{doc.stats?.issues || 0} issues</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
