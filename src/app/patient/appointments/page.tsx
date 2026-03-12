"use client";

import React, { useEffect, useMemo, useState } from "react";
import VideoCall from "@/components/VideoCall";

// Decode JWT to grab userId/userName without an extra API call
function parseJwt(token: string): { userId?: string; id?: string } | null {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

// Returns true within a -15 min / +60 min window around the appointment time
function isCallTime(scheduledAt: string): boolean {
    const now = Date.now();
    const t = new Date(scheduledAt).getTime();
    return now >= t - 15 * 60_000 && now <= t + 60 * 60_000;
}

interface DoctorOption {
    id: string;
    name: string;
    specialization: string;
    averageRating: number;
    totalRatings: number;
    city?: string;
    state?: string;
    distanceKm?: number | null;
}

interface AppointmentItem {
    _id: string;
    scheduledAt: string;
    status: "pending" | "scheduled" | "completed" | "cancelled" | "rejected";
    doctorId: {
        _id: string;
        firstName: string;
        lastName: string;
        specialization?: string;
    };
}

interface RateableDoctor {
    appointmentId: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    appointmentDate: string;
    alreadyRated: boolean;
    existingRating: number | null;
    existingReview: string;
}

export default function AppointmentsPage() {
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [appointmentDate, setAppointmentDate] = useState<string>("");
    const [appointmentTime, setAppointmentTime] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [bookingLoading, setBookingLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    const [rateableDoctors, setRateableDoctors] = useState<RateableDoctor[]>([]);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [reviews, setReviews] = useState<Record<string, string>>({});
    const [loadingRatings, setLoadingRatings] = useState(true);
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    // Video call state
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [myUserId, setMyUserId] = useState<string>('');
    const [myName, setMyName] = useState<string>('Patient');
    const [now, setNow] = useState(Date.now());

    // Tick every 30 s so call button appears/disappears in real-time
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    // Extract userId + name from stored JWT
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const payload = parseJwt(token);
        const tokenUserId = payload?.userId || payload?.id;
        if (tokenUserId) {
            setMyUserId(tokenUserId);
        }

        const userRaw = localStorage.getItem('user');
        if (!userRaw) return;

        try {
            const user = JSON.parse(userRaw) as { id?: string; _id?: string; firstName?: string; lastName?: string };
            if (!tokenUserId && (user.id || user._id)) {
                setMyUserId(user.id || user._id || '');
            }
            if (user.firstName) {
                setMyName(`${user.firstName} ${user.lastName || ''}`.trim());
            }
        } catch {
            // Ignore invalid cached user payload.
        }
    }, []);

    const selectedDoctor = useMemo(
        () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
        [doctors, selectedDoctorId]
    );

    const fetchDoctors = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5002/api/patient/doctors?nearby=true&maxDistanceKm=20", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success) {
            setDoctors(data.data);
            if (!data.patientHasLocation) {
                alert("Add your location in onboarding/profile to get nearby doctors.");
            }
        }
    };

    const fetchMyAppointments = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5002/api/patient/appointments/my", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success) {
            setAppointments(data.data);
        }
    };

    const fetchEligibleRatings = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoadingRatings(false);
                return;
            }

            const response = await fetch("http://localhost:5002/api/patient/ratings/eligible", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setRateableDoctors(data.data);

                const initialRatings: Record<string, number> = {};
                const initialReviews: Record<string, string> = {};

                data.data.forEach((entry: RateableDoctor) => {
                    initialRatings[entry.appointmentId] = entry.existingRating || 0;
                    initialReviews[entry.appointmentId] = entry.existingReview || "";
                });

                setRatings(initialRatings);
                setReviews(initialReviews);
            }
        } catch (error) {
            console.error("Error loading eligible ratings:", error);
        } finally {
            setLoadingRatings(false);
        }
    };

    const refreshAll = async () => {
        try {
            await Promise.all([fetchDoctors(), fetchMyAppointments(), fetchEligibleRatings()]);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        refreshAll();
    }, []);

    const requestAppointment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedDoctorId || !appointmentDate || !appointmentTime) {
            alert("Please select doctor, date and time.");
            return;
        }

        setBookingLoading(true);

        try {
            const token = localStorage.getItem("token");
            const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}:00`).toISOString();

            const response = await fetch("http://localhost:5002/api/patient/appointments/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    doctorId: selectedDoctorId,
                    scheduledAt,
                    notes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                alert("Appointment request sent to doctor successfully.");
                setAppointmentDate("");
                setAppointmentTime("");
                setNotes("");
                await fetchMyAppointments();
            } else {
                alert(data.message || "Could not request appointment.");
            }
        } catch (error) {
            console.error("Appointment request error:", error);
            alert("An error occurred while sending the request.");
        } finally {
            setBookingLoading(false);
        }
    };

    const submitRating = async (entry: RateableDoctor) => {
        const rating = ratings[entry.appointmentId] || 0;

        if (!rating) {
            alert("Please select a star rating first.");
            return;
        }

        setSubmittingId(entry.appointmentId);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:5002/api/patient/ratings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    appointmentId: entry.appointmentId,
                    doctorId: entry.doctorId,
                    rating,
                    review: reviews[entry.appointmentId] || "",
                }),
            });

            const data = await response.json();
            if (data.success) {
                alert("Rating submitted successfully.");
                await fetchEligibleRatings();
            } else {
                alert(data.message || "Failed to submit rating.");
            }
        } catch (error) {
            console.error("Rating submission error:", error);
            alert("An error occurred while submitting rating.");
        } finally {
            setSubmittingId(null);
        }
    };

    const getStatusBadge = (status: AppointmentItem["status"]) => {
        if (status === "scheduled") return "bg-green-100 text-green-700";
        if (status === "pending") return "bg-yellow-100 text-yellow-700";
        if (status === "rejected") return "bg-red-100 text-red-700";
        if (status === "completed") return "bg-blue-100 text-blue-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div className="space-y-8">
            {/* Video call overlay */}
            {activeCallId && myUserId && (
                <VideoCall
                    appointmentId={activeCallId}
                    userId={myUserId}
                    userName={myName}
                    role="patient"
                    onClose={() => setActiveCallId(null)}
                />
            )}

            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Book Appointment</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Send appointment requests to specific doctors. Slots can be scheduled at any time.
                </p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Request Appointment</h2>

                {loadingData ? (
                    <p className="text-gray-500">Loading doctors...</p>
                ) : (
                    <form onSubmit={requestAppointment} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                                <select
                                    value={selectedDoctorId}
                                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                >
                                    <option value="">Choose doctor</option>
                                    {doctors.map((doctor) => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name} — {doctor.specialization}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={appointmentDate}
                                        onChange={(e) => setAppointmentDate(e.target.value)}
                                        min={new Date().toISOString().split("T")[0]}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={appointmentTime}
                                        onChange={(e) => setAppointmentTime(e.target.value)}
                                        step={1800}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {selectedDoctor && (
                            <p className="text-xs text-gray-500">
                                Selected: {selectedDoctor.name} • {selectedDoctor.specialization} • ⭐ {selectedDoctor.averageRating.toFixed(1)} ({selectedDoctor.totalRatings})
                                {typeof selectedDoctor.distanceKm === 'number' ? ` • ${selectedDoctor.distanceKm} km away` : ''}
                            </p>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add symptoms or reason for consultation"
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={bookingLoading}
                            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                        >
                            {bookingLoading ? "Sending Request..." : "Send Appointment Request"}
                        </button>
                    </form>
                )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">My Appointment Requests</h2>
                </div>

                <div className="p-6">
                    {appointments.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No appointments requested yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {appointments.map((appointment) => {
                                const callReady =
                                    appointment.status === 'scheduled' &&
                                    isCallTime(appointment.scheduledAt);
                                // suppress lint — 'now' keeps the component re-evaluating every 30 s
                                void now;
                                return (
                                    <div key={appointment._id} className="border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                Dr. {appointment.doctorId.firstName} {appointment.doctorId.lastName}
                                            </h3>
                                            <p className="text-sm text-primary">{appointment.doctorId.specialization || "General Physician"}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(appointment.scheduledAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {callReady && (
                                                <button
                                                    onClick={() => setActiveCallId(appointment._id)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm transition"
                                                >
                                                    📹 Join Call
                                                </button>
                                            )}
                                            {appointment.status === 'scheduled' && !callReady && (
                                                <span className="text-xs text-gray-400 italic">
                                                    Call available 15 min before appointment
                                                </span>
                                            )}
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusBadge(appointment.status)}`}>
                                                {appointment.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Rate Your Doctors</h2>
                    <p className="text-sm text-gray-500 mt-1">You can rate doctors you already had appointments with.</p>
                </div>

                <div className="p-6">
                    {loadingRatings ? (
                        <div className="text-center py-10 text-gray-500">Loading rating options...</div>
                    ) : rateableDoctors.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            No completed/past appointments available for rating yet.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {rateableDoctors.map((entry) => (
                                <div key={entry.appointmentId} className="border border-gray-200 rounded-2xl p-5">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{entry.doctorName}</h3>
                                            <p className="text-sm text-primary font-medium">{entry.specialization}</p>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Appointment: {new Date(entry.appointmentDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            const active = (ratings[entry.appointmentId] || 0) >= star;
                                            return (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() =>
                                                        setRatings((prev) => ({
                                                            ...prev,
                                                            [entry.appointmentId]: star,
                                                        }))
                                                    }
                                                    className={`text-2xl transition-colors ${active ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
                                                >
                                                    ★
                                                </button>
                                            );
                                        })}
                                        <span className="text-sm text-gray-500 ml-2">
                                            {(ratings[entry.appointmentId] || 0) > 0
                                                ? `${ratings[entry.appointmentId]} / 5`
                                                : "Select rating"}
                                        </span>
                                    </div>

                                    <textarea
                                        value={reviews[entry.appointmentId] || ""}
                                        onChange={(e) =>
                                            setReviews((prev) => ({
                                                ...prev,
                                                [entry.appointmentId]: e.target.value,
                                            }))
                                        }
                                        rows={3}
                                        placeholder="Optional: Share your feedback"
                                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />

                                    <div className="mt-3 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={submittingId === entry.appointmentId}
                                            onClick={() => submitRating(entry)}
                                            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                                        >
                                            {submittingId === entry.appointmentId
                                                ? "Submitting..."
                                                : entry.alreadyRated
                                                    ? "Update Rating"
                                                    : "Submit Rating"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
