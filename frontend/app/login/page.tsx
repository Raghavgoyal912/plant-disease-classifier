"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Step = "email" | "code";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) setError("That code didn't work. Check it or ask for a new one.");
    // On success AuthProvider sees the session and redirects to "/".
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  const input =
    "w-full rounded-xl bg-surface-raised px-4 py-3 text-text outline-none focus:ring-2 focus:ring-leaf";
  const primary =
    "w-full rounded-xl bg-leaf px-4 py-3 font-semibold text-background disabled:opacity-60";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-typewriter text-5xl text-text">PatraVyadhi</h1>
      <p className="mt-3 text-text">Sign in to scan and keep your leaf history.</p>

      <div className="mt-8 rounded-2xl bg-card p-6">
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block text-sm text-text" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={input}
            />
            <button type="submit" disabled={busy || !email} className={primary}>
              {busy ? "Sending…" : "Email me a code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-text">
              We sent a code to <strong>{email}</strong>.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Code"
              className={`${input} tracking-widest`}
            />
            <button type="submit" disabled={busy || code.length < 6} className={primary}>
              {busy ? "Checking…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="text-sm text-text underline"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-text">{error}</p>}

        <div className="my-6 text-center text-sm text-text">or</div>

        <button
          type="button"
          onClick={google}
          className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-text"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}