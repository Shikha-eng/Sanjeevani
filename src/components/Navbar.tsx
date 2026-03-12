"use client";

import React from "react";
import Link from "next/link";
import { useLowData } from "@/context/LowDataContext";
import Image from "next/image";

export default function Navbar() {
    const { isLowDataMode, toggleLowDataMode } = useLowData();

    return (
        <nav className="bg-primary text-secondary sticky top-0 z-50 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center">
    <Image
        src="/sanjeevani.png"
        alt="Sanjeevani Logo"
        width={140}
        height={40}
        className="h-10 w-auto"
    />
</Link>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center bg-primary-dark rounded-full p-1 cursor-pointer" onClick={toggleLowDataMode}>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${!isLowDataMode ? "bg-white text-primary shadow" : "text-white"}`}>Standard</span>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${isLowDataMode ? "bg-white text-primary shadow" : "text-white"}`}>Low Data</span>
                        </div>

                        <Link href="/login" className="bg-white text-primary hover:bg-gray-100 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
