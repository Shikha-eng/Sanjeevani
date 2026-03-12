"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PharmacyOnboarding() {
    const router = useRouter();

    const [pharmacyName, setPharmacyName] = useState("");
    const [form, setForm] = useState({
        address: "",
        city: "",
        state: "",
        pincode: "",
        openTime: "09:00",
        closeTime: "21:00",
        phone: "",
    });
    const [workingDays, setWorkingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState(1); // 1 = location, 2 = hours

    useEffect(() => {
        const raw = localStorage.getItem("pharmacy");
        if (!raw) { router.replace("/pharmacy/login"); return; }
        const p = JSON.parse(raw);
        if (p.onboardingCompleted) { router.replace("/pharmacy/dashboard"); return; }
        setPharmacyName(p.name || "Your Pharmacy");

        // Pre-fill data if partially saved
        if (p.address) setForm(prev => ({ ...prev, address: p.address || "" }));
        if (p.city) setForm(prev => ({ ...prev, city: p.city || "" }));
        if (p.state) setForm(prev => ({ ...prev, state: p.state || "" }));
        if (p.pincode) setForm(prev => ({ ...prev, pincode: p.pincode || "" }));
        if (p.latitude) setLatitude(p.latitude);
        if (p.longitude) setLongitude(p.longitude);
        if (p.openTime) setForm(prev => ({ ...prev, openTime: p.openTime }));
        if (p.closeTime) setForm(prev => ({ ...prev, closeTime: p.closeTime }));
        if (p.phone) setForm(prev => ({ ...prev, phone: p.phone || "" }));
        if (p.workingDays?.length) setWorkingDays(p.workingDays);
    }, [router]);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setGeoStatus("error");
            return;
        }
        setGeoStatus("loading");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude);
                setLongitude(pos.coords.longitude);
                setGeoStatus("success");
            },
            () => setGeoStatus("error"),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const toggleDay = (day: string) => {
        setWorkingDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        if (!form.address || !form.city || !form.state || !form.pincode) {
            setError("Please fill in all address fields.");
            return;
        }
        if (!form.openTime || !form.closeTime) {
            setError("Please set opening and closing times.");
            return;
        }
        if (workingDays.length === 0) {
            setError("Please select at least one working day.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("pharmacyToken");
            const response = await fetch("http://localhost:5002/api/pharmacy/onboarding", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...form,
                    workingDays,
                    ...(latitude != null ? { latitude } : {}),
                    ...(longitude != null ? { longitude } : {}),
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.message || "Failed to save onboarding data.");
                return;
            }

            localStorage.setItem("pharmacy", JSON.stringify(data.pharmacy));
            router.push("/pharmacy/dashboard");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white text-2xl shadow mb-3">
                        💊
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900">
                        Welcome, {pharmacyName}!
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Let &apos;s set up your pharmacy profile so patients can find you.
                    </p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    {[1, 2].map((s) => (
                        <React.Fragment key={s}>
                            <button
                                onClick={() => setStep(s)}
                                className={`w-9 h-9 rounded-full text-sm font-bold transition-colors ${
                                    step === s
                                        ? "bg-emerald-600 text-white shadow"
                                        : s < step
                                        ? "bg-emerald-200 text-emerald-700"
                                        : "bg-gray-200 text-gray-500"
                                }`}
                            >
                                {s < step ? "✓" : s}
                            </button>
                            {s < 2 && <div className={`flex-1 max-w-16 h-1 rounded-full ${s < step ? "bg-emerald-400" : "bg-gray-200"}`} />}
                        </React.Fragment>
                    ))}
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    {/* ── STEP 1: Location ── */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-2xl">📍</span> Pharmacy Location
                            </h2>

                            {/* GPS detector */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <p className="text-sm text-emerald-800 font-medium mb-3">
                                    Use your device GPS to auto-fill coordinates (strongly recommended for patients to find you on map).
                                </p>
                                <button
                                    type="button"
                                    onClick={detectLocation}
                                    disabled={geoStatus === "loading"}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                        geoStatus === "success"
                                            ? "bg-emerald-600 text-white"
                                            : geoStatus === "error"
                                            ? "bg-red-100 text-red-700 border border-red-200"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                                    }`}
                                >
                                    {geoStatus === "loading" && "⏳ Detecting…"}
                                    {geoStatus === "success" && `✅ Location captured (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})`}
                                    {geoStatus === "error" && "❌ Could not detect — fill address manually"}
                                    {geoStatus === "idle" && "📡 Detect My Location"}
                                </button>
                            </div>

                            {/* Full address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Street Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="address"
                                    type="text"
                                    value={form.address}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. 42, MG Road, Near Bus Stand"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="city"
                                        type="text"
                                        value={form.city}
                                        onChange={handleChange}
                                        required
                                        placeholder="Mumbai"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        State <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="state"
                                        type="text"
                                        value={form.state}
                                        onChange={handleChange}
                                        required
                                        placeholder="Maharashtra"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pincode <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="pincode"
                                        type="text"
                                        value={form.pincode}
                                        onChange={handleChange}
                                        required
                                        maxLength={10}
                                        placeholder="400001"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Phone
                                </label>
                                <input
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+91 9876543210"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!form.address || !form.city || !form.state || !form.pincode) {
                                            setError("Please fill in all required address fields first.");
                                            return;
                                        }
                                        setError("");
                                        setStep(2);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition"
                                >
                                    Next: Operating Hours →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Hours ── */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-2xl">🕐</span> Operating Hours
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Opening Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="openTime"
                                        type="time"
                                        value={form.openTime}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Closing Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="closeTime"
                                        type="time"
                                        value={form.closeTime}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Working Days <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_DAYS.map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                                                workingDays.includes(day)
                                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                                    : "bg-white border-gray-300 text-gray-600 hover:border-emerald-400"
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                                <p><span className="font-semibold">📍 Address:</span> {form.address}, {form.city}, {form.state} - {form.pincode}</p>
                                {latitude && <p><span className="font-semibold">🌐 GPS:</span> {latitude.toFixed(5)}, {longitude?.toFixed(5)}</p>}
                                <p><span className="font-semibold">🕐 Hours:</span> {form.openTime} – {form.closeTime}</p>
                                <p><span className="font-semibold">📅 Open on:</span> {workingDays.join(", ")}</p>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-medium transition"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
                                >
                                    {loading ? "Saving…" : "Complete Setup →"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
