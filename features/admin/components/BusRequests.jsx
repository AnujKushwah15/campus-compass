'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { X, Check, XCircle, Clock, Bus, User, Mail, Hash, GraduationCap, School } from 'lucide-react';

export default function BusRequests({ buses = [], isOpen, onClose, onRequestCountChange }) {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [processing, setProcessing] = useState(null); // requestId being processed

    // Listen to pending bus requests
    useEffect(() => {
        const q = query(collection(db, 'busRequests'), where('status', '==', 'pending'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRequests(data);
            onRequestCountChange?.(data.length);
        }, (err) => {
            console.error('BusRequests listener error:', err);
        });
        return () => unsub();
    }, [onRequestCountChange]);

    const handleApprove = async (req, busId) => {
        if (!busId) {
            alert('Please select a bus to assign.');
            return;
        }
        setProcessing(req.id);
        try {
            // 1. Assign busId to the student's user doc
            await updateDoc(doc(db, 'users', req.id), { busId });
            // 2. Update the request status
            await updateDoc(doc(db, 'busRequests', req.id), {
                status: 'approved',
                assignedBusId: busId,
                resolvedAt: serverTimestamp(),
                resolvedBy: user?.uid || 'admin',
            });
        } catch (err) {
            console.error('Approve error:', err);
            alert('Failed to approve request. See console.');
        }
        setProcessing(null);
    };

    const handleReject = async (req) => {
        setProcessing(req.id);
        try {
            await updateDoc(doc(db, 'busRequests', req.id), {
                status: 'rejected',
                resolvedAt: serverTimestamp(),
                resolvedBy: user?.uid || 'admin',
            });
        } catch (err) {
            console.error('Reject error:', err);
        }
        setProcessing(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/90">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-cc-purple-500/10 rounded-full flex items-center justify-center">
                            <Bus size={18} className="text-cc-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Bus Requests</h2>
                            <p className="text-xs text-muted-foreground">
                                {requests.length} pending request{requests.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Request List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3 opacity-60">
                            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center text-2xl">✅</div>
                            <p className="text-muted-foreground font-medium">No pending requests</p>
                            <p className="text-xs text-muted-foreground">All student bus requests have been handled.</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <RequestCard
                                key={req.id}
                                req={req}
                                buses={buses}
                                processing={processing === req.id}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function RequestCard({ req, buses, processing, onApprove, onReject }) {
    const [selectedBusId, setSelectedBusId] = useState(req.preferredBusId || '');

    const createdAt = req.createdAt?.toDate?.();
    const timeAgo = createdAt ? getTimeAgo(createdAt) : 'Just now';

    return (
        <div className="bg-background/80 rounded-xl border border-border p-4 space-y-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            {/* Student Info */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cc-purple-500/10 rounded-full flex items-center justify-center text-lg shrink-0">
                    🎓
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground text-sm truncate">{req.studentName || 'Unknown Student'}</h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {req.studentPrn && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                                <Hash size={10} /> {req.studentPrn}
                            </span>
                        )}
                        {req.studentEmail && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Mail size={10} /> {req.studentEmail}
                            </span>
                        )}
                    </div>
                    {req.studentCollege && (
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <School size={10} /> {req.studentCollege}
                            </span>
                            {req.studentSemester && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <GraduationCap size={10} /> Sem {req.studentSemester}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Clock size={10} />
                    {timeAgo}
                </div>
            </div>

            {/* Message */}
            {req.message && (
                <div className="bg-muted/30 rounded-lg p-2.5 text-xs text-muted-foreground italic border border-border/50">
                    "{req.message}"
                </div>
            )}

            {/* Preferred Bus */}
            {req.preferredBusId && (
                <div className="text-xs text-muted-foreground">
                    Preferred: <span className="font-semibold text-foreground">{buses.find(b => b.id === req.preferredBusId)?.number || req.preferredBusId}</span>
                </div>
            )}

            {/* Bus Selector + Actions */}
            <div className="flex items-center gap-2 pt-1">
                <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-cc-purple-500 text-foreground"
                    disabled={processing}
                >
                    <option value="">Select bus to assign...</option>
                    {buses.map(bus => (
                        <option key={bus.id} value={bus.id}>{bus.number} — {bus.route || 'No route'}</option>
                    ))}
                </select>
                <button
                    onClick={() => onApprove(req, selectedBusId)}
                    disabled={processing || !selectedBusId}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                >
                    <Check size={14} /> Approve
                </button>
                <button
                    onClick={() => onReject(req)}
                    disabled={processing}
                    className="px-3 py-2 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                    <XCircle size={14} />
                </button>
            </div>
        </div>
    );
}

function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
