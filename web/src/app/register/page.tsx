"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Passwords do not match");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);

    try {
      const res = await fetch("/api/auth?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Registration failed");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err) {
      setError("Network error");
      setLoading(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black px-4">
      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-sm border border-slate-800 rounded-xl p-8 shadow-lg">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Create an account</h1>
          <p className="text-sm text-slate-400">Start monitoring water data with AquaSense</p>
        </header>

        {error && (
          <div role="alert" className="mb-4 text-red-300 bg-red-900/40 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <div className="flex items-center gap-2 border border-slate-700 rounded px-3 py-2 bg-slate-800">
              <Mail className="w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 outline-none bg-transparent text-slate-100 placeholder-slate-500"
                required
              />
            </div>
          </label>

          <label className="block">
            <div className="flex items-center gap-2 border border-slate-700 rounded px-3 py-2 bg-slate-800">
              <Lock className="w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="flex-1 outline-none bg-transparent text-slate-100 placeholder-slate-500"
                required
                minLength={8}
              />
            </div>
          </label>

          <div aria-hidden className="flex gap-1 mt-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${i < strength ? "bg-emerald-400" : "bg-slate-700"}`}
              />
            ))}
          </div>

          <label className="block">
            <div className="flex items-center gap-2 border border-slate-700 rounded px-3 py-2 bg-slate-800">
              <Lock className="w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className="flex-1 outline-none bg-transparent text-slate-100 placeholder-slate-500"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered? <a href="/login" className="text-emerald-300">Sign in</a>
        </div>
      </div>
    </div>
  );
}
