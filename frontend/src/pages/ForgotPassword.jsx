import React, { useState } from "react";
import { Leaf, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export const ForgotPassword = ({ onNavigateLogin }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/25 mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Enter your email to receive recovery instructions
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Reset Link Dispatched</h3>
              <p className="text-xs text-slate-300">
                We sent password recovery instructions to <strong className="text-emerald-400">{email}</strong>.
              </p>
              <button
                onClick={onNavigateLogin}
                className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-xs"
              >
                Send Reset Link
              </button>

              <button
                type="button"
                onClick={onNavigateLogin}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
