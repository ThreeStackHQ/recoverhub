"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to create account");
        return;
      }

      // Auto sign-in
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created. Please sign in.");
        router.push("/auth/login");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#131829] rounded-2xl border border-white/10 p-8 shadow-2xl">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#ef4343] mb-4">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="text-[#8892A7] mt-1 text-sm">Start recovering failed payments today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-[#ef4343]/10 border border-[#ef4343]/30 rounded-lg px-4 py-3">
            <p className="text-[#ef4343] text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#8892A7] mb-1.5">
            Full name <span className="text-[#8892A7]/50">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-3.5 py-2.5 bg-[#0B0F1E] border border-white/10 rounded-lg text-white placeholder-[#8892A7]/60 focus:outline-none focus:ring-2 focus:ring-[#ef4343] focus:border-transparent text-sm transition"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#8892A7] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 bg-[#0B0F1E] border border-white/10 rounded-lg text-white placeholder-[#8892A7]/60 focus:outline-none focus:ring-2 focus:ring-[#ef4343] focus:border-transparent text-sm transition"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#8892A7] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="w-full px-3.5 py-2.5 bg-[#0B0F1E] border border-white/10 rounded-lg text-white placeholder-[#8892A7]/60 focus:outline-none focus:ring-2 focus:ring-[#ef4343] focus:border-transparent text-sm transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#ef4343] hover:bg-[#d63c3c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-[#ef4343] focus:ring-offset-2 focus:ring-offset-[#131829]"
        >
          {loading ? "Creating account…" : "Create account — it's free"}
        </button>
      </form>

      <p className="text-center text-sm text-[#8892A7] mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#ef4343] hover:text-[#ff6b6b] font-medium transition">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-[#8892A7]/50 mt-4">
        By signing up you agree to our{" "}
        <Link href="/terms" className="hover:text-[#8892A7]">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" className="hover:text-[#8892A7]">Privacy Policy</Link>
      </p>
    </div>
  );
}
