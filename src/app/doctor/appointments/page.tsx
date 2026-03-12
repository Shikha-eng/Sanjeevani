"use client";

import React, { useState } from "react";

export default function DoctorAppointments() {
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [prescriptionSent, setPrescriptionSent] = useState(false);

    const appointments = [
        { id: 1, name: "John Doe", type: "Follow-up", time: "10:00 AM", status: "Ongoing" },
        { id: 2, name: "Jane Smith", type: "Consultation", time: "10:30 AM", status: "Upcoming" },
    ];

    const handleSendPrescription = (e: React.FormEvent) => {
        e.preventDefault();
        setPrescriptionSent(true);
        setTimeout(() => {
            setPrescriptionSent(false);
            setShowPrescriptionModal(false);
        }, 2000);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Appointments</h1>
                <p className="text-gray-500 mt-1 text-sm">Manage your daily schedule and write prescriptions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {appointments.map((appt) => (
                    <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{appt.name}</h3>
                                    <p className="text-sm font-medium text-primary mb-1">{appt.type}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded ${appt.status === "Ongoing" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                                    {appt.status}
                                </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-lg">
                                <span className="mr-2">🕒</span> {appt.time}
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowPrescriptionModal(true)}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 text-center py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                📝 Prescribe
                            </button>
                            <button className={`flex-1 text-white text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${appt.status === "Ongoing" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"}`}>
                                {appt.status === "Ongoing" ? "End Call" : "Start Call"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showPrescriptionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-800">Write Prescription</h2>
                            <button onClick={() => setShowPrescriptionModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {prescriptionSent ? (
                            <div className="p-12 text-center">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Prescription Sent</h3>
                                <p className="text-gray-500 text-sm">Successfully sent to patient and nearest pharmacy.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendPrescription} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Medicines</label>
                                        <textarea
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                                            rows={4}
                                            placeholder="e.g. Paracetamol 500mg, 1 tablet twice a day after meals"
                                            required
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Doctor's Note</label>
                                        <textarea
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                                            rows={2}
                                            placeholder="Drink plenty of water and rest."
                                        ></textarea>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" id="physicalVisit" className="rounded text-primary focus:ring-primary border-gray-300 w-4 h-4" />
                                        <label htmlFor="physicalVisit" className="ml-2 text-sm text-gray-700 font-medium">Require physical visit</label>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end space-x-3">
                                    <button type="button" onClick={() => setShowPrescriptionModal(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium text-sm transition-colors">
                                        Send to Pharmacy & Patient
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
