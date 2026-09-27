import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PenLine, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-premium p-8 sm:p-10 animate-fadeUp">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-ink-900 mb-8 justify-center">
          <span className="h-9 w-9 rounded-xl bg-brand-600 text-white grid place-items-center">
            <PenLine size={18} />
          </span>
          Scribly
        </Link>

        <h1 className="text-2xl font-extrabold text-center text-ink-900 mb-1">Create your account</h1>
        <p className="text-center text-sm text-ink-700/70 mb-7">Free forever. No credit card needed.</p>

        {error && (
          <div className="mb-5 text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-ink-800 mb-1.5 block">Full name</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-black/10 pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-ink-800 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-black/10 pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-ink-800 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-black/10 pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-700/40 hover:text-ink-900"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 mt-2 shadow-card transition-colors"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-700/70 mt-7">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
