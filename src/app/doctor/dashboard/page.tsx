"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DoctorProfile {
    firstName: string;
    lastName: string;
    specialization?: string;
    phone?: string;
    address?: string;
    onboardingCompleted?: boolean;
}

interface DoctorStats {
    todayMeetings: number;
    pendingAiReviews: number;
    averageRating: number;
    totalRatings: number;
    nextPatient: NextPatientSummary | null;
}

interface ReportParameter {
    name: string;
    value: string;
    unit?: string;
    normalRange?: string;
    status?: "normal" | "high" | "low";
}

interface NextPatientSummary {
    appointmentId: string;
    scheduledAt: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
        bloodGroup: string | null;
        height: number | null;
        weight: number | null;
        bmi: number | null;
        conditions: string[];
        allergies: string[];
        medicalHistory: string;
    };
    latestReports: Array<{
        id: string;
        reportName: string;
        reportType: string;
        uploadDate: string;
        summary: string;
        keyFindings: string[];
        parameters: ReportParameter[];
    }>;
}

interface PendingAiQuestion {
    _id: string;
    question: string;
    aiResponse: string;
    specialization?: string;
    patientId: {
        firstName: string;
        lastName: string;
    };
}

export default function DoctorDashboard() {
    const router = useRouter();
    const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
    const [stats, setStats] = useState<DoctorStats>({
        todayMeetings: 0,
        pendingAiReviews: 0,
        averageRating: 0,
        totalRatings: 0,
        nextPatient: null,
    });
    const [loading, setLoading] = useState(true);
    const [pendingQuestions, setPendingQuestions] = useState<PendingAiQuestion[]>([]);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [replyingId, setReplyingId] = useState<string | null>(null);

    const dashboardCards = [
        {
            label: "Meetings Today",
            value: stats.todayMeetings.toString(),
            icon: "📅",
            subtitle: "Scheduled for today",
        },
        {
            label: "AI Questions Pending",
            value: stats.pendingAiReviews.toString(),
            icon: "🤖",
            subtitle: "Need your review",
        },
        {
            label: "Patient Rating",
            value: `${stats.averageRating.toFixed(1)} ⭐`,
            icon: "⭐",
            subtitle: `${stats.totalRatings} rating${stats.totalRatings === 1 ? "" : "s"}`,
        },
    ];

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    router.push("/login");
                    return;
                }

                const response = await fetch("http://localhost:5002/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (!data.success) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    router.push("/login");
                    return;
                }

                if (data.data.role !== "doctor") {
                    router.push("/login");
                    return;
                }

                if (!data.data.onboardingCompleted) {
                    router.push("/doctor/onboarding");
                    return;
                }

                setDoctor(data.data);

                const statsResponse = await fetch("http://localhost:5002/api/doctor/dashboard/stats", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const statsData = await statsResponse.json();
                if (statsData.success) {
                    setStats(statsData.data);
                }

                const pendingResponse = await fetch("http://localhost:5002/api/doctor/ai-questions/pending", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const pendingData = await pendingResponse.json();
                if (pendingData.success) {
                    setPendingQuestions(pendingData.data);
                }
            } catch (error) {
                console.error("Error fetching doctor profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctor();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!doctor) {
        return null;
    }

    const sendReply = async (questionId: string) => {
        const doctorReply = (replyDrafts[questionId] || "").trim();
        if (!doctorReply) {
            alert("Please write a reply first.");
            return;
        }

        setReplyingId(questionId);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:5002/api/doctor/ai-questions/${questionId}/reply`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ doctorReply }),
            });

            const data = await response.json();
            if (data.success) {
                setPendingQuestions((prev) => prev.filter((item) => item._id !== questionId));
                setReplyDrafts((prev) => ({ ...prev, [questionId]: "" }));
            } else {
                alert(data.message || "Failed to send reply.");
            }
        } catch (error) {
            console.error("Doctor reply error:", error);
            alert("An error occurred while sending the reply.");
        } finally {
            setReplyingId(null);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Dr. {doctor.firstName} {doctor.lastName}</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        {doctor.specialization || "Doctor"} | Sanjeevani Dashboard
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {doctor.phone && (
                            <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium border border-blue-100">
                                Contact: {doctor.phone}
                            </span>
                        )}
                        {doctor.address && (
                            <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium border border-green-100">
                                Location: {doctor.address}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dashboardCards.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl mb-3">{stat.icon}</span>
                        <span className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</span>
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</span>
                        <span className="text-xs text-gray-400 mt-1">{stat.subtitle}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">📋</span> Next Patient
                    </h2>
                    {stats.nextPatient ? (
                        <div className="bg-orange-50 border border-primary/20 rounded-xl p-5 mb-4 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">
                                        {stats.nextPatient.patient.firstName} {stats.nextPatient.patient.lastName}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {stats.nextPatient.patient.conditions.length > 0
                                            ? stats.nextPatient.patient.conditions.join(" • ")
                                            : "No major flagged conditions in profile"}
                                    </p>
                                </div>
                                <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                                    {new Date(stats.nextPatient.scheduledAt).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <p className="text-xs text-gray-500">Blood Group</p>
                                    <p className="font-semibold text-gray-900">{stats.nextPatient.patient.bloodGroup || "N/A"}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <p className="text-xs text-gray-500">Height</p>
                                    <p className="font-semibold text-gray-900">{stats.nextPatient.patient.height ? `${stats.nextPatient.patient.height} cm` : "N/A"}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <p className="text-xs text-gray-500">Weight</p>
                                    <p className="font-semibold text-gray-900">{stats.nextPatient.patient.weight ? `${stats.nextPatient.patient.weight} kg` : "N/A"}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <p className="text-xs text-gray-500">BMI</p>
                                    <p className="font-semibold text-gray-900">{stats.nextPatient.patient.bmi || "N/A"}</p>
                                </div>
                            </div>

                            {(stats.nextPatient.patient.allergies.length > 0 || stats.nextPatient.patient.medicalHistory) && (
                                <div className="bg-white rounded-xl p-4 border border-orange-100 space-y-2">
                                    {stats.nextPatient.patient.allergies.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Allergies</p>
                                            <p className="text-sm text-gray-700">{stats.nextPatient.patient.allergies.join(", ")}</p>
                                        </div>
                                    )}
                                    {stats.nextPatient.patient.medicalHistory && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Medical History</p>
                                            <p className="text-sm text-gray-700">{stats.nextPatient.patient.medicalHistory}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-800">Latest Report Summary</h4>
                                {stats.nextPatient.latestReports.length > 0 ? (
                                    stats.nextPatient.latestReports.map((report) => (
                                        <div key={report.id} className="bg-white rounded-xl p-4 border border-orange-100">
                                            <div className="flex justify-between items-start gap-3 mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{report.reportName}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {report.reportType} • {new Date(report.uploadDate).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 mb-3">
                                                {report.summary || "No report summary available."}
                                            </p>

                                            {report.keyFindings.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Findings</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                        {report.keyFindings.slice(0, 3).map((finding, idx) => (
                                                            <li key={idx}>{finding}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {report.parameters.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Important Parameters</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {report.parameters.map((parameter, idx) => (
                                                            <div key={idx} className="text-sm bg-gray-50 rounded-lg p-2 border border-gray-100">
                                                                <span className="font-medium text-gray-900">{parameter.name}:</span>{" "}
                                                                <span className="text-gray-700">
                                                                    {parameter.value} {parameter.unit || ""}
                                                                </span>
                                                                {parameter.status && parameter.status !== "normal" && (
                                                                    <span className={`ml-2 text-xs font-semibold ${parameter.status === "high" ? "text-red-600" : "text-yellow-700"}`}>
                                                                        {parameter.status.toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white rounded-xl p-4 border border-orange-100 text-sm text-gray-500">
                                        No uploaded reports found for this patient yet.
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <Link href="/doctor/appointments" className="flex-1 bg-white border border-gray-200 text-gray-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                    View Appointments
                                </Link>
                                <Link href="/doctor/queue" className="flex-1 bg-primary text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                                    View Record
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-sm text-gray-500">
                            No upcoming scheduled patient found.
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">🤖</span> AI Action Items
                    </h2>
                    {pendingQuestions.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            No medical questions are waiting for your reply.
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-140 overflow-y-auto pr-1">
                            {pendingQuestions.map((item) => (
                                <div key={item._id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="mb-2">
                                        <p className="font-medium text-sm text-gray-900 mb-1">
                                            {item.patientId.firstName} {item.patientId.lastName} asked: {item.question}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Assigned via AI review{item.specialization ? ` • ${item.specialization}` : ""}
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-3">
                                        <p className="text-xs font-semibold text-amber-800 uppercase mb-1">AI Response</p>
                                        <p className="text-sm text-amber-900">{item.aiResponse}</p>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={replyDrafts[item._id] || ""}
                                        onChange={(e) =>
                                            setReplyDrafts((prev) => ({
                                                ...prev,
                                                [item._id]: e.target.value,
                                            }))
                                        }
                                        placeholder="Write your personal reply to the patient"
                                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => sendReply(item._id)}
                                            disabled={replyingId === item._id}
                                            className="text-xs bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
                                        >
                                            {replyingId === item._id ? "Sending..." : "Send Personal Reply"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
