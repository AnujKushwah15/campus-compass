"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { User, Shield, ArrowRight, Mail, Phone, Hash, School, GraduationCap, Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, getDoc } from 'firebase/firestore';
import { studentsRef, parentsRef } from '@/lib/firebase';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState('login');
    const [signupRole, setSignupRole] = useState('student');
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');

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
    };

    // Helper: Find student by PRN to link parent
    const findStudentByPRN = async (prn) => {
        const q = query(studentsRef, where("prn", "==", prn));
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
                    case 'parent':
                        router.push('/dashboard/parent');
                        break;
                    case 'driver':
                        router.push('/dashboard/driver');
                        break;
                    case 'admin':
                        router.push('/dashboard/admin');
                        break;
                    case 'student':
                    default:
                        router.push('/dashboard/student');
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
            // New Validation Block: Check PRN *before* creating Firebase Auth User
            if (signupRole === 'parent') {
                if (!formData.childPrn) {
                    throw new Error("Child's PRN is required.");
                }
                const studentDoc = await findStudentByPRN(formData.childPrn);
                if (!studentDoc) {
                    throw new Error(`Student with PRN "${formData.childPrn}" not found. Please sign up your child first.`);
                }
            }

            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: formData.fullName
            });

            // Store user data in Firestore
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
                router.push('/dashboard/student');
            } else if (signupRole === 'parent') {
                // We already validated studentDoc exists above, but need to fetch it again or store it? 
                // Let's just refetch or assume it's there. 
                // Optimization: Just refetch to be safe/clean code wise or trust the pre-check.
                const studentDoc = await findStudentByPRN(formData.childPrn); // Guaranteed to exist now
                const childId = studentDoc.id;

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
                router.push('/dashboard/parent');
            }

        } catch (err) {
            console.error("Signup Error:", err);
            setAuthError(err.message.replace('Firebase:', '').trim());
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full relative overflow-hidden bg-background flex flex-col items-center justify-center p-4">
            {/* Home Button */}
            <div className="absolute top-6 left-6 z-50 animate-fadeInDown">
                <Link href="/">
                    <Button variant="outline" className="bg-background/50 backdrop-blur-md text-foreground hover:bg-accent hover:text-accent-foreground transition-all text-sm shadow-sm flex items-center gap-2 border-border/50">
                        <Home size={16} /> Home
                    </Button>
                </Link>
            </div>

            {/* Staff Login Button */}
            <div className="absolute top-6 right-6 z-50 animate-fadeInDown">
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

            {/* Auth Card */}
            <Card className="z-10 w-full max-w-md md:max-w-lg mt-4 backdrop-blur-xl border-border shadow-glow animate-pop-in" padding="none">
                {/* Tabs */}
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

                <div className="p-6 md:p-8">
                    {activeTab === 'login' ? (
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
