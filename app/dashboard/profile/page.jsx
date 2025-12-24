"use client";

import { useState } from 'react';
import { User, Phone, Bus, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';

export default function ProfilePage() {
    // Mock User Data
    const [user, setUser] = useState({
        name: "Alex Johnson",
        mobile: "+91 98765 43210",
        busNumber: "MH 12 AB 1234",
        prn: "12345678"
    });

    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

    // OTP Flow States
    const [step, setStep] = useState('INIT'); // INIT, OTP_SENT, COMPLETED
    const [otpInput, setOtpInput] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleOpenModal = () => {
        setPasswordModalOpen(true);
        setStep('INIT');
        setOtpInput('');
        setNewPassword('');
        setError('');
        setSuccess('');
    };

    const handleSendOtp = () => {
        setIsLoading(true);
        setError('');

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setStep('OTP_SENT');
            // In a real app, this would be sent to the phone. 
            // For demo, we just show the state change.
        }, 1500);
    };

    const handleVerifyAndChange = () => {
        if (otpInput === '' || newPassword === '') {
            setError('Please fill in all fields');
            return;
        }

        if (otpInput !== '1234') { // Mock OTP check
            setError('Invalid OTP. Use 1234');
            return;
        }

        setIsLoading(true);
        setError('');

        // Simulate Password Update
        setTimeout(() => {
            setIsLoading(false);
            setStep('COMPLETED');
            setSuccess('Password changed successfully!');

            // Close modal after delay
            setTimeout(() => {
                setPasswordModalOpen(false);
            }, 2000);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-cc-canvas p-4 sm:p-8">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="text-center sm:text-left space-y-1">
                    <h1 className="text-3xl font-bold text-cc-pista-900">My Account</h1>
                    <p className="text-cc-pista-600">Manage your personal details</p>
                </div>

                {/* Profile Card */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 sm:p-8 shadow-xl">
                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cc-sky-400 to-cc-brown-500 p-1 shadow-lg">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                <span className="text-4xl font-bold text-cc-pista-800">{user.name.charAt(0)}</span>
                            </div>
                        </div>

                        <div className="text-center sm:text-left pt-2">
                            <h2 className="text-2xl font-bold text-cc-pista-900">{user.name}</h2>
                            <span className="inline-block px-3 py-1 bg-cc-pista-100 text-cc-pista-700 rounded-full text-xs font-semibold mt-2">
                                Student
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                        <InfoItem icon={<Phone size={20} />} label="Mobile Number" value={user.mobile} />
                        <InfoItem icon={<CreditCard size={20} />} label="PRN" value={user.prn} />
                        <InfoItem icon={<Bus size={20} />} label="Bus Number" value={user.busNumber} />
                    </div>

                    <div className="mt-10 pt-6 border-t border-cc-pista-900/10 flex justify-end">
                        <button
                            onClick={handleOpenModal}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cc-brown-500 hover:bg-cc-brown-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                            <Lock size={18} />
                            Change Password
                        </button>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden p-6 relative">
                        <button
                            onClick={() => setPasswordModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-cc-pista-100 text-cc-pista-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
                            <p className="text-sm text-gray-500">Secure your account</p>
                        </div>

                        {step === 'INIT' && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 text-center">
                                    We will send a One Time Password (OTP) to <span className="font-semibold text-gray-900">{user.mobile}</span>
                                </p>
                                <button
                                    onClick={handleSendOtp}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-cc-pista-500 hover:bg-cc-pista-600 text-white rounded-xl font-semibold shadow-md transition-all flex justify-center items-center"
                                >
                                    {isLoading ? 'Sending...' : 'Send OTP'}
                                </button>
                            </div>
                        )}

                        {step === 'OTP_SENT' && (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800 text-center">
                                    OTP sent! (Use <b>1234</b> for demo)
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Enter OTP</label>
                                        <input
                                            type="text"
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value)}
                                            placeholder="XXXX"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cc-pista-500 transition-all font-mono text-center text-lg tracking-widest"
                                            maxLength={4}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cc-pista-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

                                <button
                                    onClick={handleVerifyAndChange}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-cc-brown-500 hover:bg-cc-brown-600 text-white rounded-xl font-semibold shadow-md transition-all flex justify-center items-center"
                                >
                                    {isLoading ? 'Verifying...' : 'Update Password'}
                                </button>
                            </div>
                        )}

                        {step === 'COMPLETED' && (
                            <div className="text-center py-4 space-y-2">
                                <div className="text-green-500 font-bold text-lg">Success!</div>
                                <p className="text-gray-600 text-sm">{success}</p>
                            </div>
                        )}

                    </div>
                </div>
            )}

        </div>
    );
}

function InfoItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/60 hover:bg-white/80 transition-colors">
            <div className="p-2.5 bg-cc-sky-100 text-cc-sky-700 rounded-xl">
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-cc-pista-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-semibold text-cc-pista-900 text-lg">{value}</p>
            </div>
        </div>
    );
}
