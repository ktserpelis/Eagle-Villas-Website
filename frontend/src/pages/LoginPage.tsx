// src/pages/LoginPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { loginSchema } from "@shared/schemas/auth.schema";
import { getApiErrorMessage, getApiFieldErrors } from "@/api/apiError";

interface FieldErrors {
  email?: string;
  password?: string;
}

const LoginPage: React.FC = () => {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // If already logged in, redirect (but only after auth has finished hydrating)
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (user.role === "ADMIN") navigate("/admin", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const flattened = result.error.flatten();
      setFieldErrors({
        email: flattened.fieldErrors.email?.[0],
        password: flattened.fieldErrors.password?.[0],
      });
      return;
    }

    try {
      setSubmitting(true);

      // Navigate immediately based on the returned user (more reliable than waiting for effects)
      const loggedInUser = await login(email, password);

      if (loggedInUser.role === "ADMIN") navigate("/admin", { replace: true });
      else navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Login failed"));

      const fieldErrs = getApiFieldErrors(err);
      if (fieldErrs) {
        setFieldErrors({
          email: fieldErrs.email?.[0],
          password: fieldErrs.password?.[0],
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-stone-100 via-stone-100 to-stone-200 px-4">
      <div className="w-full max-w-md md:max-w-lg bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-stone-900/10 border border-stone-200 p-6 md:p-8 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-semibold text-stone-900">
            Welcome back
          </h2>
          <p className="text-xs md:text-sm text-stone-600">
            Log in to manage your bookings or continue planning your stay at
            Eagle Villas.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-800">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-800">
              Password
            </label>
            <input
              type="password"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 text-amber-950 py-2.5 rounded-full text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-amber-900/30 transition-colors"
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-xs md:text-sm text-stone-600 text-center">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-amber-800 font-medium hover:text-amber-600 underline-offset-2 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
