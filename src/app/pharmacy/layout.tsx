"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isAuthPage =
        pathname === "/pharmacy/login" ||
        pathname === "/pharmacy/onboarding";

    if (isAuthPage) {
        return <>{children}</>;
    }

    const navItems = [
        { name: "Dashboard", path: "/pharmacy/dashboard", icon: "🏪" },
        { name: "Profile", path: "/pharmacy/profile", icon: "⚙️" },
    ];

    return (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
            {/* Sidebar */}
            <div className="md:w-64 bg-white border-r border-gray-100 shadow-sm md:flex-shrink-0 hidden md:block">
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">💊</span>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800">Pharmacy Portal</h2>
                            <p className="text-xs text-gray-400">Sanjeevani Network</p>
                        </div>
                    </div>
                    <nav className="mt-2 space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.path}
                                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === item.path
                                        ? "bg-emerald-600 text-white shadow"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                                }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                        <button
                            onClick={() => {
                                localStorage.removeItem("pharmacyToken");
                                localStorage.removeItem("pharmacy");
                                window.location.href = "/pharmacy/login";
                            }}
                            className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <span className="mr-3">🚪</span>Logout
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
                {children}
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                                pathname === item.path ? "text-emerald-600" : "text-gray-500"
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
