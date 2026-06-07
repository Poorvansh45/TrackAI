// "use client";

// import { useState } from "react";
// import api from "@/lib/api";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

// const handleLogin = async () => {
//   try {
//     setLoading(true);

//     console.log({
//       email,
//       password,
//     });

//     const response = await api.post("/auth/login", {
//       email,
//       password,
//     });

//     localStorage.setItem(
//   "token",
//   response.data.access_token
// );

// localStorage.setItem(
//   "user",
//   JSON.stringify(response.data.user)
// );
//   window.location.href = "/dashboard";

//   } catch (error: any) {
//     console.log(error.response?.data);
//     console.error("LOGIN ERROR:", error);
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="w-full max-w-md space-y-4 p-6 border rounded-lg">
//         <h1 className="text-2xl font-bold">Login</h1>

//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           className="w-full border p-2 rounded"
//         />

//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           className="w-full border p-2 rounded"
//         />

//         <button
//           onClick={handleLogin}
//           disabled={loading}
//           className="w-full border p-2 rounded"
//         >
//           {loading ? "Logging in..." : "Login"}
//         </button>
//       </div>
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Target,
  TrendingUp,
  Mail,
  Lock,
  Sparkles,
} from "lucide-react";

import api from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem(
        "token",
        response.data.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      window.location.href = "/";
    } catch (error: any) {
      setError(
        error.response?.data?.detail ||
          "Login failed"
      );

      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px]" />

        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[120px]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:80px_80px] opacity-[0.03]" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* LEFT SIDE */}
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
                <h1 className="text-xl font-semibold">
                  SkillSync
                </h1>

                <p className="text-sm text-foreground-subtle">
                  Career Intelligence Platform
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <h2 className="text-5xl font-semibold leading-tight tracking-tight">
                Build the career roadmap that
                <span className="text-accent">
                  {" "}
                  matches your potential.
                </span>
              </h2>

              <p className="mt-6 text-lg text-foreground-muted leading-relaxed">
                Personalized assessments,
                AI-guided learning paths,
                progress analytics, and career
                insights designed for ambitious
                students.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="surface-card p-4">
                <Brain className="w-5 h-5 text-accent mb-3" />
                <p className="text-xs text-foreground-subtle">
                  Assessment
                </p>
                <h3 className="text-lg font-semibold mt-1">
                  AI Driven
                </h3>
              </div>

              <div className="surface-card p-4">
                <Target className="w-5 h-5 text-accent mb-3" />
                <p className="text-xs text-foreground-subtle">
                  Career Fit
                </p>
                <h3 className="text-lg font-semibold mt-1">
                  Personalized
                </h3>
              </div>

              <div className="surface-card p-4">
                <TrendingUp className="w-5 h-5 text-accent mb-3" />
                <p className="text-xs text-foreground-subtle">
                  Progress
                </p>
                <h3 className="text-lg font-semibold mt-1">
                  Track Growth
                </h3>
              </div>
            </div>

            <div className="surface-card p-5 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Current Learning Track
                </h3>

                <span className="text-[10px] text-accent font-medium">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>
                      Data Science Fundamentals
                    </span>
                    <span>100%</span>
                  </div>

                  <div className="h-1 bg-surface-3 rounded-full">
                    <div className="h-1 w-full bg-success rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>
                      Machine Learning
                    </span>
                    <span>68%</span>
                  </div>

                  <div className="h-1 bg-surface-3 rounded-full">
                    <div className="h-1 w-[68%] bg-accent rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>
                      System Design
                    </span>
                    <span>22%</span>
                  </div>

                  <div className="h-1 bg-surface-3 rounded-full">
                    <div className="h-1 w-[22%] bg-warning rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
                  </motion.div>

        {/* RIGHT SIDE */}
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
                  <Sparkles className="w-3 h-3" />
                  Welcome Back
                </div>

                <h1 className="text-3xl font-semibold tracking-tight">
                  Sign in to SkillSync
                </h1>

                <p className="text-foreground-muted mt-2">
                  Continue your personalized career journey.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-destructive-muted border border-destructive/20 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />

                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-3
                        bg-surface-2
                        border
                        border-border
                        rounded-lg
                        text-sm
                        text-foreground
                        placeholder:text-foreground-subtle
                        focus:outline-none
                        focus:border-accent
                        transition-colors
                      "
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-foreground-muted">
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-xs text-accent hover:text-accent-hover"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />

                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      className="
                        w-full
                        pl-10
                        pr-4
                        py-3
                        bg-surface-2
                        border
                        border-border
                        rounded-lg
                        text-sm
                        text-foreground
                        placeholder:text-foreground-subtle
                        focus:outline-none
                        focus:border-accent
                        transition-colors
                      "
                    />
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-violet-500"
                    />
                    <span className="text-foreground-muted">
                      Remember me
                    </span>
                  </label>
                </div>

                {/* Login Button */}
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="
                    w-full
                    bg-accent
                    hover:bg-accent-hover
                    text-accent-foreground
                    rounded-lg
                    py-3
                    font-medium
                    transition-colors
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  {loading ? (
                    "Signing In..."
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="relative my-8">
                <div className="border-t border-border" />
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-surface-1 px-3 text-xs text-foreground-subtle">
                  SkillSync Platform Access
                </span>
              </div>

              <div className="text-center">
                <p className="text-sm text-foreground-muted">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="text-accent hover:text-accent-hover font-medium"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-foreground-subtle mt-6">
              © 2026 SkillSync. Personalized career intelligence.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}