"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const [role, setRole] = useState<"patient" | "doctor" | "pharmacy">("patient");
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;
        const name = formData.get('name') as string;
        const ownerName = formData.get('ownerName') as string;
        const licenseNumber = formData.get('licenseNumber') as string;
        const phone = formData.get('phone') as string;

        try {
            const isPharmacy = role === 'pharmacy';
            const endpoint = isPharmacy
                ? (isLogin ? '/api/pharmacy/login' : '/api/pharmacy/signup')
                : (isLogin ? '/api/auth/login' : '/api/auth/signup');

            const body = isPharmacy
                ? (
                    isLogin
                        ? { email, password }
                        : { email, password, name, ownerName, licenseNumber, phone }
                )
                : (
                    isLogin
                        ? { email, password }
                        : { email, password, role, firstName, lastName }
                );

            const response = await fetch(`http://localhost:5002${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                if (isPharmacy) {
                    localStorage.setItem('pharmacyToken', data.token);
                    localStorage.setItem('pharmacy', JSON.stringify(data.pharmacy));

                    if (!isLogin || !data.pharmacy.onboardingCompleted) {
                        router.push('/pharmacy/onboarding');
                    } else {
                        router.push('/pharmacy/dashboard');
                    }
                } else {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Redirect based on role and onboarding status
                    if (data.user.role === 'patient') {
                        if (!isLogin || !data.user.onboardingCompleted) {
                            router.push('/patient/onboarding');
                        } else {
                            router.push('/patient/dashboard');
                        }
                    } else {
                        if (!isLogin || !data.user.onboardingCompleted) {
                            router.push('/doctor/onboarding');
                        } else {
                            router.push('/doctor/dashboard');
                        }
                    }
                }
            } else {
                setError(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
                        {isLogin ? "Sign in to Sanjeevani" : "Create new account"}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Welcome to your digital health companion
                    </p>
                </div>

                <div className="mt-8 flex justify-center space-x-4 mb-6">
                    <button
                        onClick={() => setRole("patient")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${role === "patient" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        Patient
                    </button>
                    <button
                        onClick={() => setRole("doctor")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${role === "doctor" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        Doctor
                    </button>
                    <button
                        onClick={() => setRole("pharmacy")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${role === "pharmacy" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        Pharmacy
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        {!isLogin && role !== 'pharmacy' && (
                            <>
                                <div>
                                    <label htmlFor="firstName" className="sr-only">First Name</label>
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                        placeholder="First Name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="sr-only">Last Name</label>
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                        placeholder="Last Name"
                                    />
                                </div>
                            </>
                        )}
                        {!isLogin && role === 'pharmacy' && (
                            <>
                                <div>
                                    <label htmlFor="name" className="sr-only">Pharmacy Name</label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                        placeholder="Pharmacy Name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="ownerName" className="sr-only">Owner Name</label>
                                    <input
                                        id="ownerName"
                                        name="ownerName"
                                        type="text"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                        placeholder="Owner Name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="licenseNumber" className="sr-only">Drug License Number</label>
                                    <input
                                        id="licenseNumber"
                                        name="licenseNumber"
                                        type="text"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                        placeholder="Drug License Number"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="sr-only">Phone</label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                        placeholder="Phone (optional)"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Please wait...' : (isLogin ? "Sign In" : "Sign Up")}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                        className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                        {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
