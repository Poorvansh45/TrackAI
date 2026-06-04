// "use client";

// import { useState } from "react";
// import api from "@/lib/api";

// export default function RegisterPage() {
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleRegister = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       const response = await api.post("/auth/register", {
//         name,
//         email,
//         password,
//       });

//       localStorage.setItem(
//         "token",
//         response.data.access_token
//       );

//       localStorage.setItem(
//         "user",
//         JSON.stringify(response.data.user)
//       );

//       window.location.href = "/dashboard";
//     } catch (err: any) {
//       setError(
//         err.response?.data?.detail ||
//           "Registration failed"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background px-4">
//       <div className="w-full max-w-md border rounded-xl p-6 space-y-4 bg-white">
//         <h1 className="text-2xl font-bold">
//           Create Account
//         </h1>

//         <input
//           type="text"
//           placeholder="Full Name"
//           value={name}
//           onChange={(e) =>
//             setName(e.target.value)
//           }
//           className="w-full border p-3 rounded"
//         />

//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) =>
//             setEmail(e.target.value)
//           }
//           className="w-full border p-3 rounded"
//         />

//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) =>
//             setPassword(e.target.value)
//           }
//           className="w-full border p-3 rounded"
//         />

//         {error && (
//           <div className="text-red-500 text-sm">
//             {error}
//           </div>
//         )}

//         <button
//           onClick={handleRegister}
//           disabled={loading}
//           className="w-full border p-3 rounded"
//         >
//           {loading
//             ? "Creating Account..."
//             : "Create Account"}
//         </button>

//         <div className="text-sm text-center">
//           Already have an account?{" "}
//           <a
//             href="/login"
//             className="underline"
//           >
//             Login
//           </a>
//         </div>
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
  User,
  Mail,
  Lock,
  Sparkles,
} from "lucide-react";

import api from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
      ? 25
      : password.length < 8
      ? 50
      : password.length < 12
      ? 75
      : 100;

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/register", {
        name,
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

      window.location.href = "/dashboard";
    } catch (error: any) {
      setError(
        error.response?.data?.detail ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px]" />

        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full bg-accent/10 blur-[120px]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:80px_80px] opacity-[0.03]" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* LEFT PANEL */}
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
                Start building your
                <span className="text-accent">
                  {" "}
                  future today.
                </span>
              </h2>

              <p className="mt-6 text-lg text-foreground-muted leading-relaxed">
                Discover your strengths,
                identify skill gaps,
                and follow a personalized
                roadmap designed for your dream career.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="surface-card p-4">
                <Brain className="w-5 h-5 text-accent mb-3" />
                <p className="text-xs text-foreground-subtle">
                  Assessments
                </p>
                <h3 className="text-lg font-semibold mt-1">
                  AI Powered
                </h3>
              </div>

              <div className="surface-card p-4">
                <Target className="w-5 h-5 text-accent mb-3" />
                <p className="text-xs text-foreground-subtle">
                  Career Goals
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
                  SkillSync Journey
                </h3>

                <span className="text-[10px] text-accent font-medium">
                  ROADMAP
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>
                      Career Assessment
                    </span>
                    <span>Step 1</span>
                  </div>

                  <div className="h-1 bg-surface-3 rounded-full">
                    <div className="h-1 w-full bg-success rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>
                      Skill Gap Analysis
                    </span>
                    <span>Step 2</span>
                  </div>

                  <div className="h-1 bg-surface-3 rounded-full">
                    <div className="h-1 w-[70%] bg-accent rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>
                      Personalized Roadmap
                    </span>
                    <span>Step 3</span>
                  </div>

                  <div className="h-1 bg-surface-3 rounded-full">
                    <div className="h-1 w-[30%] bg-warning rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
                  </motion.div>

        {/* RIGHT PANEL */}
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
                  Join SkillSync
                </div>

                <h1 className="text-3xl font-semibold tracking-tight">
                  Create Your Account
                </h1>

                <p className="text-foreground-muted mt-2">
                  Begin your personalized career growth journey.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-destructive-muted border border-destructive/20 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2">
                    Full Name
                  </label>

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />

                    <input
                      type="text"
                      placeholder="Vaibhav Dubey"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                      onChange={(e) => setEmail(e.target.value)}
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
                  <label className="block text-sm text-foreground-muted mb-2">
                    Password
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />

                    <input
                      type="password"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-foreground-subtle">
                        Password Strength
                      </span>

                      <span className="text-accent">
                        {passwordStrength}%
                      </span>
                    </div>

                    <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{
                          width: `${passwordStrength}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-foreground-subtle mt-2">
                      Use at least 8 characters for better security.
                    </p>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-violet-500"
                  />

                  <span className="text-foreground-muted">
                    I agree to the Terms of Service and Privacy Policy.
                  </span>
                </div>

                {/* Register Button */}
                <button
                  onClick={handleRegister}
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
                    "Creating Account..."
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="relative my-8">
                <div className="border-t border-border" />

                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-surface-1 px-3 text-xs text-foreground-subtle">
                  SkillSync Platform
                </span>
              </div>

              <div className="text-center">
                <p className="text-sm text-foreground-muted">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-accent hover:text-accent-hover font-medium"
                  >
                    Sign In
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