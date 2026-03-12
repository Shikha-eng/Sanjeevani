"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { name: "Overview", path: "/doctor/dashboard", icon: "📊" },
        { name: "Patient Queue", path: "/doctor/queue", icon: "🧑‍🤝‍🧑" },
        { name: "Appointments", path: "/doctor/appointments", icon: "📅" },
    ];

    return (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
            {/* Mobile nav (bottom) & Desktop sidebar */}
            <div className="md:w-64 bg-white border-r border-gray-100 shadow-sm md:flex-shrink-0 hidden md:block">
                <div className="p-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Doctor Portal</h2>
                    <nav className="mt-4 space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.path}
                                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === item.path
                                        ? "bg-primary text-white shadow"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
                {children}
            </div>

            {/* Mobile Nav (Bottom) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === item.path ? "text-primary" : "text-gray-500"
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
