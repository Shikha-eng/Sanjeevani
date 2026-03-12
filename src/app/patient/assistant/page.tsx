"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLowData } from "@/context/LowDataContext";

interface Doctor {
    id: string;
    name: string;
    specialization: string;
    consultationFee: number | null;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isComplex?: boolean;
    specialization?: string;
    doctors?: Doctor[];
}

interface DoctorReplyItem {
    id: string;
    question: string;
    aiResponse: string;
    doctorReply: string;
    doctorReplyAt: string | null;
    reviewedByDoctor: boolean;
    specialization: string | null;
    createdAt: string;
    doctor: {
        name: string;
        specialization: string;
    } | null;
}

interface PatientContext {
    profile: {
        name: string;
        bloodGroup?: string;
        height?: number;
        weight?: number;
        bmi?: number | null;
        conditions: string[];
    };
    reportsCount: number;
}

const QUICK_QUESTIONS = [
    "What should I eat today?",
    "How much should I walk?",
    "What foods should I avoid?",
    "How can I manage my weight?",
    "Tips for better sleep",
    "How to reduce stress?",
];

function renderContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const rendered = parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        );
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="my-0.5">{rendered}</p>;
    });
}

export default function AssistantPage() {
    const { isLowDataMode } = useLowData();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [patientCtx, setPatientCtx] = useState<PatientContext | null>(null);
    const [doctorReplies, setDoctorReplies] = useState<DoctorReplyItem[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadContext();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadContext = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            const res = await fetch("http://localhost:5002/api/assistant/context", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setPatientCtx(data.data);
                const ctx = data.data;
                const conditionText = ctx.profile.conditions.length > 0
                    ? `You have: **${ctx.profile.conditions.join(", ")}**. `
                    : "";
                const bmiText = ctx.profile.bmi ? `Your BMI is **${ctx.profile.bmi}**. ` : "";
                const reportsText = ctx.reportsCount > 0
                    ? `I have access to your **${ctx.reportsCount}** uploaded report(s). `
                    : "";
                setMessages([{
                    id: "1",
                    role: "assistant",
                    content: `Hello, ${ctx.profile.name.split(" ")[0]}! I am your Sanjeevani Health Assistant.\n\n${conditionText}${bmiText}${reportsText}\n\nI can help with diet advice, exercise tips, weight management, and lifestyle guidance. For complex medical questions, I will connect you with the right doctor.\n\nWhat would you like to know?`,
                }]);
            }
        } catch {
            setMessages([{
                id: "1",
                role: "assistant",
                content: "Hello! I am your Sanjeevani Health Assistant. How can I help you today?",
            }]);
        }
    };

    const loadDoctorReplies = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch("http://localhost:5002/api/assistant/questions", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) return;

            const data = await response.json();
            if (data.success) {
                setDoctorReplies(data.data.filter((item: DoctorReplyItem) => item.reviewedByDoctor || item.doctorReply));
            }
        } catch {
            // Silently ignore network errors (backend temporarily unreachable or restarting)
        }
    };

    useEffect(() => {
        loadDoctorReplies();
        const interval = setInterval(loadDoctorReplies, 20000);
        return () => clearInterval(interval);
    }, []);

    const handleSend = async (messageText?: string) => {
        const text = (messageText || input).trim();
        if (!text) return;
        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:5002/api/assistant/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: text }),
            });
            const data = await res.json();
            if (data.success) {
                const { response, isComplex, specialization, doctors } = data.data;
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: response,
                    isComplex,
                    specialization,
                    doctors,
                }]);
            } else {
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Sorry, I could not process your question right now. Please try again.",
                }]);
            }
        } catch {
            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Connection error. Please make sure the server is running and try again.",
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocate = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                window.open(`https://www.google.com/maps/search/doctor+near+me/@${latitude},${longitude},14z`, "_blank");
            },
            () => setLocationError("Could not get your location. Please allow location access.")
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-3xl mx-auto">
            <div className="mb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                    AI Health Assistant
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Personalized advice based on your health profile and reports</p>
            </div>

            {patientCtx && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {patientCtx.profile.conditions.map((c) => (
                        <span key={c} className="bg-red-50 text-red-700 text-xs px-3 py-1 rounded-full font-semibold border border-red-100">
                            {c}
                        </span>
                    ))}
                    {patientCtx.profile.bmi && (
                        <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold border border-blue-100">
                            BMI: {patientCtx.profile.bmi}
                        </span>
                    )}
                    {patientCtx.profile.bloodGroup && (
                        <span className="bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold border border-purple-100">
                            {patientCtx.profile.bloodGroup}
                        </span>
                    )}
                    {patientCtx.reportsCount > 0 && (
                        <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-semibold border border-green-100">
                            {patientCtx.reportsCount} Report{patientCtx.reportsCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            )}

            {doctorReplies.length > 0 && (
                <div className="mb-4 bg-white rounded-2xl shadow-sm border border-green-100 p-4">
                    <h2 className="text-sm font-bold text-green-800 mb-3">Doctor Replies</h2>
                    <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                        {doctorReplies.slice(0, 5).map((reply) => (
                            <div key={reply.id} className="rounded-xl border border-green-100 bg-green-50 p-3">
                                <p className="text-xs text-green-700 font-semibold mb-1">
                                    {reply.doctor?.name || "Doctor Reply"}
                                    {reply.doctor?.specialization ? ` • ${reply.doctor.specialization}` : ""}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">Your question: {reply.question}</p>
                                <p className="text-sm text-gray-800">{reply.doctorReply}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0 mt-1 text-sm font-bold text-indigo-600">
                                    AI
                                </div>
                            )}
                            <div className={`${msg.role === "user" ? "max-w-[80%]" : "w-full max-w-[90%]"}`}>
                                <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                                    msg.role === "user"
                                        ? "bg-indigo-600 text-white rounded-br-none"
                                        : "bg-white border border-gray-200 text-gray-800 shadow-sm rounded-bl-none"
                                }`}>
                                    {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
                                </div>

                                {msg.isComplex && (
                                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-2xl">??</span>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">See a {msg.specialization || "Doctor"}</p>
                                                <p className="text-xs text-gray-500">This question needs professional medical evaluation</p>
                                            </div>
                                        </div>
                                        {msg.doctors && msg.doctors.length > 0 ? (
                                            <div className="space-y-2 mb-3">
                                                {msg.doctors.map((doc) => (
                                                    <Link
                                                        key={doc.id}
                                                        href="/patient/appointments"
                                                        className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all"
                                                    >
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{doc.name}</p>
                                                            <p className="text-xs text-gray-500">{doc.specialization}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {doc.consultationFee && (
                                                                <p className="text-xs font-semibold text-green-700">Rs. {doc.consultationFee}</p>
                                                            )}
                                                            <p className="text-xs text-indigo-600 font-medium">Book</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 mb-3">No {msg.specialization} currently available online.</p>
                                        )}
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <button
                                                onClick={handleLocate}
                                                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
                                            >
                                                Find Doctors Near Me
                                            </button>
                                            <Link
                                                href="/patient/appointments"
                                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
                                            >
                                                Book Appointment
                                            </Link>
                                        </div>
                                        {locationError && <p className="text-xs text-red-500 mt-2">{locationError}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-600">AI</div>
                            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-none px-5 py-3 flex space-x-2 items-center">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {messages.length <= 1 && !isLoading && (
                    <div className="px-4 pt-3 bg-white border-t border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-2">Quick questions:</p>
                        <div className="flex flex-wrap gap-2 pb-2">
                            {QUICK_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleSend(q)}
                                    disabled={isLoading}
                                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1.5 hover:bg-indigo-100 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLowDataMode ? "Type your health question..." : "e.g. What should I eat for breakfast?"}
                            className="flex-1 appearance-none border border-gray-200 rounded-full py-3 px-5 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`rounded-full w-12 h-12 flex items-center justify-center transition-colors shrink-0 ${
                                !input.trim() || isLoading ? "bg-gray-200 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </form>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                        AI responses are informational only. Always consult a doctor for medical decisions.
                    </p>
                </div>
            </div>
        </div>
    );
}
