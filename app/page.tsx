"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isRegistering, setIsRegistering] = useState(false);
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isRegistering) {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alias, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");

        const signInRes = await signIn("credentials", {
          redirect: false,
          alias,
          password,
        });

        if (signInRes?.error) setError(signInRes.error);
        else router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await signIn("credentials", {
          redirect: false,
          alias,
          password,
        });
        if (res?.error) setError(res.error);
        else router.push("/dashboard");
      } catch {
        setError("Login failed");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />

      <main className="min-h-screen flex items-center justify-center bg-gray-100 relative overflow-hidden font-[Inter,sans-serif] px-4">
        {/* Decorative blobs */}
        <div className="absolute -top-[10%] -left-[10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-200 rounded-full blur-[80px] opacity-60 z-0" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-blue-100 rounded-full blur-[80px] opacity-60 z-0" />
        <div className="hidden md:block absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-pink-100 rounded-full blur-[80px] opacity-40 z-0" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gray-800 text-white rounded-full flex items-center justify-center">
                <span className="material-icons text-lg md:text-xl">shield</span>
              </div>
              <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                CSEView <span className="text-[#3659b9]">is Back</span>
              </span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/92 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-6 md:p-10">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                {isRegistering ? "Create Technician Account" : "Welcome back"}
              </h1>
              <p className="text-sm text-gray-500">
                {isRegistering
                  ? "Register a unique tech alias and password."
                  : "Please enter your details to sign in."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Alias */}
              <div>
                <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
                  Tech Alias
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="material-icons text-lg text-gray-400">badge</span>
                  </div>
                  <input
                    id="alias"
                    type="text"
                    required
                    placeholder="your.alias"
                    className="block w-full py-3 pl-10 pr-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm outline-none transition-all focus:border-gray-800 focus:ring-2 focus:ring-gray-800/8 placeholder:text-gray-400"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="material-icons text-lg text-gray-400">lock</span>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="block w-full py-3 pl-10 pr-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm outline-none transition-all focus:border-gray-800 focus:ring-2 focus:ring-gray-800/8 placeholder:text-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {!isRegistering && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                    <input type="checkbox" name="remember" className="rounded border-gray-300" />
                    Remember me
                  </label>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 md:py-4 border-none rounded-xl bg-gray-800 text-white text-sm font-semibold cursor-pointer transition-all shadow-[0_4px_14px_rgba(31,41,55,0.25)] hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(31,41,55,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none active:scale-[0.98]"
              >
                {loading ? "Processing..." : isRegistering ? "Create Account" : "Sign in"}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 md:mt-7 text-center text-sm text-gray-500">
              {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                }}
                className="bg-transparent border-none font-semibold text-gray-900 cursor-pointer underline"
                disabled={loading}
              >
                {isRegistering ? "Sign in instead" : "Create free account"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
