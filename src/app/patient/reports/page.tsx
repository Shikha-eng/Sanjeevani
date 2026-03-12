"use client";

import React, { useState } from "react";

export default function ReportsPage() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!uploadedFile) return;
        setIsUploading(true);

        // Simulate OCR and AI structuring upload process
        setTimeout(() => {
            setIsUploading(false);
            alert("Report successfully uploaded and processed by AI!");
            setUploadedFile(null);
        }, 2000);
    };

    const pastReports = [
        { id: 1, name: "Complete Blood Count", date: "Oct 12, 2026", status: "Structured" },
        { id: 2, name: "Lipid Profile", date: "Sep 05, 2026", status: "Structured" },
        { id: 3, name: "X-Ray Chest PA", date: "Jan 15, 2026", status: "Raw Image" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Medical Reports</h1>
                <p className="text-gray-500 mt-1 text-sm">Upload new tests or view your previous structured details.</p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Upload New Report</h2>

                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-orange-50/50 hover:bg-orange-50 transition-colors">
                    <input
                        type="file"
                        id="report-upload"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="report-upload" className="cursor-pointer">
                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-2xl">
                            📄
                        </div>
                        <p className="text-gray-700 font-medium mb-1">
                            {uploadedFile ? uploadedFile.name : "Click to browse or drag your file here"}
                        </p>
                        <p className="text-gray-500 text-sm">Supports PDF, JPG, PNG (Max 5MB)</p>
                    </label>
                </div>

                {uploadedFile && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className={`py-2 px-6 rounded-lg font-medium shadow-sm transition-colors ${isUploading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-primary hover:bg-primary-dark text-white"
                                }`}
                        >
                            {isUploading ? "Processing OCR..." : "Upload & Analyze"}
                        </button>
                    </div>
                )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Past Reports</h2>
                </div>

                <div className="divide-y divide-gray-100">
                    {pastReports.map((report) => (
                        <div key={report.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="mb-4 sm:mb-0">
                                <h3 className="text-gray-900 font-bold mb-1">{report.name}</h3>
                                <div className="flex items-center text-sm text-gray-500 space-x-4">
                                    <span>📅 {report.date}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${report.status === "Structured" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                        }`}>
                                        {report.status}
                                    </span>
                                </div>
                            </div>
                            <button className="text-primary font-medium hover:text-primary-dark text-sm bg-orange-50 px-4 py-2 rounded-lg">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
