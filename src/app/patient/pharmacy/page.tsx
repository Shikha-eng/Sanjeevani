"use client";

import React, { useEffect, useMemo, useState } from "react";

interface NearbyPharmacy {
    id: string;
    name: string;
    ownerName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    openTime: string;
    closeTime: string;
    workingDays: string[];
    distanceKm: number | null;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTime = (value: string): string => {
    if (!value) return "—";
    const [hourRaw, minute] = value.split(":");
    const hour = Number(hourRaw);
    const ampm = hour >= 12 ? "PM" : "AM";
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelveHour}:${minute} ${ampm}`;
};

const isOpenNow = (openTime: string, closeTime: string, workingDays: string[]): boolean => {
    if (!openTime || !closeTime) return false;
    const now = new Date();
    const today = dayNames[now.getDay()];
    if (!workingDays.includes(today)) return false;

    const [openHour, openMin] = openTime.split(":").map(Number);
    const [closeHour, closeMin] = closeTime.split(":").map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
};

export default function PharmacyPage() {
    const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [distanceLimit, setDistanceLimit] = useState(20);
    const [patientHasLocation, setPatientHasLocation] = useState(true);

    const loadNearbyPharmacies = async (maxDistanceKm: number) => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");
            if (!token) {
                setError("Please login first.");
                return;
            }

            const response = await fetch(
                `http://localhost:5002/api/patient/pharmacies/nearby?maxDistanceKm=${maxDistanceKm}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await response.json();
            if (!data.success) {
                setError(data.message || "Could not load nearby pharmacies.");
                return;
            }

            setPharmacies(data.data || []);
            setPatientHasLocation(Boolean(data.patientHasLocation));
        } catch {
            setError("Network error while loading nearby pharmacies.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNearbyPharmacies(distanceLimit);
    }, []);

    const summaryText = useMemo(() => {
        if (!patientHasLocation) {
            return "Add your location in patient onboarding/profile to see nearby pharmacies.";
        }
        if (!pharmacies.length) {
            return `No pharmacies found within ${distanceLimit} km.`;
        }
        return `${pharmacies.length} pharmacy${pharmacies.length > 1 ? "ies" : ""} found within ${distanceLimit} km.`;
    }, [pharmacies.length, distanceLimit, patientHasLocation]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Nearby Pharmacies</h1>
                <p className="text-gray-500 mt-1 text-sm">Find pharmacies near your saved patient location.</p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Distance Filter</p>
                        <p className="text-xs text-gray-500 mt-1">{summaryText}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={distanceLimit}
                            onChange={(e) => setDistanceLimit(Number(e.target.value))}
                            className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
                        >
                            <option value={5}>Within 5 km</option>
                            <option value={10}>Within 10 km</option>
                            <option value={20}>Within 20 km</option>
                            <option value={30}>Within 30 km</option>
                            <option value={50}>Within 50 km</option>
                        </select>
                        <button
                            onClick={() => loadNearbyPharmacies(distanceLimit)}
                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-medium"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                    Loading nearby pharmacies...
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
                    {error}
                </div>
            ) : (
                <div className="space-y-4">
                    {pharmacies.map((pharmacy) => {
                        const isOpen = isOpenNow(pharmacy.openTime, pharmacy.closeTime, pharmacy.workingDays);
                        return (
                            <section key={pharmacy.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">{pharmacy.name}</h2>
                                        <p className="text-xs text-gray-500">Owner: {pharmacy.ownerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                            {isOpen ? "Open Now" : "Closed"}
                                        </span>
                                        {typeof pharmacy.distanceKm === 'number' && (
                                            <p className="text-xs text-primary mt-1 font-semibold">{pharmacy.distanceKm} km away</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 space-y-3">
                                    <p className="text-sm text-gray-700">
                                        📍 {pharmacy.address}, {pharmacy.city}, {pharmacy.state} {pharmacy.pincode}
                                    </p>
                                    <p className="text-sm text-gray-700">📞 {pharmacy.phone || "No phone provided"}</p>
                                    <p className="text-sm text-gray-700">
                                        🕐 {formatTime(pharmacy.openTime)} - {formatTime(pharmacy.closeTime)}
                                    </p>
                                    <p className="text-xs text-gray-500">Open: {pharmacy.workingDays.join(', ') || 'N/A'}</p>
                                </div>
                            </section>
                        );
                    })}

                    {!pharmacies.length && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                            No nearby pharmacies found for the selected range.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
