"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
    applyActionCode,
    confirmPasswordReset,
    verifyPasswordResetCode,
    checkActionCode,
} from 'firebase/auth';
import Logo from '@/components/Logo';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';
import { CheckCircle2, XCircle, KeyRound, Mail, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuthActionPage() {
    return (
        <Suspense fallback={<FullPageSpinner label="Loading..." />}>
            <ActionHandler />
        </Suspense>
    );
}

// ─── Action Handler (reads query params) ─────────────────────────────────────
function ActionHandler() {
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (!mode || !oobCode) {
        return <ResultScreen status="error" title="Invalid Link" message="This link is missing required parameters. It may have been corrupted." />;
    }

    switch (mode) {
        case 'verifyEmail':
            return <VerifyEmailHandler oobCode={oobCode} />;
        case 'resetPassword':
            return <ResetPasswordHandler oobCode={oobCode} />;
        case 'recoverEmail':
            return <RecoverEmailHandler oobCode={oobCode} />;
        default:
            return <ResultScreen status="error" title="Unknown Action" message={`Unrecognised mode: "${mode}"`} />;
    }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────
function VerifyEmailHandler({ oobCode }) {
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        applyActionCode(auth, oobCode)
            .then(() => setStatus('success'))
            .catch((err) => {
                setErrorMsg(
                    err.code === 'auth/expired-action-code'
                        ? 'This verification link has expired. Please request a new one.'
                        : err.code === 'auth/invalid-action-code'
                            ? 'This verification link has already been used or is invalid.'
                            : 'Verification failed. Please try again.'
                );
                setStatus('error');
            });
    }, [oobCode]);

    if (status === 'loading') return <FullPageSpinner label="Verifying your email…" />;

    if (status === 'success') {
        return (
            <ResultScreen
                status="success"
                title="Email Verified!"
                message="Your email address has been verified. You can now log in to your Campus Compass account."
                action={<Link href="/auth" className="btn-primary">Go to Login <ArrowRight size={16} className="ml-1" /></Link>}
            />
        );
    }

    return (
        <ResultScreen
            status="error"
            title="Verification Failed"
            message={errorMsg}
            action={<Link href="/auth" className="btn-secondary">Back to Login</Link>}
        />
    );
}

// ─── Reset Password ───────────────────────────────────────────────────────────
function ResetPasswordHandler({ oobCode }) {
    const router = useRouter();
    const [phase, setPhase] = useState('loading'); // loading | form | success | error
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        verifyPasswordResetCode(auth, oobCode)
            .then((userEmail) => {
                setEmail(userEmail);
                setPhase('form');
            })
            .catch(() => {
                setErrorMsg('This password reset link has expired or already been used. Please request a new one.');
                setPhase('error');
            });
    }, [oobCode]);

    const handleReset = async (e) => {
        e.preventDefault();
        if (password !== confirm) { setErrorMsg("Passwords don't match."); return; }
        if (password.length < 6) { setErrorMsg("Password must be at least 6 characters."); return; }

        setSubmitting(true);
        setErrorMsg('');
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setPhase('success');
        } catch (err) {
            setErrorMsg(
                err.code === 'auth/weak-password'
                    ? 'Password is too weak. Use at least 6 characters.'
                    : 'Failed to reset password. The link may have expired.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (phase === 'loading') return <FullPageSpinner label="Validating reset link…" />;

    if (phase === 'success') {
        return (
            <ResultScreen
                status="success"
                title="Password Reset!"
                message="Your password has been updated successfully. You can now log in with your new password."
                action={<Link href="/auth" className="btn-primary">Go to Login <ArrowRight size={16} className="ml-1" /></Link>}
            />
        );
    }

    if (phase === 'error') {
        return (
            <ResultScreen
                status="error"
                title="Link Expired"
                message={errorMsg}
                action={<Link href="/auth" className="btn-secondary">Back to Login</Link>}
            />
        );
    }

    return (
        <Shell>
            <div className="w-14 h-14 bg-cc-purple-500/10 rounded-2xl flex items-center justify-center text-cc-purple-500 mx-auto mb-5">
                <KeyRound size={28} />
            </div>
            <h1 className="text-2xl font-bold text-foreground text-center mb-1">Reset Password</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
                Setting a new password for <span className="font-semibold text-foreground">{email}</span>
            </p>

            <form onSubmit={handleReset} className="space-y-4">
                <PasswordField
                    label="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showPw}
                    onToggle={() => setShowPw(v => !v)}
                    placeholder="Min. 6 characters"
                />
                <PasswordField
                    label="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    show={showPw}
                    onToggle={() => setShowPw(v => !v)}
                    placeholder="Repeat new password"
                />

                {errorMsg && (
                    <p className="text-red-500 text-sm text-center font-medium">{errorMsg}</p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-cc-purple-600 hover:bg-cc-purple-700 text-white rounded-xl font-semibold shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                    {submitting ? 'Updating…' : 'Set New Password'}
                </button>
            </form>
        </Shell>
    );
}

// ─── Recover Email ────────────────────────────────────────────────────────────
function RecoverEmailHandler({ oobCode }) {
    const [status, setStatus] = useState('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [restoredEmail, setRestoredEmail] = useState('');

    useEffect(() => {
        checkActionCode(auth, oobCode)
            .then((info) => {
                setRestoredEmail(info.data.email || '');
                return applyActionCode(auth, oobCode);
            })
            .then(() => setStatus('success'))
            .catch(() => {
                setErrorMsg('This recovery link has expired or is invalid. Contact support if you need help.');
                setStatus('error');
            });
    }, [oobCode]);

    if (status === 'loading') return <FullPageSpinner label="Restoring your email address…" />;

    if (status === 'success') {
        return (
            <ResultScreen
                status="success"
                title="Email Recovered!"
                message={`Your email address has been restored${restoredEmail ? ` to ${restoredEmail}` : ''}. We recommend changing your password as a precaution.`}
                action={<Link href="/auth" className="btn-primary">Go to Login <ArrowRight size={16} className="ml-1" /></Link>}
            />
        );
    }

    return (
        <ResultScreen
            status="error"
            title="Recovery Failed"
            message={errorMsg}
            action={<Link href="/auth" className="btn-secondary">Back to Login</Link>}
        />
    );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Shell({ children }) {
    return (
        <main className="min-h-screen w-full relative overflow-hidden bg-background flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <BackgroundAnimation />
            </div>
            <div className="z-10 mb-8">
                <Logo />
            </div>
            <div className="z-10 w-full max-w-md bg-slate-50 dark:bg-card border border-border rounded-3xl p-8 shadow-xl animate-pop-in">
                {children}
            </div>
            <footer className="absolute bottom-4 text-xs text-muted-foreground/60 font-medium z-10">
                © 2025 Campus Compass. Real-time Transit System.
            </footer>
        </main>
    );
}

function ResultScreen({ status, title, message, action }) {
    const isSuccess = status === 'success';
    return (
        <Shell>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                {isSuccess ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
            </div>
            <h1 className="text-2xl font-bold text-foreground text-center mb-3">{title}</h1>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">{message}</p>
            {action && (
                <div className="flex justify-center">
                    {action}
                </div>
            )}
        </Shell>
    );
}

function FullPageSpinner({ label }) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            <Loader2 className="w-10 h-10 animate-spin text-cc-purple-500" />
            <p className="text-muted-foreground text-sm animate-pulse">{label}</p>
        </main>
    );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }) {
    return (
        <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required
                    className="w-full p-3 pr-10 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-cc-purple-500 transition-all font-mono text-foreground"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
}
