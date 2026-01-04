"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Bus, CreditCard, Lock, ShieldCheck, X, LogOut, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
    // Mock User Data
    const [user, setUser] = useState({
        name: "Alex Johnson",
        mobile: "+91 98765 43210",
        busNumber: "MH 12 AB 1234",
        prn: "12345678"
    });

    const router = useRouter();
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

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

    const handleLogout = () => {
        // Clear any session data here if needed
        // For now, just redirect to home
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="text-center sm:text-left space-y-1">
                    <h1 className="text-3xl font-bold text-cc-purple-500">My Account</h1>
                    <p className="text-muted-foreground">Manage your personal details</p>
                </div>

                {/* Profile Card */}
                <div className="bg-card/70 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 shadow-xl animate-pop-in">
                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cc-purple-500 to-cc-purple-700 p-1 shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pop-in delay-200 opacity-0">
                            <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                                <span className="text-4xl font-bold text-primary">{user.name.charAt(0)}</span>
                            </div>
                        </div>

                        <div className="text-center sm:text-left pt-2">
                            <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                            <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary-foreground rounded-full text-xs font-semibold mt-2">
                                Student
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                        <InfoItem className="animate-pop-in delay-300 opacity-0" icon={<Phone size={20} />} label="Mobile Number" value={user.mobile} />
                        <InfoItem className="animate-pop-in delay-400 opacity-0" icon={<CreditCard size={20} />} label="PRN" value={user.prn} />
                        <InfoItem className="animate-pop-in delay-500 opacity-0" icon={<Bus size={20} />} label="Bus Number" value={user.busNumber} />
                    </div>

                    <div className="mt-10 pt-6 border-t border-cc-pista-900/10 flex justify-end gap-3 animate-pop-in delay-700 opacity-0">
                        <button
                            onClick={handleOpenModal}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cc-purple-600 hover:bg-cc-purple-700 text-white rounded-xl font-medium shadow-md hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all active:scale-95"
                        >
                            <Lock size={18} />
                            Change Password
                        </button>
                        <button
                            onClick={() => setLogoutModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-medium shadow-sm hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all active:scale-95"
                        >
                            <LogOut size={18} />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden p-6 relative border border-border">
                        <button
                            onClick={() => setPasswordModalOpen(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-secondary/10 text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-3">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Change Password</h3>
                            <p className="text-sm text-muted-foreground">Secure your account</p>
                        </div>

                        {step === 'INIT' && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground text-center">
                                    We will send a One Time Password (OTP) to <span className="font-semibold text-foreground">{user.mobile}</span>
                                </p>
                                <button
                                    onClick={handleSendOtp}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-all flex justify-center items-center"
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
                                    className="w-full py-3 bg-cc-purple-600 hover:bg-cc-purple-700 text-white rounded-xl font-semibold shadow-md transition-all flex justify-center items-center"
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

            {/* Logout Confirmation Modal */}
            {isLogoutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden p-6 relative border border-border">
                        <button
                            onClick={() => setLogoutModalOpen(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Sign Out?</h3>
                            <p className="text-sm text-muted-foreground mt-1">Are you sure you want to log out of your account?</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-semibold shadow-md transition-all"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function InfoItem({ icon, label, value, className }) {
    return (
        <div className={`flex items-start gap-4 p-4 rounded-2xl bg-card/50 border border-cc-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:bg-card/80 transition-all ${className || ''}`}>
            <div className="p-2.5 bg-cc-purple-500/10 text-cc-purple-500 rounded-xl border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-semibold text-foreground text-lg">{value}</p>
            </div>
        </div>
    );
}
