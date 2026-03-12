import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          Welcome to <span className="text-primary">EaseCare</span>
        </h1>
        <p className="text-xl text-gray-600">
          The AI-powered telemedicine platform designed for everyone. Connect with doctors seamlessly, access your medical reports, and get prescriptions delivered right to your home.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          <Link href="/login" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105">
            Patient Portal
          </Link>
          <Link href="/login" className="bg-white border-2 border-primary text-primary hover:bg-gray-50 font-bold py-3 px-8 rounded-full shadow transition-transform transform hover:scale-105">
            Doctor Portal
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-gray-600">Ask questions about your reports and get instant, personalized medical guidance.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Low Bandwidth</h3>
            <p className="text-gray-600">Toggle Low Data Mode to ensure fast access even on rural or slow networks.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Smart OCR</h3>
            <p className="text-gray-600">Upload your physical reports. We'll extract and structure the data automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
