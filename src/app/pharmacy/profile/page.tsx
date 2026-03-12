"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PharmacyProfile() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "", ownerName: "", phone: "",
        address: "", city: "", state: "", pincode: "",
        openTime: "09:00", closeTime: "21:00",
    });
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("pharmacyToken");
        if (!token) { router.replace("/pharmacy/login"); return; }

        fetch("http://localhost:5002/api/pharmacy/me", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (!data.success) { router.replace("/pharmacy/login"); return; }
                const p = data.pharmacy;
                setForm({
                    name: p.name || "",
                    ownerName: p.ownerName || "",
                    phone: p.phone || "",
                    address: p.address || "",
                    city: p.city || "",
                    state: p.state || "",
                    pincode: p.pincode || "",
                    openTime: p.openTime || "09:00",
                    closeTime: p.closeTime || "21:00",
                });
                setWorkingDays(p.workingDays || []);
                if (p.latitude) setLatitude(p.latitude);
                if (p.longitude) setLongitude(p.longitude);
            })
            .catch(() => {
                const raw = localStorage.getItem("pharmacy");
                if (raw) {
                    const p = JSON.parse(raw);
                    setForm({
                        name: p.name || "", ownerName: p.ownerName || "", phone: p.phone || "",
                        address: p.address || "", city: p.city || "", state: p.state || "", pincode: p.pincode || "",
                        openTime: p.openTime || "09:00", closeTime: p.closeTime || "21:00",
                    });
                    setWorkingDays(p.workingDays || []);
                    if (p.latitude) setLatitude(p.latitude);
                    if (p.longitude) setLongitude(p.longitude);
                }
            });
    }, [router]);

    const detectLocation = () => {
        if (!navigator.geolocation) { setGeoStatus("error"); return; }
        setGeoStatus("loading");
        navigator.geolocation.getCurrentPosition(
            (pos) => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setGeoStatus("success"); },
            () => setGeoStatus("error"),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const toggleDay = (day: string) =>
        setWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        setError(""); setSuccess(false); setLoading(true);
        try {
            const token = localStorage.getItem("pharmacyToken");
            const res = await fetch("http://localhost:5002/api/pharmacy/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    workingDays,
                    ...(latitude != null ? { latitude } : {}),
                    ...(longitude != null ? { longitude } : {}),
                }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.message || "Failed to save"); return; }
            localStorage.setItem("pharmacy", JSON.stringify(data.pharmacy));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Profile & Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Update your pharmacy details, location, and hours.</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">✅ Profile saved successfully!</div>}

            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-800">Basic Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { name: "name", label: "Pharmacy Name" },
                        { name: "ownerName", label: "Owner Name" },
                        { name: "phone", label: "Phone" },
                    ].map((f) => (
                        <div key={f.name} className={f.name === "name" ? "sm:col-span-2" : ""}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                            <input
                                name={f.name}
                                type="text"
                                value={(form as any)[f.name]}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-800">📍 Location</h2>

                <button
                    type="button"
                    onClick={detectLocation}
                    disabled={geoStatus === "loading"}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        geoStatus === "success"
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                    }`}
                >
                    {geoStatus === "loading" && "⏳ Detecting…"}
                    {geoStatus === "success" && `✅ GPS updated (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})`}
                    {geoStatus === "error" && "❌ Detection failed"}
                    {geoStatus === "idle" && "📡 Re-detect GPS Location"}
                </button>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input name="address" type="text" value={form.address} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {["city", "state", "pincode"].map(f => (
                        <div key={f}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f}</label>
                            <input name={f} type="text" value={(form as any)[f]} onChange={handleChange}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Hours */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-800">🕐 Operating Hours</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Open Time</label>
                        <input name="openTime" type="time" value={form.openTime} onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Close Time</label>
                        <input name="closeTime" type="time" value={form.closeTime} onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map(day => (
                            <button key={day} type="button" onClick={() => toggleDay(day)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                                    workingDays.includes(day)
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "bg-white border-gray-300 text-gray-600 hover:border-emerald-400"
                                }`}
                            >{day}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={() => router.push("/pharmacy/dashboard")}
                    className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-medium transition">
                    Cancel
                </button>
                <button onClick={handleSave} disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                    {loading ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
