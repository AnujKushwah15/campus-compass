"use client";
import { useState } from 'react';
import { Bell, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const router = useRouter();
    const dummyNotifications = [
        {
            id: 1,
            type: 'emergency',
            message: 'Bus breakdown detected. Replacement bus dispatched.',
            time: '2 mins ago',
            location: 'Sector 42 Market, Main Road',
            read: false
        },
        {
            id: 2,
            type: 'info',
            message: 'Your bus has arrived at Pick-up Point A',
            time: '10 mins ago',
            location: 'Shivaji Nagar Stop',
            read: false
        },
        {
            id: 3,
            type: 'info',
            message: 'Bus route delayed by 15 mins due to traffic',
            time: '1 hour ago',
            location: 'Highway 66',
            read: true
        },
        {
            id: 4,
            type: 'info',
            message: 'Morning attendance marked successfully',
            time: '4 hours ago',
            read: true
        }
    ];

    const [notifications, setNotifications] = useState(dummyNotifications);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()} 
                        className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Bell size={24} className="text-cc-purple-500" />
                            Notifications
                        </h1>
                        <p className="text-muted-foreground text-sm">Stay updated with your latest alerts</p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button 
                        onClick={markAllAsRead}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cc-purple-50 dark:bg-cc-purple-500/10 text-cc-purple-600 dark:text-cc-purple-400 hover:bg-cc-purple-100 dark:hover:bg-cc-purple-500/20 rounded-lg text-sm font-medium transition-colors border border-cc-purple-200 dark:border-cc-purple-500/20"
                    >
                        <CheckCircle2 size={16} />
                        <span className="hidden sm:inline">Mark all as read</span>
                        <span className="sm:hidden">Clear</span>
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                            <div 
                                key={notification.id} 
                                onClick={() => markAsRead(notification.id)}
                                className={`p-4 transition-colors cursor-pointer hover:bg-muted/50
                                    ${notification.type === 'emergency' ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
                                    ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}
                                `}
                            >
                                <div className="flex gap-4 items-start">
                                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm
                                        ${notification.read ? 'bg-gray-300 dark:bg-slate-700' : notification.type === 'emergency' ? 'bg-red-500 animate-pulse' : 'bg-cc-purple-500'}
                                    `} />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex justify-between items-start gap-4">
                                            <p className={`text-base font-medium leading-snug 
                                                ${notification.read ? 'text-muted-foreground' : notification.type === 'emergency' ? 'text-red-700 dark:text-red-300' : 'text-foreground'}
                                            `}>
                                                {notification.type === 'emergency' && <span className="text-red-600 dark:text-red-400 font-bold text-xs uppercase block mb-1">Emergency Alert</span>}
                                                {notification.message}
                                            </p>
                                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-md">
                                                {notification.time}
                                            </span>
                                        </div>
                                        
                                        {notification.location && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                                                <span>Near <strong className="font-semibold text-foreground/70">{notification.location}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
