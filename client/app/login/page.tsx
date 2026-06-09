"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Brain, Target, TrendingUp, Mail, Lock, Sparkles } from "lucide-react";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [redirectPath, setRedirectPath] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redir = params.get("redirect");
      if (redir) {
        setRedirectPath(redir);
      }
    }
  }, []);

  // If already logged in, send straight to home or target redirect
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace(redirectPath);
    } else {
      setCheckingAuth(false);
    }
  }, [router, redirectPath]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      // Land on home or redirected page
      window.location.replace(redirectPath);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Login failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-md bg-accent/20 flex items-center justify-center animate-pulse">
          <span className="text-accent font-bold text-xs">T</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:80px_80px] opacity-[0.03]" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col justify-between p-12 xl:p-16"
        >
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Tracks AI</h1>
                <p className="text-sm text-foreground-subtle">AI Learning Operating System</p>
              </div>
            </div>
            <div className="max-w-xl">
              <h2 className="text-5xl font-semibold leading-tight tracking-tight">
                Build the career roadmap that
                <span className="text-accent"> matches your potential.</span>
              </h2>
              <p className="mt-6 text-lg text-foreground-muted leading-relaxed">
                Personalized assessments, AI-guided learning paths, progress analytics,
                and career insights designed for ambitious learners.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-12">
              {[
                { icon: Brain, label: "Assessment", sub: "AI Driven" },
                { icon: Target, label: "Career Fit", sub: "Personalized" },
                { icon: TrendingUp, label: "Progress", sub: "Track Growth" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="surface-card p-4">
                  <Icon className="w-5 h-5 text-accent mb-3" />
                  <p className="text-xs text-foreground-subtle">{label}</p>
                  <h3 className="text-lg font-semibold mt-1">{sub}</h3>
                </div>
              ))}
            </div>
            <div className="surface-card p-5 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Current Learning Track</h3>
                <span className="text-[10px] text-accent font-medium">ACTIVE</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Data Science Fundamentals", pct: 100, color: "bg-success" },
                  { label: "Machine Learning", pct: 68, color: "bg-accent" },
                  { label: "System Design", pct: 22, color: "bg-warning" },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-2">
                      <span>{label}</span><span>{pct}%</span>
                    </div>
                    <div className="h-1 bg-surface-3 rounded-full">
                      <div className={`h-1 ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center p-6 lg:p-12"
        >
          <div className="w-full max-w-md">
            <div className="surface-card p-8">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted text-accent text-xs font-medium mb-4">
                  <Sparkles className="w-3 h-3" />Welcome Back
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">Sign in to Tracks AI</h1>
                <p className="text-foreground-muted mt-2">Continue your personalized learning journey.</p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-destructive-muted border border-destructive/20 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-foreground-muted mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-foreground-muted">Password</label>
                    <button type="button" className="text-xs text-accent hover:text-accent-hover">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? "Signing In..." : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <div className="relative my-8">
                <div className="border-t border-border" />
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-surface-1 px-3 text-xs text-foreground-subtle">Tracks AI Platform</span>
              </div>

              <div className="text-center">
                <p className="text-sm text-foreground-muted">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-accent hover:text-accent-hover font-medium">Create Account</Link>
                </p>
              </div>
            </div>
            <p className="text-center text-xs text-foreground-subtle mt-6">© 2026 Tracks AI. AI-powered learning.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
