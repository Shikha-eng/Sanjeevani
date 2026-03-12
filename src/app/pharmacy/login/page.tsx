"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function PharmacyLoginPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const fd = new FormData(e.currentTarget);
        const body: Record<string, string> = {};
        fd.forEach((v, k) => { body[k] = v.toString(); });

        try {
            const endpoint =
                mode === "login"
                    ? "http://localhost:5002/api/pharmacy/login"
                    : "http://localhost:5002/api/pharmacy/signup";

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.message || "Authentication failed");
                return;
            }

            // Store token + pharmacy info
            localStorage.setItem("pharmacyToken", data.token);
            localStorage.setItem("pharmacy", JSON.stringify(data.pharmacy));

            // After signup → go to onboarding; after login check onboarding status
            if (mode === "signup" || !data.pharmacy.onboardingCompleted) {
                router.push("/pharmacy/onboarding");
            } else {
                router.push("/pharmacy/dashboard");
            }
        } catch {
            setError("Network error. Make sure the server is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white text-3xl shadow-lg mb-4">
                        💊
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Pharmacy Portal</h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Sanjeevani Healthcare Network
                    </p>
                </div>

                {/* Tab toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                    {(["login", "signup"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => { setMode(m); setError(""); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                mode === m
                                    ? "bg-white text-emerald-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {m === "login" ? "Sign In" : "Register Pharmacy"}
                        </button>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* ----- SIGNUP ONLY fields ----- */}
                        {mode === "signup" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pharmacy Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="name"
                                        type="text"
                                        required
                                        placeholder="e.g. MediCare Pharmacy"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Owner / Pharmacist Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="ownerName"
                                        type="text"
                                        required
                                        placeholder="Full name"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Drug License Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="licenseNumber"
                                        type="text"
                                        required
                                        placeholder="e.g. DL-MH-12345"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        name="phone"
                                        type="tel"
                                        placeholder="+91 9876543210"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* ----- SHARED fields ----- */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="pharmacy@example.com"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                autoComplete={mode === "login" ? "current-password" : "new-password"}
                                placeholder={mode === "signup" ? "Min 6 characters" : "Enter password"}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition shadow-sm mt-2"
                        >
                            {loading
                                ? mode === "login" ? "Signing in…" : "Creating account…"
                                : mode === "login" ? "Sign In" : "Create Account & Continue"}
                        </button>
                    </form>

                    {mode === "signup" && (
                        <p className="text-xs text-gray-400 text-center mt-4">
                            After registration you will be asked to add your pharmacy location and hours.
                        </p>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Not a pharmacy?{" "}
                    <a href="/login" className="text-emerald-600 underline">
                        Go to patient/doctor login
                    </a>
                </p>
            </div>
        </div>
    );
}
