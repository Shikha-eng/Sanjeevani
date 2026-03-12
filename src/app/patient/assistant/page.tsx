"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLowData } from "@/context/LowDataContext";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isUnsure?: boolean;
}

export default function AssistantPage() {
    const { isLowDataMode } = useLowData();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I am your EaseCare Medical Assistant. How can I help you today? I can answer questions based on your medical records.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // Simulate RAG chatbot response
        setTimeout(() => {
            let responseText = "Based on your medical records, this seems okay. But remember to monitor your blood sugar.";
            let unsure = false;

            if (userMsg.content.toLowerCase().includes("rasmalai") || userMsg.content.toLowerCase().includes("diabetes")) {
                responseText = "According to your records, you have Type 2 Diabetes. Consuming rasmalai (which is high in sugar) is not recommended as it will spike your blood glucose levels. Please consult your doctor for accurate advice.";
            } else if (userMsg.content.toLowerCase().includes("headache")) {
                responseText = "I do not see any chronic headache conditions in your records. Please consult your doctor for accurate advice.";
                unsure = true;
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: responseText,
                isUnsure: unsure,
            };

            setMessages((prev) => [...prev, assistantMsg]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-3xl mx-auto">
            <div className="mb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <span className="mr-3">🤖</span> AI Assistant
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Ask about your health based on your uploaded reports.</p>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-5 py-3 ${msg.role === "user"
                                        ? "bg-primary text-white rounded-br-none"
                                        : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-none"
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                {msg.isUnsure && (
                                    <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                                        ⚠️ This question has been flagged for your doctor to review.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-100 text-gray-500 shadow-sm rounded-2xl rounded-bl-none px-5 py-3 text-sm flex space-x-2 items-center">
                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLowDataMode ? "Type your question..." : "Ask: 'Can I eat rasmalai?'"}
                            className="flex-1 appearance-none border border-gray-200 rounded-full py-3 px-5 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`rounded-full w-12 h-12 flex items-center justify-center transition-colors ${!input.trim() || isLoading
                                    ? "bg-gray-200 text-gray-400"
                                    : "bg-primary text-white hover:bg-primary-dark shadow-sm"
                                }`}
                        >
                            <span className="text-lg">⬆️</span>
                        </button>
                    </form>
                    {isLowDataMode && (
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                            Low Data Mode Active. Responses are text-only to save bandwidth.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
