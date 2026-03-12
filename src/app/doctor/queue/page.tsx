"use client";

import React, { useEffect, useMemo, useState } from "react";

interface QueueItem {
    id: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
        age: number | null;
        bloodGroup: string | null;
        height: number | null;
        weight: number | null;
        conditions: string[];
        allergies: string[];
        medicalHistory: string;
    };
    scheduledAt: string;
    status: "Waiting" | "Upcoming";
    alerts: number;
    queuePosition: number;
    latestReport: {
        reportName: string;
        reportType: string;
        uploadDate: string;
        imageUrl: string;
        summary: string;
        keyFindings: string[];
        parameters: Array<{
            name: string;
            value: string;
            unit?: string;
            normalRange?: string;
            status?: "normal" | "high" | "low";
        }>;
    } | null;
    pendingQuestions: Array<{
        id: string;
        question: string;
        aiResponse: string;
        createdAt: string;
    }>;
}

export default function PatientQueuePage() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch("http://localhost:5002/api/doctor/queue/today", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setQueue(data.data);
                if (data.data.length > 0) {
                    setSelectedPatientId((prev: string | null) => prev || data.data[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching today queue:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const selectedPatient = useMemo(
        () => queue.find((item) => item.id === selectedPatientId) || null,
        [queue, selectedPatientId]
    );

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Today's Queue</h2>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                        {queue.length} patient{queue.length === 1 ? "" : "s"}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-6 text-gray-500 text-sm">Loading today&apos;s patients...</div>
                    ) : queue.length === 0 ? (
                        <div className="p-6 text-gray-500 text-sm">No patients scheduled for today.</div>
                    ) : (
                        queue.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedPatientId(p.id)}
                                className={`p-4 cursor-pointer transition-colors ${selectedPatientId === p.id
                                    ? "bg-orange-50/50 border-l-4 border-primary"
                                    : "hover:bg-gray-50 border-l-4 border-transparent"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1 gap-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900">
                                            {p.patient.firstName} {p.patient.lastName}
                                        </h3>
                                        <p className="text-[11px] text-gray-400">Queue #{p.queuePosition}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                        {new Date(p.scheduledAt).toLocaleTimeString("en-US", {
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "Waiting"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                                        }`}>
                                        {p.status}
                                    </span>
                                    {p.alerts > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                            {p.alerts} Alert{p.alerts > 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="md:w-2/3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">Loading patient details...</div>
                ) : selectedPatient ? (
                    <div>
                        <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100 gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900">
                                    {selectedPatient.patient.firstName} {selectedPatient.patient.lastName}
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    {selectedPatient.patient.age ? `${selectedPatient.patient.age} yrs` : "Age not available"}
                                    {selectedPatient.patient.bloodGroup ? ` • ${selectedPatient.patient.bloodGroup}` : ""}
                                </p>
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    {selectedPatient.patient.conditions.length > 0 ? (
                                        selectedPatient.patient.conditions.map((condition) => (
                                            <span key={condition} className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-semibold">
                                                {condition}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="bg-gray-50 text-gray-500 px-2 py-1 rounded-md text-xs font-semibold">
                                            No flagged conditions
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center whitespace-nowrap">
                                <span className="mr-2">📹</span> Start Call
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Height</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {selectedPatient.patient.height ? `${selectedPatient.patient.height} cm` : "N/A"}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Weight</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {selectedPatient.patient.weight ? `${selectedPatient.patient.weight} kg` : "N/A"}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Appointment Time</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {new Date(selectedPatient.scheduledAt).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>

                        {(selectedPatient.patient.allergies.length > 0 || selectedPatient.patient.medicalHistory) && (
                            <div className="mb-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                {selectedPatient.patient.allergies.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-xs font-bold text-blue-900 mb-1 uppercase">Allergies</p>
                                        <p className="text-sm text-blue-800">{selectedPatient.patient.allergies.join(", ")}</p>
                                    </div>
                                )}
                                {selectedPatient.patient.medicalHistory && (
                                    <div>
                                        <p className="text-xs font-bold text-blue-900 mb-1 uppercase">Medical History</p>
                                        <p className="text-sm text-blue-800">{selectedPatient.patient.medicalHistory}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="mr-2">📊</span> Latest Report Summary
                                </h2>
                                {selectedPatient.latestReport ? (
                                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                                            {selectedPatient.latestReport.reportType}
                                        </p>
                                        <p className="text-sm text-gray-400 mb-3">
                                            {selectedPatient.latestReport.reportName} • {new Date(selectedPatient.latestReport.uploadDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <p className="text-sm text-gray-700 mb-4">
                                            {selectedPatient.latestReport.summary || "No OCR summary available for this report."}
                                        </p>

                                        {selectedPatient.latestReport.parameters.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                                {selectedPatient.latestReport.parameters.slice(0, 5).map((parameter, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm gap-3">
                                                        <span className="text-gray-600">{parameter.name}:</span>
                                                        <span className={`font-medium ${parameter.status === "high"
                                                            ? "text-red-600"
                                                            : parameter.status === "low"
                                                                ? "text-yellow-700"
                                                                : "text-gray-900"
                                                            }`}>
                                                            {parameter.value} {parameter.unit || ""}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {selectedPatient.latestReport.keyFindings.length > 0 && (
                                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                                                <p className="text-xs font-bold text-indigo-900 mb-1">Key Findings</p>
                                                <ul className="text-sm text-indigo-800 list-disc list-inside space-y-1">
                                                    {selectedPatient.latestReport.keyFindings.slice(0, 3).map((finding, idx) => (
                                                        <li key={idx}>{finding}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm text-gray-500">
                                        No report uploaded by this patient yet.
                                    </div>
                                )}
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="mr-2">🖼️</span> Raw Document
                                </h2>
                                {selectedPatient.latestReport?.imageUrl ? (
                                    <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center border border-gray-200 overflow-hidden">
                                        <img
                                            src={`http://localhost:5002${selectedPatient.latestReport.imageUrl}`}
                                            alt="Raw Medical Report"
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center border border-gray-200 text-gray-500 text-sm">
                                        No report image available
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <span className="mr-2">❓</span> Pending Patient Questions
                            </h2>
                            {selectedPatient.pendingQuestions.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedPatient.pendingQuestions.map((chat) => (
                                        <div key={chat.id} className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex justify-between items-center gap-4">
                                            <div>
                                                <p className="font-medium text-gray-900">"{chat.question}"</p>
                                                <p className="text-xs text-orange-600 mt-1">{chat.aiResponse}</p>
                                            </div>
                                            <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-gray-50 whitespace-nowrap">
                                                Reply
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100 p-4">
                                    No pending AI questions for this patient.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-6 border-t border-gray-100">
                            <button className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-colors text-sm">
                                Write Prescription
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 flex-col">
                        <span className="text-4xl mb-4">🧑‍⚕️</span>
                        <p>Select a patient from the queue to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
