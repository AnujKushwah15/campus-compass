"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Bus, CreditCard, Lock, ShieldCheck, X, LogOut, AlertTriangle, Camera, Loader2, Save, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { auth, storage, db } from '@/lib/firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import Cropper from 'react-easy-crop';

// --- Utility Function for Cropping ---
const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
        image.src = url
    })

function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation)

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    }
}

/**
 * This function returns the result of the crop as a blob URL.
 */
async function getCroppedImg(
    imageSrc,
    pixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
) {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return null
    }

    const rotRad = getRadianAngle(rotation)

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    )

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth
    canvas.height = bBoxHeight

    // translate canvas to center for rotation
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotRad)
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
    ctx.translate(-image.width / 2, -image.height / 2)

    // draw image
    ctx.drawImage(image, 0, 0)

    // croppedAreaPixels values are bounding-box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    )

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0)

    // As Blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((file) => {
            resolve(file) // Return Blob directly
        }, 'image/jpeg')
    })
}


export default function ProfileView({ role = "Student" }) {
    // Mock User Data
    const [user, setUser] = useState({
        name: "Alex Johnson",
        mobile: "+91 98765 43210",
        busNumber: "MH 12 AB 1234",
        prn: "12345678",
        photoURL: null
    });

    const router = useRouter();
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

    // Profile Picture States
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Crop Modal States
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [tempImgSrc, setTempImgSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Load actual user data from Auth
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(prev => ({
                    ...prev,
                    name: currentUser.displayName || prev.name,
                    photoURL: currentUser.photoURL,
                    // In a real app, mobile/prn/bus would come from Firestore
                }));
            }
        });
        return () => unsubscribe();
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Instead of uploading directly, open crop modal
        // Limit max size if needed here
        const imageDataUrl = await readFile(file);
        setTempImgSrc(imageDataUrl);

        // Reset crop settings
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });

        setIsCropModalOpen(true);

        // Reset input so same file can be selected again if cancelled
        e.target.value = null;
    };

    const readFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.addEventListener('load', () => resolve(reader.result), false)
            reader.readAsDataURL(file)
        })
    }

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCroppedImage = async () => {
        try {
            setIsUploading(true);
            const croppedBlob = await getCroppedImg(
                tempImgSrc,
                croppedAreaPixels,
                rotation
            )

            console.log('donee', { croppedBlob })

            // Upload Logic
            if (!auth.currentUser) throw new Error("No user logged in");

            console.log("User is authenticated:", auth.currentUser.uid);
            const storageRef = ref(storage, `profile_pictures/${auth.currentUser.uid}`);

            const snapshot = await uploadBytes(storageRef, croppedBlob);
            const downloadURL = await getDownloadURL(storageRef);

            // Update Auth Profile
            await updateProfile(auth.currentUser, {
                photoURL: downloadURL
            });

            setUser(prev => ({ ...prev, photoURL: downloadURL }));
            alert("Profile picture updated successfully!");

            setIsCropModalOpen(false); // Close modal

        } catch (e) {
            console.error(e)
            alert("Failed to upload image: " + e.message);
        } finally {
            setIsUploading(false);
        }
    }


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

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/auth'); // Redirect to auth page
        } catch (error) {
            console.error("Logout Error:", error);
            alert("Failed to log out. Please try again.");
        }
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
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cc-purple-500 to-cc-purple-700 p-1 shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pop-in delay-200 overflow-hidden relative">
                                <div className="w-full h-full bg-card rounded-full flex items-center justify-center overflow-hidden">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-bold text-primary">{user.name.charAt(0)}</span>
                                    )}
                                </div>

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                    <Camera className="text-white w-8 h-8" />
                                </div>

                                {/* Loading Overlay */}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-full">
                                        <Loader2 className="text-white w-8 h-8 animate-spin" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        <div className="text-center sm:text-left pt-2">
                            <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                            <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary-foreground rounded-full text-xs font-semibold mt-2">
                                {role}
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

            {/* Image Crop Modal */}
            {isCropModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px] border border-border">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex justify-between items-center bg-card z-10">
                            <h3 className="text-lg font-bold text-foreground">Edit Profile Picture</h3>
                            <button onClick={() => setIsCropModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cropper Container */}
                        <div className="relative flex-1 bg-black w-full overflow-hidden">
                            <Cropper
                                image={tempImgSrc}
                                crop={crop}
                                rotation={rotation}
                                zoom={zoom}
                                aspect={1} // Square aspect ratio for profile pic
                                onCropChange={setCrop}
                                onRotationChange={setRotation}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                objectFit="contain"
                            />
                        </div>

                        {/* Controls */}
                        <div className="p-6 space-y-6 bg-card border-t border-border z-10">
                            {/* Zoom Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                    <span className="flex items-center gap-1"><ZoomOut size={14} /> Zoom</span>
                                    <span>{Math.round(zoom * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-cc-purple-500"
                                />
                            </div>

                            {/* Rotation Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                    <span className="flex items-center gap-1"><RotateCw size={14} /> Rotation</span>
                                    <span>{rotation}°</span>
                                </div>
                                <input
                                    type="range"
                                    value={rotation}
                                    min={0}
                                    max={360}
                                    step={1}
                                    aria-labelledby="Rotation"
                                    onChange={(e) => setRotation(Number(e.target.value))}
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-cc-purple-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsCropModalOpen(false)}
                                    disabled={isUploading}
                                    className="flex-1 py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCroppedImage}
                                    disabled={isUploading}
                                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-all flex justify-center items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Save Picture
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {isLogoutModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-border text-center space-y-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <LogOut size={32} />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-foreground">Sign Out?</h3>
                            <p className="text-muted-foreground mt-2">Are you sure you want to sign out of your account?</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setLogoutModalOpen(false);
                                    handleLogout();
                                }}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-md transition-colors"
                            >
                                Sign Out
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
