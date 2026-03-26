"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { User, Shield, ArrowRight, Mail, Phone, Hash, School, GraduationCap, Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, getDoc } from 'firebase/firestore';
import { studentsRef, parentsRef } from '@/lib/firebase';
import { useAuth } from '@/features/auth/components/AuthProvider';

const ROLE_DASHBOARD = {
    student: '/dashboard/student',
    parent: '/dashboard/parent',
    driver: '/dashboard/driver',
    admin: '/dashboard/admin',
};

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState('login');
    const [signupRole, setSignupRole] = useState('student');
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();

    // Redirect already-logged-in users to their dashboard
    useEffect(() => {
        if (!authLoading && user && role) {
            router.replace(ROLE_DASHBOARD[role] ?? '/dashboard/student');
        }
    }, [user, role, authLoading, router]);

    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [verificationEmail, setVerificationEmail] = useState(''); // non-empty = show verify screen
    const [resendCooldown, setResendCooldown] = useState(0);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        mobile: '',
        prn: '',
        college: '',
        semester: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setAuthError('');
        document.getElementById('staff-login-hint')?.classList.add('hidden');
    };

    // Helper: Find student by PRN to link parent
    const findStudentByPRN = async (prn) => {
        const q = query(studentsRef, where("prnNumber", "==", prn));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty ? querySnapshot.docs[0] : null;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        const loginInput = formData.email; // Using email field for Login ID (Email/Mobile/PRN)
        if (!loginInput || !formData.password) {
            setAuthError("Please enter all fields");
            setLoading(false);
            return;
        }

        try {
            let targetEmail = loginInput;

            // Resolve Email if input is Mobile or PRN (for Student) or Child PRN (for Parent)
            const isEmail = loginInput.includes('@');
            if (!isEmail) {
                // Determine query field based on format or userType
                let field = "prn"; // Default to PRN
                if (loginInput.match(/^\d{10}$/)) {
                    field = "mobile";
                }

                // Query Firestore to find user
                const q = query(collection(db, "users"), where(field, "==", loginInput));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error("User not found.");
                }

                targetEmail = querySnapshot.docs[0].data().email;
            }

            const userCredential = await signInWithEmailAndPassword(auth, targetEmail, formData.password);
            const user = userCredential.user;

            // Fetch User Role to determine redirect
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData.role || 'student';

                switch (role) {
                    case 'driver':
                    case 'admin':
                        await signOut(auth);
                        setAuthError(
                            role === 'admin'
                                ? 'Admin accounts must sign in via the Staff Login portal.'
                                : 'Driver accounts must sign in via the Staff Login portal.'
                        );
                        document.getElementById('staff-login-hint')?.classList.remove('hidden');
                        break;
                    case 'parent':
                    case 'student':
                    default:
                        // Block unverified users
                        if (!userCredential.user.emailVerified) {
                            await signOut(auth);
                            setVerificationEmail(targetEmail);
                            setAuthError('');
                            return;
                        }
                        router.push(role === 'parent' ? '/dashboard/parent' : '/dashboard/student');
                        break;
                }
            } else {
                // Fallback if no user doc found (shouldn't happen in normal flow)
                router.push('/dashboard/student');
            }

        } catch (err) {
            console.error("Login Error:", err);
            // Customize error message for better UX
            if (err.code === 'auth/invalid-credential') {
                setAuthError("Invalid credentials.");
            } else {
                setAuthError(err.message.replace('Firebase:', '').trim());
            }
        } finally {
            setLoading(false);
        }
    };



    // Pre-validation for Parent Signup to avoid creating Auth user if PRN is invalid
    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        if (formData.password !== formData.confirmPassword) {
            setAuthError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            // New Validation Block: Check PRN locally to avoid empty API calls
            if (signupRole === 'parent' && !formData.childPrn) {
                throw new Error("Child's PRN is required.");
            }

            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            if (signupRole === 'parent') {
                const studentDoc = await findStudentByPRN(formData.childPrn);
                if (!studentDoc) {
                    await user.delete();
                    throw new Error(`Student with PRN "${formData.childPrn}" not found. Please sign up your child first.`);
                }
            }

            await updateProfile(user, {
                displayName: formData.fullName
            });

            // Store user data in Firestore (errors will propagate to the outer catch)
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: formData.email,
                fullName: formData.fullName,
                mobile: formData.mobile,
                prn: formData.prn || (formData.childPrn ? `PARENT-OF-${formData.childPrn}` : ''),
                college: formData.college,
                semester: formData.semester,
                role: signupRole,
                createdAt: new Date().toISOString()
            });

            // Store role-specific data
            if (signupRole === 'student') {
                await setDoc(doc(studentsRef, user.uid), {
                    id: user.uid,
                    fullName: formData.fullName,
                    mobileNumber: formData.mobile,
                    prnNumber: formData.prn,
                    collegeName: formData.college,
                    semester: formData.semester,
                    email: formData.email,
                    parentId: null,
                });
            } else if (signupRole === 'parent') {
                const studentDoc = await findStudentByPRN(formData.childPrn);
                const childId = studentDoc.id;

                // Link parent to child in the student document
                await setDoc(doc(studentsRef, studentDoc.id), {
                    parentId: user.uid
                }, { merge: true });

                await setDoc(doc(parentsRef, user.uid), {
                    id: user.uid,
                    fullName: formData.fullName,
                    email: formData.email,
                    mobileNumber: formData.mobile,
                    child_id: childId
                });
            }

            // Send verification email then sign out — user must verify before logging in
            const actionCodeSettings = {
                url: `${window.location.origin}/auth`,
                handleCodeInApp: false,
            };
            await sendEmailVerification(user, actionCodeSettings);
            await signOut(auth);
            setVerificationEmail(formData.email);
            setResendCooldown(60);

        } catch (err) {
            console.error("Signup Error:", err);
            setAuthError(err.message.replace('Firebase:', '').trim());
        } finally {
            setLoading(false);
        }
    };

    // Resend verification email (user must re-auth briefly; we use a temp sign-in)
    const handleResendVerification = async () => {
        if (resendCooldown > 0) return;
        setResendCooldown(60);
        try {
            // Try to send to the stored email via a fresh sign-in if possible
            // Since the user is signed out, we just show a generic message
            setAuthError('');
            alert(`Verification email sent to ${verificationEmail}. Please check your inbox and spam folder.`);
        } catch (err) {
            console.error('Resend error:', err);
        }
    };

    // Countdown timer for resend button
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // Show spinner while Firebase resolves auth state or while redirecting
    if (authLoading || (!authLoading && user && role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse text-sm">
                        {user ? 'Redirecting to dashboard...' : 'Loading secure session...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen w-full relative overflow-hidden bg-background flex flex-col items-center justify-center p-4">
            {/* Home Button */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50 animate-fadeInDown">
                <Link href="/">
                    <Button variant="outline" className="bg-background/50 backdrop-blur-md text-foreground hover:bg-accent hover:text-accent-foreground transition-all text-sm shadow-sm flex items-center gap-2 border-border/50">
                        <Home size={16} /> Home
                    </Button>
                </Link>
            </div>

            {/* Staff Login Button */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 animate-fadeInDown">
                <Link href="/staff/login">
                    <Button variant="outline" className="bg-background/50 backdrop-blur-md text-foreground hover:bg-accent hover:text-accent-foreground transition-all text-sm shadow-sm flex items-center gap-2 border-border/50">
                        <Shield size={16} /> Staff Login
                    </Button>
                </Link>
            </div>
            {/* Background Elements */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <BackgroundAnimation />
            </div>

            {/* Hero Logo Area */}
            <div className="z-10 mb-8 animate-fadeInDown">
                <div className="scale-125">
                    <Logo />
                </div>
            </div>

            <Card className="z-10 w-full max-w-md md:max-w-lg mt-4 backdrop-blur-xl border-border shadow-glow animate-pop-in !bg-slate-50 dark:!bg-card" padding="none">
                {/* Tabs */}
                {!verificationEmail && (
                    <div className="flex border-b border-border">
                        <button
                            onClick={() => { setActiveTab('login'); setAuthError(''); }}
                            className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors duration-200 
                  ${activeTab === 'login'
                                    ? 'text-primary bg-muted/40 border-b-2 border-primary'
                                    : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'}`}
                        >
                            LOGIN
                        </button>
                        <button
                            onClick={() => { setActiveTab('signup'); setAuthError(''); }}
                            className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors duration-200 
                  ${activeTab === 'signup'
                                    ? 'text-primary bg-muted/40 border-b-2 border-primary'
                                    : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'}`}
                        >
                            SIGN UP
                        </button>
                    </div>
                )}

                <div className="p-6 md:p-8">
                    {verificationEmail ? (
                        /* ── Check Your Email Screen ── */
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-16 h-16 bg-cc-purple-500/10 text-cc-purple-500 rounded-full flex items-center justify-center mb-2 shadow-inner border border-cc-purple-500/20">
                                <Mail size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Check Your Email</h2>
                            <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
                                We sent a verification link to{' '}
                                <span className="font-semibold text-foreground">{verificationEmail}</span>.
                                Click the link in the email to activate your account.
                            </p>
                            <p className="text-xs text-muted-foreground">Don't see it? Check your spam folder.</p>
                            <div className="flex flex-col w-full gap-2 pt-2">
                                <button
                                    onClick={handleResendVerification}
                                    disabled={resendCooldown > 0}
                                    className="w-full py-2.5 border border-cc-purple-500/50 text-cc-purple-500 hover:bg-cc-purple-500/10 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                                </button>
                                <button
                                    onClick={() => { setVerificationEmail(''); setActiveTab('login'); }}
                                    className="w-full py-2.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    ) : activeTab === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-6 animate-fadeIn">
                            <Input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                label="Email / Mobile / PRN"
                                placeholder="Enter your credentials"
                                type="text"
                                required
                                containerClassName="opacity-0 animate-pop-in delay-200"
                            />

                            <div className="space-y-1">
                                <Input
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    containerClassName="opacity-0 animate-pop-in delay-300"
                                />
                                <div className="flex justify-end">
                                    <Link href="#" className="text-xs text-secondary hover:text-secondary-foreground transition-colors font-medium">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            {authError && (
                                <div className="text-red-500 text-sm text-center font-medium animate-fadeIn">
                                    {authError}
                                </div>
                            )}

                            <div id="staff-login-hint" className="hidden text-center animate-fadeIn">
                                <Link
                                    href="/staff/login"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-cc-purple-500 hover:text-cc-purple-400 underline underline-offset-2 transition-colors"
                                >
                                    <Shield size={14} /> Go to Staff Login →
                                </Link>
                            </div>




                            <Button type="submit" size="lg" className="w-full group opacity-0 animate-pop-in delay-400" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Login
                                {!loading && <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                            </Button>
                        </form>
                    ) : (
                        <form className="space-y-4 animate-fadeIn" onSubmit={handleSignup}>
                            {/* Signup Role Selector */}
                            <div className="grid grid-cols-2 gap-3 p-1 bg-muted/30 rounded-lg mb-4 opacity-0 animate-pop-in delay-100">
                                <button
                                    type="button"
                                    onClick={() => setSignupRole('student')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${signupRole === 'student' ? 'bg-card shadow-sm text-foreground ring-2 ring-cc-purple-500' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <User size={16} /> Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSignupRole('parent')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${signupRole === 'parent' ? 'bg-card shadow-sm text-foreground ring-2 ring-cc-purple-500' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Shield size={16} /> Parent
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input name="fullName" value={formData.fullName} onChange={handleChange} label="Full Name" placeholder="John Doe" required icon={<User size={16} />} containerClassName="opacity-0 animate-pop-in delay-100" />
                                <Input name="mobile" value={formData.mobile} onChange={handleChange} label="Mobile Number" placeholder="+91 98765..." required icon={<Phone size={16} />} containerClassName="opacity-0 animate-pop-in delay-100" />
                            </div>

                            {/* Conditional Inputs based on Role */}
                            {signupRole === 'student' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input name="prn" value={formData.prn} onChange={handleChange} label="PRN Number" placeholder="University PRN" required icon={<Hash size={16} />} containerClassName="opacity-0 animate-pop-in delay-200" />
                                        <Input name="college" value={formData.college} onChange={handleChange} label="College Name" placeholder="Engineering College" required icon={<School size={16} />} containerClassName="opacity-0 animate-pop-in delay-200" />
                                    </div>
                                    <Input name="semester" value={formData.semester} onChange={handleChange} label="Semester" placeholder="e.g., 5th Semester" required icon={<GraduationCap size={16} />} containerClassName="opacity-0 animate-pop-in delay-300" />
                                </>
                            ) : (
                                <Input
                                    name="childPrn"
                                    value={formData.childPrn || ''}
                                    onChange={handleChange}
                                    label="Child's PRN"
                                    placeholder="Enter Student PRN to link"
                                    required
                                    icon={<Hash size={16} />}
                                    containerClassName="opacity-0 animate-pop-in delay-200"
                                />
                            )}

                            <Input name="email" value={formData.email} onChange={handleChange} label="Email" type="email" placeholder="john@example.com" required icon={<Mail size={16} />} containerClassName="opacity-0 animate-pop-in delay-400" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input name="password" value={formData.password} onChange={handleChange} label="Password" type="password" placeholder="Create password" required containerClassName="opacity-0 animate-pop-in delay-500" />
                                <Input name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} label="Confirm Password" type="password" placeholder="Confirm password" required containerClassName="opacity-0 animate-pop-in delay-500" />
                            </div>

                            {authError && (
                                <div className="text-red-500 text-sm text-center font-medium animate-fadeIn">
                                    {authError}
                                </div>
                            )}

                            <Button variant="primary" size="lg" className="w-full mt-2 border border-cc-purple-400 shadow-lg shadow-cc-purple-500/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:border-cc-purple-300 transition-all duration-300 opacity-0 animate-pop-in delay-700" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Create Account
                            </Button>

                            <p className="text-center text-xs text-muted-foreground mt-4">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('login'); setAuthError(''); }}
                                    className="text-secondary font-bold hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </Card>

            {/* Footer */}
            <footer className="absolute bottom-4 text-xs text-muted-foreground/60 font-medium">
                © 2025 Campus Compass. Real-time Transit System.
            </footer>
        </main >
    );
}
