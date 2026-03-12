"use client";

import React from "react";
import Link from "next/link";

export default function DoctorDashboard() {
    const stats = [
        { label: "Patients Today", value: "14", icon: "🧑‍🤝‍🧑" },
        { label: "Pending Reviews", value: "5", icon: "⚠️" },
        { label: "AI Queries to Approve", value: "3", icon: "🤖" },
    ];

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Dr. Sarah Mitchell</h1>
                    <p className="text-gray-500 mt-1 text-sm">Cardiologist | EaseCare Dashboard</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl mb-3">{stat.icon}</span>
                        <span className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</span>
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">📋</span> Next Patient
                    </h2>
                    <div className="bg-orange-50 border border-primary/20 rounded-xl p-5 mb-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-gray-900">John Doe</h3>
                            <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded">10:00 AM</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">Follow-up for Hypertension & Diabetes.</p>
                        <div className="flex space-x-3">
                            <Link href="/doctor/queue" className="flex-1 bg-white border border-gray-200 text-gray-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                View Queue
                            </Link>
                            <Link href="/doctor/queue" className="flex-1 bg-primary text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                                View Record
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">🤖</span> AI Action Items
                    </h2>
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-sm text-gray-900 mb-1">Jane Smith asked about rasmalai</p>
                                <p className="text-xs text-gray-500">AI marked as unsure</p>
                            </div>
                            <button className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-medium text-primary hover:bg-gray-50 transition-colors">
                                Review
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-sm text-gray-900 mb-1">Mark Lee uploaded new CBC</p>
                                <p className="text-xs text-gray-500">View structured OCR data</p>
                            </div>
                            <Link href="/doctor/queue" className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-medium text-primary hover:bg-gray-50 transition-colors">
                                Review
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
