"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PharmacyData {
    id: string;
    name: string;
    ownerName: string;
    email: string;
    phone: string | null;
    licenseNumber: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    openTime: string | null;
    closeTime: string | null;
    workingDays: string[];
    onboardingCompleted: boolean;
}

interface IncomingPrescription {
    id: string;
    medications: string;
    instructions: string;
    status: "sent" | "dispensed";
    sentAt: string;
    dispensedAt: string | null;
    doctor: {
        name: string;
        specialization: string;
    } | null;
    patient: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
    } | null;
}

function formatTime(t: string | null) {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${ampm}`;
}

function isOpenNow(openTime: string | null, closeTime: string | null, workingDays: string[]) {
    if (!openTime || !closeTime) return false;
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = dayNames[now.getDay()];
    if (!workingDays.includes(today)) return false;

    const [oh, om] = openTime.split(":").map(Number);
    const [ch, cm] = closeTime.split(":").map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    return nowMins >= openMins && nowMins <= closeMins;
}

export default function PharmacyDashboard() {
    const router = useRouter();
    const [pharmacy, setPharmacy] = useState<PharmacyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [prescriptions, setPrescriptions] = useState<IncomingPrescription[]>([]);
    const [loadingRx, setLoadingRx] = useState(true);
    const [dispensingId, setDispensingId] = useState<string | null>(null);

    const loadIncomingPrescriptions = async () => {
        try {
            const token = localStorage.getItem("pharmacyToken");
            if (!token) return;

            setLoadingRx(true);
            const response = await fetch("http://localhost:5002/api/pharmacy/prescriptions/incoming", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setPrescriptions(data.data || []);
            }
        } catch {
        } finally {
            setLoadingRx(false);
        }
    };

    const markDispensed = async (prescriptionId: string) => {
        try {
            setDispensingId(prescriptionId);
            const token = localStorage.getItem("pharmacyToken");
            const response = await fetch(`http://localhost:5002/api/pharmacy/prescriptions/${prescriptionId}/dispense`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.message || "Could not mark as dispensed");
                return;
            }
            await loadIncomingPrescriptions();
        } catch {
            alert("Failed to update prescription status");
        } finally {
            setDispensingId(null);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("pharmacyToken");
        const raw = localStorage.getItem("pharmacy");

        if (!token || !raw) {
            router.replace("/pharmacy/login");
            return;
        }

        // Verify token with server and get fresh data
        fetch("http://localhost:5002/api/pharmacy/me", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (!data.success) {
                    router.replace("/pharmacy/login");
                    return;
                }
                const p = data.pharmacy;
                localStorage.setItem("pharmacy", JSON.stringify(p));
                if (!p.onboardingCompleted) {
                    router.replace("/pharmacy/onboarding");
                    return;
                }
                setPharmacy(p);
                loadIncomingPrescriptions();
            })
            .catch(() => {
                // Fallback to cached data if backend is temporarily unavailable
                try {
                    const cached: PharmacyData = JSON.parse(raw);
                    if (!cached.onboardingCompleted) { router.replace("/pharmacy/onboarding"); return; }
                    setPharmacy(cached);
                    loadIncomingPrescriptions();
                } catch {
                    router.replace("/pharmacy/login");
                }
            })
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-4xl mb-3">💊</div>
                    <p className="text-gray-500">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    if (!pharmacy) return null;

    const open = isOpenNow(pharmacy.openTime, pharmacy.closeTime, pharmacy.workingDays);

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">{pharmacy.name}</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Owner: {pharmacy.ownerName} · License: {pharmacy.licenseNumber}
                    </p>
                </div>
                <span
                    className={`w-fit px-4 py-1.5 rounded-full text-sm font-semibold border ${
                        open
                            ? "bg-green-100 border-green-300 text-green-700"
                            : "bg-red-100 border-red-200 text-red-600"
                    }`}
                >
                    {open ? "🟢 Open Now" : "🔴 Closed"}
                </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Opening", value: formatTime(pharmacy.openTime), icon: "🌅" },
                    { label: "Closing", value: formatTime(pharmacy.closeTime), icon: "🌆" },
                    { label: "Working Days", value: `${pharmacy.workingDays.length} days/week`, icon: "📅" },
                    { label: "Phone", value: pharmacy.phone || "Not set", icon: "📞" },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-2xl mb-1">{s.icon}</p>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{s.label}</p>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>📍</span> Location Details
                    </h2>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold text-gray-500">Address:</span> {pharmacy.address}</p>
                        <p><span className="font-semibold text-gray-500">City:</span> {pharmacy.city}</p>
                        <p><span className="font-semibold text-gray-500">State:</span> {pharmacy.state}</p>
                        <p><span className="font-semibold text-gray-500">Pincode:</span> {pharmacy.pincode}</p>
                        {pharmacy.latitude && (
                            <p>
                                <span className="font-semibold text-gray-500">GPS:</span>{" "}
                                {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude?.toFixed(5)}
                            </p>
                        )}
                    </div>

                    {pharmacy.latitude && pharmacy.longitude && (
                        <a
                            href={`https://www.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
                        >
                            🗺️ View on Google Maps
                        </a>
                    )}
                </div>

                {/* Hours card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🕐</span> Operating Hours
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Opens at</span>
                            <span className="font-bold text-gray-900">{formatTime(pharmacy.openTime)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Closes at</span>
                            <span className="font-bold text-gray-900">{formatTime(pharmacy.closeTime)}</span>
                        </div>
                        <div className="pt-2">
                            <p className="text-gray-500 font-medium mb-2">Working Days</p>
                            <div className="flex flex-wrap gap-2">
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                                    <span
                                        key={d}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                            pharmacy.workingDays.includes(d)
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-gray-100 text-gray-400"
                                        }`}
                                    >
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🧾</span> Incoming Prescriptions
                </h2>

                {loadingRx ? (
                    <p className="text-sm text-gray-500">Loading prescriptions...</p>
                ) : prescriptions.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                        No prescriptions received yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {prescriptions.map((item) => (
                            <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                                    <div>
                                        <p className="font-semibold text-gray-900">{item.patient?.name || 'Patient'}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.doctor?.name || 'Doctor'} · {item.doctor?.specialization || 'General'}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                                        item.status === 'dispensed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {item.status.toUpperCase()}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                    <span className="font-semibold">Medications:</span> {item.medications}
                                </p>
                                {item.instructions && (
                                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                        <span className="font-semibold">Instructions:</span> {item.instructions}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    Patient Address: {item.patient?.address || ''}, {item.patient?.city || ''}, {item.patient?.state || ''} {item.patient?.pincode || ''}
                                </p>

                                <div className="mt-3 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        Sent: {new Date(item.sentAt).toLocaleString()}
                                    </p>
                                    {item.status === 'sent' && (
                                        <button
                                            onClick={() => markDispensed(item.id)}
                                            disabled={dispensingId === item.id}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
                                        >
                                            {dispensingId === item.id ? 'Updating...' : 'Mark Dispensed'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Contact / profile row */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>👤</span> Account Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    {[
                        { label: "Email", value: pharmacy.email },
                        { label: "Phone", value: pharmacy.phone || "Not set" },
                        { label: "Drug License", value: pharmacy.licenseNumber },
                    ].map((item) => (
                        <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{item.label}</p>
                            <p className="font-semibold text-gray-800 break-all">{item.value}</p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => router.push("/pharmacy/profile")}
                    className="mt-5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-5 py-2.5 rounded-xl text-sm font-medium transition"
                >
                    ⚙️ Edit Profile & Location
                </button>
            </div>
        </div>
    );
}
