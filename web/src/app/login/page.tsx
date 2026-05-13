"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";

function estimatePasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 5);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return setError("Please enter your email");
    if (!password) return setError("Please enter your password");

    setLoading(true);
    try {
      const res = await fetch("/api/auth?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err) {
      setError("Network error");
      setLoading(false);
    }
  }

  const strength = estimatePasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black px-4">
      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-sm border border-slate-800 rounded-xl p-8 shadow-lg">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Welcome back</h1>
          <p className="text-sm text-slate-400">Sign in to continue to AquaSense</p>
        </header>

        {error && (
          <div role="alert" className="mb-4 text-red-300 bg-red-900/40 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="sr-only">Email</span>
            <div className="flex items-center gap-2 border border-slate-700 rounded px-3 py-2 bg-slate-800">
              <Mail className="w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 outline-none bg-transparent text-slate-100 placeholder-slate-500"
                aria-label="Email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <div className="flex items-center gap-2 border border-slate-700 rounded px-3 py-2 bg-slate-800">
              <Lock className="w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="flex-1 outline-none bg-transparent text-slate-100 placeholder-slate-500"
                aria-label="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-sm text-slate-400"
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div aria-hidden className="flex gap-1 mt-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${i < strength ? "bg-emerald-400" : "bg-slate-700"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <a href="/register" className="text-emerald-300">Create account</a>
            <a href="#" className="text-slate-400">Forgot password?</a>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          By continuing you agree to our terms and privacy.
        </div>
      </div>
    </div>
  );
}
