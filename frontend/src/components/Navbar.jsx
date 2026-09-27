import { Link, useNavigate } from "react-router-dom";
import { PenLine, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-ink-900">
          <span className="h-8 w-8 rounded-xl bg-brand-600 text-white grid place-items-center shadow-card">
            <PenLine size={18} />
          </span>
          Scribly
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-ink-700">
              Hi, <span className="font-semibold">{user.name.split(" ")[0]}</span>
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium text-ink-700 px-3 py-2 rounded-lg hover:bg-black/5 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg shadow-card transition-colors"
            >
              Sign up free
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
