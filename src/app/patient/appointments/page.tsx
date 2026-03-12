"use client";

import React, { useState } from "react";

export default function AppointmentsPage() {
    const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
    const [booked, setBooked] = useState(false);

    const doctors = [
        { id: 1, name: "Dr. Sarah Mitchell", specialty: "Cardiologist", available: "Today, 4:00 PM" },
        { id: 2, name: "Dr. James Wilson", specialty: "General Physician", available: "Tomorrow, 10:00 AM" },
        { id: 3, name: "Dr. Emily Chen", specialty: "Endocrinologist", available: "Wed, 2:30 PM" },
    ];

    const handleBook = () => {
        if (selectedDoc) {
            setBooked(true);
            setTimeout(() => setBooked(false), 3000);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Book Appointment</h1>
                <p className="text-gray-500 mt-1 text-sm">Schedule a virtual consultation with our specialists.</p>
            </div>

            {booked && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center shadow-sm">
                    <span className="mr-3 text-xl">✅</span>
                    <p className="font-medium text-sm">Appointment successfully booked! The doctor will connect with you at the scheduled time.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doc) => (
                    <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc.id)}
                        className={`cursor-pointer bg-white rounded-2xl p-6 shadow-sm border transition-all ${selectedDoc === doc.id ? "border-primary ring-2 ring-primary/20 bg-orange-50/30" : "border-gray-100 hover:border-primary/50"
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{doc.name}</h3>
                                <p className="text-primary font-medium text-sm mb-4">{doc.specialty}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                                👨‍⚕️
                            </div>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-lg">
                            <span className="mr-2">🕒</span> {doc.available}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc.id);
                                handleBook();
                            }}
                            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${selectedDoc === doc.id ? "bg-primary text-white hover:bg-primary-dark shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Book Now
                        </button>
                    </div>
                ))}
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Upcoming Consultations</h2>
                </div>
                <div className="p-6 text-center text-gray-500 py-12">
                    <div className="text-4xl mb-3">📅</div>
                    <p>You have no upcoming appointments.</p>
                </div>
            </section>
        </div>
    );
}
