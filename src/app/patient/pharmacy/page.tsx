"use client";

import React from "react";

export default function PharmacyPage() {
    const orders = [
        {
            id: "ORD-9823",
            date: "Oct 12, 2026",
            doctor: "Dr. Sarah Mitchell",
            status: "Out for Delivery",
            items: [
                { name: "Metformin 500mg", qty: "30 Tablets" },
                { name: "Lisinopril 10mg", qty: "30 Tablets" },
            ],
            estimatedDelivery: "Today, 6:00 PM",
        },
        {
            id: "ORD-9751",
            date: "Sep 05, 2026",
            doctor: "Dr. James Wilson",
            status: "Delivered",
            items: [
                { name: "Amoxicillin 250mg", qty: "20 Capsules" },
            ],
            estimatedDelivery: "Delivered on Sep 05, 2026",
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Medicine Delivery</h1>
                <p className="text-gray-500 mt-1 text-sm">Track your prescribed medicines from the pharmacy to your doorstep.</p>
            </div>

            <div className="space-y-6">
                {orders.map((order) => (
                    <section key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Order {order.id}</h2>
                                <p className="text-xs text-gray-500">Prescribed by {order.doctor} on {order.date}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === "Delivered" ? "bg-gray-100 text-gray-700" : "bg-orange-100 text-primary-dark"
                                }`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="p-6">
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Medicines</h3>
                                <ul className="space-y-2">
                                    {order.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                            <span className="text-gray-900 font-medium text-sm">{item.name}</span>
                                            <span className="text-gray-500 text-sm">{item.qty}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 flex items-start">
                                <div className="text-2xl mr-3">🚚</div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Delivery Status</p>
                                    <p className="text-gray-900 text-sm font-medium">{order.estimatedDelivery}</p>
                                    {order.status !== "Delivered" && (
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                                            <div className="bg-primary h-1.5 rounded-full w-3/4"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
