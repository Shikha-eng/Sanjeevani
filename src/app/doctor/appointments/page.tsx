"use client";

import React, { useEffect, useState } from "react";
import VideoCall from "@/components/VideoCall";

function parseJwt(token: string): { userId?: string; id?: string } | null {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function isCallTime(scheduledAt: string): boolean {
    const now = Date.now();
    const t = new Date(scheduledAt).getTime();
    return now >= t - 15 * 60_000 && now <= t + 60 * 60_000;
}

interface AppointmentRequest {
    _id: string;
    scheduledAt: string;
    status: "pending" | "scheduled" | "completed" | "cancelled" | "rejected";
    notes?: string;
    patientId: {
        _id: string;
        firstName: string;
        lastName: string;
    };
}

export default function DoctorAppointments() {
    const [pendingRequests, setPendingRequests] = useState<AppointmentRequest[]>([]);
    const [scheduledAppointments, setScheduledAppointments] = useState<AppointmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [prescriptionForId, setPrescriptionForId] = useState<string | null>(null);
    const [medicationsDraft, setMedicationsDraft] = useState<string>("");
    const [instructionsDraft, setInstructionsDraft] = useState<string>("");

    // Video call state
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [myUserId, setMyUserId] = useState<string>('');
    const [myName, setMyName] = useState<string>('Doctor');
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

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
                setMyName(`Dr. ${user.firstName} ${user.lastName || ''}`.trim());
            }
        } catch {
            // Ignore invalid cached user payload.
        }
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const [requestsRes, scheduledRes] = await Promise.all([
                fetch("http://localhost:5002/api/doctor/appointments/requests", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("http://localhost:5002/api/doctor/appointments/scheduled", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const requestsData = await requestsRes.json();
            const scheduledData = await scheduledRes.json();

            if (requestsData.success) {
                setPendingRequests(requestsData.data);
            }
            if (scheduledData.success) {
                setScheduledAppointments(scheduledData.data);
            }
        } catch (error) {
            console.error("Error loading appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleDecision = async (appointmentId: string, action: "accept" | "reject") => {
        setActionLoadingId(appointmentId);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5002/api/doctor/appointments/${appointmentId}/${action}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!data.success) {
                alert(data.message || `Failed to ${action} request.`);
            }

            await fetchAppointments();
        } catch (error) {
            console.error(`${action} request error:`, error);
            alert(`An error occurred while trying to ${action} request.`);
        } finally {
            setActionLoadingId(null);
        }
    };

    const completeWithPrescription = async (appointmentId: string) => {
        if (!medicationsDraft.trim()) {
            alert("Please write medications/prescription first.");
            return;
        }

        setCompletingId(appointmentId);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5002/api/doctor/appointments/${appointmentId}/complete-with-prescription`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        medications: medicationsDraft,
                        instructions: instructionsDraft,
                    }),
                }
            );

            const data = await response.json();
            if (!data.success) {
                alert(data.message || "Failed to complete appointment.");
                return;
            }

            const pharmacy = data.data?.pharmacy;
            const distanceText = typeof pharmacy?.distanceKm === 'number' ? ` (${pharmacy.distanceKm} km)` : "";
            alert(`Prescription sent to nearest pharmacy: ${pharmacy?.name || 'Assigned Pharmacy'}${distanceText}`);

            setPrescriptionForId(null);
            setMedicationsDraft("");
            setInstructionsDraft("");
            await fetchAppointments();
        } catch (error) {
            console.error("Complete appointment error:", error);
            alert("An error occurred while sending prescription.");
        } finally {
            setCompletingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Video call overlay */}
            {activeCallId && myUserId && (
                <VideoCall
                    appointmentId={activeCallId}
                    userId={myUserId}
                    userName={myName}
                    role="doctor"
                    onClose={() => setActiveCallId(null)}
                />
            )}

            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Appointments</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Review appointment requests and accept them to schedule the slot.
                </p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Pending Appointment Requests</h2>
                </div>
                <div className="p-6">
                    {loading ? (
                        <p className="text-gray-500">Loading requests...</p>
                    ) : pendingRequests.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No pending requests.</div>
                    ) : (
                        <div className="space-y-4">
                            {pendingRequests.map((request) => (
                                <div
                                    key={request._id}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
                                >
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {request.patientId.firstName} {request.patientId.lastName}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Requested Slot: {new Date(request.scheduledAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 w-fit">
                                            PENDING
                                        </span>
                                    </div>

                                    {request.notes && (
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4">
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Patient Note</p>
                                            <p className="text-sm text-gray-700 mt-1">{request.notes}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => handleDecision(request._id, "reject")}
                                            disabled={actionLoadingId === request._id}
                                            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleDecision(request._id, "accept")}
                                            disabled={actionLoadingId === request._id}
                                            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
                                        >
                                            {actionLoadingId === request._id ? "Processing..." : "Accept & Schedule"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Scheduled Appointments</h2>
                </div>
                <div className="p-6">
                    {loading ? (
                        <p className="text-gray-500">Loading scheduled appointments...</p>
                    ) : scheduledAppointments.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No scheduled appointments.</div>
                    ) : (
                        <div className="space-y-3">
                            {scheduledAppointments.map((appointment) => {
                                const callReady = isCallTime(appointment.scheduledAt);
                                void now;
                                const isPrescriptionOpen = prescriptionForId === appointment._id;
                                return (
                                    <div
                                        key={appointment._id}
                                        className="border border-gray-200 rounded-xl p-4"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {appointment.patientId.firstName} {appointment.patientId.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(appointment.scheduledAt).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {callReady ? (
                                                    <button
                                                        onClick={() => setActiveCallId(appointment._id)}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm transition"
                                                    >
                                                        📹 Start Call
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">
                                                        Call available 15 min before
                                                    </span>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        if (isPrescriptionOpen) {
                                                            setPrescriptionForId(null);
                                                            setMedicationsDraft("");
                                                            setInstructionsDraft("");
                                                        } else {
                                                            setPrescriptionForId(appointment._id);
                                                            setMedicationsDraft("");
                                                            setInstructionsDraft("");
                                                        }
                                                    }}
                                                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                                                >
                                                    🧾 End & Write Prescription
                                                </button>

                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 w-fit">
                                                    SCHEDULED
                                                </span>
                                            </div>
                                        </div>

                                        {isPrescriptionOpen && (
                                            <div className="mt-4 border border-indigo-100 rounded-xl p-4 bg-indigo-50/40 space-y-3">
                                                <p className="text-sm font-semibold text-indigo-900">
                                                    Write prescription for {appointment.patientId.firstName} {appointment.patientId.lastName}
                                                </p>
                                                <textarea
                                                    rows={4}
                                                    value={medicationsDraft}
                                                    onChange={(e) => setMedicationsDraft(e.target.value)}
                                                    placeholder="Example: Tab Paracetamol 650mg - 1 tablet after food, twice daily for 3 days"
                                                    className="w-full border border-indigo-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <textarea
                                                    rows={3}
                                                    value={instructionsDraft}
                                                    onChange={(e) => setInstructionsDraft(e.target.value)}
                                                    placeholder="Additional instructions (optional)"
                                                    className="w-full border border-indigo-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />

                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setPrescriptionForId(null);
                                                            setMedicationsDraft("");
                                                            setInstructionsDraft("");
                                                        }}
                                                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => completeWithPrescription(appointment._id)}
                                                        disabled={completingId === appointment._id}
                                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
                                                    >
                                                        {completingId === appointment._id ? "Sending..." : "Complete & Send to Nearest Pharmacy"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
