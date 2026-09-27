import { Link } from "react-router-dom";
import { PenLine, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const features = [
  { icon: CheckCircle2, title: "Grammar & spelling", desc: "Catch typos, tense mistakes, and grammar slips in real time as you type." },
  { icon: Sparkles, title: "Style suggestions", desc: "Tighten wordy sentences and fix punctuation and clarity issues." },
  { icon: ShieldCheck, title: "Private & secure", desc: "Your documents are tied to your account and protected by JWT auth." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-6">
          <Sparkles size={14} /> Real-time writing assistant
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-ink-900 leading-[1.1] mb-6">
          Write with <span className="text-brand-600">confidence</span>,<br className="hidden sm:block" />
          every single time.
        </h1>
        <p className="text-base sm:text-lg text-ink-700/70 max-w-2xl mx-auto mb-9">
          Scribly checks your grammar, spelling and style as you write — so you can focus on the message,
          not the mistakes.
        </p>
        <Link
          to={user ? "/dashboard" : "/signup"}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-7 py-3.5 rounded-xl shadow-premium transition-colors"
        >
          <PenLine size={18} /> {user ? "Go to your documents" : "Start writing for free"}
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-card border border-black/5">
              <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 grid place-items-center mb-4">
                <f.icon size={20} />
              </div>
              <h3 className="font-bold text-ink-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink-700/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
