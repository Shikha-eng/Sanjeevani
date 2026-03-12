"use client";

import React from "react";
import Link from "next/link";
import { useLowData } from "@/context/LowDataContext";

export default function PatientDashboard() {
    const { isLowDataMode } = useLowData();

    // Mock patient data
    const patientParams = {
        name: "John Doe",
        age: 45,
        gender: "Male",
        bloodGroup: "O+",
        conditions: ["Type 2 Diabetes", "Hypertension"],
        address: "123 Health Ave, Wellness City",
        phone: "+1 234 567 8900"
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1 text-sm">Welcome back, {patientParams.name}</p>
                </div>
                <Link href="/patient/appointments" className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm">
                    Book Appointment
                </Link>
            </header>

            {/* Profile Summary Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">👤</span> Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Name</p>
                        <p className="text-gray-900 font-medium">{patientParams.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Age & Gender</p>
                        <p className="text-gray-900 font-medium">{patientParams.age} years, {patientParams.gender}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Blood Group</p>
                        <p className="text-gray-900 font-medium">{patientParams.bloodGroup}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Contact</p>
                        <p className="text-gray-900 font-medium">{patientParams.phone}</p>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Known Medical Conditions</p>
                    <div className="flex flex-wrap gap-2">
                        {patientParams.conditions.map((condition) => (
                            <span key={condition} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
                                {condition}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Actions & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latest Report Status */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                            <span className="mr-2">📄</span> Latest Uploaded Report
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">Complete Blood Count (CBC) - Uploaded 2 days ago. Processed via AI.</p>
                    </div>
                    <Link href="/patient/reports" className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center">
                        View All Reports <span className="ml-1">→</span>
                    </Link>
                </section>

                {/* AI Assistant Quick Access */}
                <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-indigo-900 mb-2 flex items-center">
                            <span className="mr-2">🤖</span> AI Medical Assistant
                        </h2>
                        <p className="text-sm text-indigo-700 mb-4">Ask questions about your recent CBC report or general health.</p>
                    </div>
                    <Link href="/patient/assistant" className="bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-4 rounded-lg shadow-sm transition-colors text-sm font-medium">
                        Start Chat
                    </Link>
                </section>
            </div>
        </div>
    );
}
