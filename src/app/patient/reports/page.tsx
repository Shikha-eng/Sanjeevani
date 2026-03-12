"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Report {
    _id: string;
    reportName: string;
    reportType: string;
    uploadDate: string;
    summary: string;
    keyFindings: string[];
    parameters?: {
        name: string;
        value: string;
        unit?: string;
        normalRange?: string;
        status?: string;
    }[];
}

export default function ReportsPage() {
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [reportName, setReportName] = useState("");
    const [reportType, setReportType] = useState("Blood Test");
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('http://localhost:5002/api/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setReports(data.data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!uploadedFile || !reportName) {
            alert('Please select a file and enter a report name');
            return;
        }

        setIsUploading(true);

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                router.push('/login');
                return;
            }

            const formData = new FormData();
            formData.append('report', uploadedFile);
            formData.append('reportName', reportName);
            formData.append('reportType', reportType);

            const response = await fetch('http://localhost:5002/api/reports/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                alert('Report successfully uploaded and processed!');
                setUploadedFile(null);
                setReportName('');
                setReportType('Blood Test');
                fetchReports(); // Refresh reports list
            } else {
                alert(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('An error occurred during upload');
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Medical Reports</h1>
                <p className="text-gray-500 mt-1 text-sm">Upload new tests or view your previous structured details.</p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Upload New Report</h2>

                <div className="space-y-4 mb-6">
                    <div>
                        <label htmlFor="reportName" className="block text-sm font-medium text-gray-700 mb-1">
                            Report Name
                        </label>
                        <input
                            type="text"
                            id="reportName"
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Complete Blood Count"
                        />
                    </div>

                    <div>
                        <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                            Report Type
                        </label>
                        <select
                            id="reportType"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="Blood Test">Blood Test</option>
                            <option value="Urine Test">Urine Test</option>
                            <option value="X-Ray">X-Ray</option>
                            <option value="MRI">MRI</option>
                            <option value="CT Scan">CT Scan</option>
                            <option value="Ultrasound">Ultrasound</option>
                            <option value="ECG">ECG</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-orange-50/50 hover:bg-orange-50 transition-colors">
                    <input
                        type="file"
                        id="report-upload"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="report-upload" className="cursor-pointer">
                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-2xl">
                            📄
                        </div>
                        <p className="text-gray-700 font-medium mb-1">
                            {uploadedFile ? uploadedFile.name : "Click to browse or drag your file here"}
                        </p>
                        <p className="text-gray-500 text-sm">Supports JPG, PNG (Max 10MB) - Images only for OCR</p>
                    </label>
                </div>

                {uploadedFile && reportName && (
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

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        Loading reports...
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No reports uploaded yet. Upload your first report above!
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {reports.map((report) => (
                            <div key={report._id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-gray-900 font-bold mb-1">{report.reportName}</h3>
                                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                                            <span>📅 {formatDate(report.uploadDate)}</span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                {report.reportType}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport(selectedReport?._id === report._id ? null : report)}
                                        className="text-primary font-medium hover:text-primary-dark text-sm bg-orange-50 px-4 py-2 rounded-lg mt-3 sm:mt-0"
                                    >
                                        {selectedReport?._id === report._id ? 'Hide Details' : 'View Details'}
                                    </button>
                                </div>

                                {selectedReport?._id === report._id && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-2">Summary:</h4>
                                            <p className="text-gray-700 text-sm">{report.summary}</p>
                                        </div>

                                        {report.keyFindings && report.keyFindings.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-2">Key Findings:</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {report.keyFindings.map((finding, idx) => (
                                                        <li key={idx} className="text-gray-700 text-sm">{finding}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {report.parameters && report.parameters.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-2">Parameters:</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {report.parameters.map((param, idx) => (
                                                        <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                                                            <span className="text-sm text-gray-700">{param.name}</span>
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {param.value} {param.unit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
