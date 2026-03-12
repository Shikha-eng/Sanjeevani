"use client";

import React, { useState } from "react";

export default function PatientQueuePage() {
    const [selectedPatient, setSelectedPatient] = useState<number | null>(1);

    const queue = [
        { id: 1, name: "John Doe", time: "10:00 AM", status: "Waiting", alerts: 1 },
        { id: 2, name: "Jane Smith", time: "10:30 AM", status: "Upcoming", alerts: 1 },
        { id: 3, name: "Mark Lee", time: "11:00 AM", status: "Upcoming", alerts: 0 },
    ];

    const patientDetails = {
        id: 1,
        name: "John Doe",
        age: 45,
        gender: "Male",
        conditions: ["Type 2 Diabetes", "Hypertension"],
        recentReport: {
            date: "Oct 12, 2026",
            type: "Complete Blood Count",
            structuredData: {
                "Hemoglobin": "13.5 g/dL (Normal)",
                "WBC": "8.5 x10^3/uL (Normal)",
                "HbA1c": "7.2% (Elevated)",
            },
            aiNotes: "Patient's HbA1c is slightly elevated. Recommend adjusting Metformin dosage.",
            rawImage: "https://via.placeholder.com/400x600.png?text=Medical+Report+OCR+Scanned"
        },
        chatHistory: [
            { q: "Can I eat rasmalai?", a: "AI Unsure. Flagged for review." }
        ]
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            {/* Sidebar: Queue */}
            <div className="md:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800">Today's Queue</h2>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {queue.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPatient(p.id)}
                            className={`p-4 cursor-pointer transition-colors ${selectedPatient === p.id ? "bg-orange-50/50 border-l-4 border-primary" : "hover:bg-gray-50 border-l-4 border-transparent"}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-gray-900">{p.name}</h3>
                                <span className="text-xs font-semibold text-gray-500">{p.time}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "Waiting" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                                    {p.status}
                                </span>
                                {p.alerts > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{p.alerts} Alert</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Patient Record */}
            <div className="md:w-2/3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto">
                {selectedPatient === 1 ? (
                    <div>
                        <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900">{patientDetails.name}</h1>
                                <p className="text-gray-500 mt-1">{patientDetails.age} yrs, {patientDetails.gender}</p>
                                <div className="flex gap-2 mt-3">
                                    {patientDetails.conditions.map(c => <span key={c} className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-semibold">{c}</span>)}
                                </div>
                            </div>
                            <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center">
                                <span className="mr-2">📹</span> Start Call
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Structured OCR Data */}
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="mr-2">📊</span> Latest Report (OCR)
                                </h2>
                                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">{patientDetails.recentReport.type} - {patientDetails.recentReport.date}</p>
                                    <ul className="space-y-2 mb-4">
                                        {Object.entries(patientDetails.recentReport.structuredData).map(([key, val]) => (
                                            <li key={key} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{key}:</span>
                                                <span className={`font-medium ${val.includes('Elevated') ? 'text-red-600' : 'text-gray-900'}`}>{val}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-indigo-900 mb-1">🤖 AI Insights</p>
                                        <p className="text-sm text-indigo-800">{patientDetails.recentReport.aiNotes}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Raw Image */}
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="mr-2">🖼️</span> Raw Document
                                </h2>
                                <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center border border-gray-200 overflow-hidden">
                                    <img src={patientDetails.recentReport.rawImage} alt="Raw Medical Report" className="object-cover w-full h-full opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* AI Unanswered Queries */}
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <span className="mr-2">❓</span> Pending Patient Questions
                            </h2>
                            {patientDetails.chatHistory.map((chat, idx) => (
                                <div key={idx} className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-900">"{chat.q}"</p>
                                        <p className="text-xs text-orange-600 mt-1">{chat.a}</p>
                                    </div>
                                    <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-gray-50">
                                        Reply
                                    </button>
                                </div>
                            ))}
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
