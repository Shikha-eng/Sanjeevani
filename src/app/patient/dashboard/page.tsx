"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLowData } from "@/context/LowDataContext";

interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    bloodGroup?: string;
    height?: number;
    weight?: number;
    hasDiabetes?: boolean;
    hasBloodPressure?: boolean;
    onboardingCompleted?: boolean;
}

interface Report {
    _id: string;
    reportName: string;
    reportType: string;
    uploadDate: string;
    summary: string;
    keyFindings: string[];
    parameters: Array<{
        name: string;
        value: string;
        unit: string;
        normalRange: string;
        status: string;
    }>;
}

export default function PatientDashboard() {
    const { isLowDataMode } = useLowData();
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [recentReports, setRecentReports] = useState<Report[]>([]);
    const [allReports, setAllReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserData();
        fetchRecentReports();
        fetchAllReports();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('http://localhost:5002/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setUserData(data.data);
                
                // Redirect to onboarding if not completed
                if (!data.data.onboardingCompleted) {
                    router.push('/patient/onboarding');
                }
            } else {
                localStorage.removeItem('token');
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentReports = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                return;
            }

            const response = await fetch('http://localhost:5002/api/reports/recent/latest?limit=3', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setRecentReports(data.data);
            }
        } catch (error) {
            console.error('Error fetching recent reports:', error);
        }
    };

    const fetchAllReports = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                return;
            }

            const response = await fetch('http://localhost:5002/api/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setAllReports(data.data);
            }
        } catch (error) {
            console.error('Error fetching all reports:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!userData) {
        return null;
    }

    const conditions = [];
    if (userData.hasDiabetes) conditions.push('Diabetes');
    if (userData.hasBloodPressure) conditions.push('High Blood Pressure');

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1 text-sm">Welcome back, {userData.firstName} {userData.lastName}</p>
                </div>
                <Link href="/patient/appointments" className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm">
                    Book Appointment
                </Link>
            </header>

            {/* Profile Summary Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <span className="mr-2">👤</span> Personal Information
                    </h2>
                    <Link 
                        href="/patient/onboarding" 
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        Edit Profile
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Name</p>
                        <p className="text-gray-900 font-medium">{userData.firstName} {userData.lastName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Email</p>
                        <p className="text-gray-900 font-medium">{userData.email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Blood Group</p>
                        <p className="text-gray-900 font-medium">{userData.bloodGroup || 'Not provided'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Contact</p>
                        <p className="text-gray-900 font-medium">{userData.phone || 'Not provided'}</p>
                    </div>
                    {userData.address && (
                        <div className="md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Address</p>
                            <p className="text-gray-900 font-medium">{userData.address}</p>
                        </div>
                    )}
                </div>

                {/* Physical Measurements */}
                {(userData.height || userData.weight) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Physical Measurements</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {userData.height && (
                                <div>
                                    <p className="text-xs text-gray-500">Height</p>
                                    <p className="text-gray-900 font-medium">{userData.height} cm</p>
                                </div>
                            )}
                            {userData.weight && (
                                <div>
                                    <p className="text-xs text-gray-500">Weight</p>
                                    <p className="text-gray-900 font-medium">{userData.weight} kg</p>
                                </div>
                            )}
                            {userData.height && userData.weight && (
                                <div>
                                    <p className="text-xs text-gray-500">BMI</p>
                                    <p className="text-gray-900 font-medium">
                                        {(userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Medical Conditions */}
                {conditions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Known Medical Conditions</p>
                        <div className="flex flex-wrap gap-2">
                            {conditions.map((condition) => (
                                <span key={condition} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
                                    {condition}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Quick Actions & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latest Report Status */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                            <span className="mr-2">📄</span> Recent Reports
                        </h2>
                        {recentReports.length > 0 ? (
                            <div className="space-y-2">
                                {recentReports.map((report) => (
                                    <div key={report._id} className="border-l-2 border-blue-500 pl-3 py-1">
                                        <p className="text-sm font-semibold text-gray-800">{report.reportName}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(report.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 mb-4">No reports uploaded yet. Upload your first medical report!</p>
                        )}
                    </div>
                    <Link href="/patient/reports" className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center mt-4">
                        {recentReports.length > 0 ? 'View All Reports' : 'Upload Report'} <span className="ml-1">→</span>
                    </Link>
                </section>

                {/* AI Assistant Quick Access */}
                <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-indigo-900 mb-2 flex items-center">
                            <span className="mr-2">🤖</span> AI Medical Assistant
                        </h2>
                        <p className="text-sm text-indigo-700 mb-4">Ask questions about your recent reports or general health.</p>
                    </div>
                    <Link href="/patient/assistant" className="bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-4 rounded-lg shadow-sm transition-colors text-sm font-medium">
                        Start Chat
                    </Link>
                </section>
            </div>

            {/* Patient Past History Section */}
            {allReports.length > 0 && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            <span className="mr-2">📋</span> Patient Past History
                        </h2>
                        <Link 
                            href="/patient/reports" 
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            View All Reports
                        </Link>
                    </div>
                    
                    <div className="space-y-6">
                        {allReports.map((report, index) => (
                            <div 
                                key={report._id} 
                                className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                            >
                                {/* Report Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{report.reportName}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {report.reportType}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(report.uploadDate).toLocaleDateString('en-US', { 
                                                    month: 'long', 
                                                    day: 'numeric', 
                                                    year: 'numeric' 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Report Summary */}
                                {report.summary && (
                                    <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Summary</p>
                                        <p className="text-sm text-blue-800">{report.summary}</p>
                                    </div>
                                )}

                                {/* Key Findings */}
                                {report.keyFindings && report.keyFindings.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Key Findings</p>
                                        <ul className="space-y-2">
                                            {report.keyFindings.map((finding, idx) => (
                                                <li key={idx} className="flex items-start">
                                                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                                                    <span className="text-sm text-gray-700">{finding}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Parameters Table */}
                                {report.parameters && report.parameters.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Test Parameters</p>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Parameter</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Normal Range</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {report.parameters.map((param, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{param.name}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                                {param.value} {param.unit}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{param.normalRange || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    param.status === 'normal' 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : param.status === 'high' 
                                                                        ? 'bg-red-100 text-red-800' 
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {param.status.charAt(0).toUpperCase() + param.status.slice(1)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
