"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { Home, Calendar, User, ChevronDown, Bell } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
    const pathname = usePathname();
    const isActive = (path) => pathname === path;

    // Determine context based on path
    const isParent = pathname.startsWith('/dashboard/parent');
    const basePath = isParent ? '/dashboard/parent' : '/dashboard/student';

    // Mock user state (Dynamic for demo)
    const user = isParent
        ? { name: 'Mr. Sharma', role: 'Parent' }
        : { name: 'Alex Johnson', role: 'Student' };

    const [showNotifications, setShowNotifications] = useState(false);

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

    return (
        <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border shadow-sm px-4 sm:px-8 lg:px-12 xl:px-16 py-3">
            <div className="w-full flex items-center justify-between relative">
                {/* Left: Logo */}
                <div className="flex-shrink-0 z-10">
                    <Link href={basePath} className="hover:opacity-80 transition-opacity flex items-center">
                        <Logo />
                    </Link>
                </div>

                {/* Center: Navigation (Hidden on mobile for simplicity in this demo, but could be hamburger) */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                    <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/10 p-1 rounded-full border border-slate-300/50 dark:border-white/20 backdrop-blur-md">
                        <NavItem href={basePath} icon={<Home size={18} />} label="Home" active={pathname === basePath} />
                        <NavItem href={`${basePath}/attendance`} icon={<Calendar size={18} />} label="Attendance" active={pathname.startsWith(`${basePath}/attendance`)} />
                        <NavItem href={`${basePath}/profile`} icon={<User size={18} />} label="Profile" active={isActive(`${basePath}/profile`)} />
                    </div>
                </div>

                {/* Right: User Profile */}
                <div className="flex items-center gap-4 flex-shrink-0 z-10">
                    <ThemeToggle className="scale-90" />
                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-cc-purple-800 hover:bg-cc-purple-500/10 rounded-full transition-colors relative"
                        >
                            <Bell size={20} />
                            {dummyNotifications.some(n => !n.read) && (
                                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-400 rounded-full border border-white" />
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 animate-dropdown-enter">
                                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/50">
                                    <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">Notifications</h3>
                                    <span className="text-xs text-cc-purple-600 dark:text-cc-purple-300 font-medium px-2 py-0.5 bg-cc-purple-100 dark:bg-cc-purple-900/30 rounded-full">
                                        {dummyNotifications.length} New
                                    </span>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {dummyNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-3 border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer
                                                ${notification.type === 'emergency' ? 'bg-red-50 hover:bg-red-100/80 dark:bg-red-900/20 dark:hover:bg-red-900/30' : ''}
                                                ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                            `}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 
                                                    ${notification.type === 'emergency' ? 'bg-red-500 animate-pulse' : 'bg-cc-purple-500'}
                                                `} />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className={`text-sm font-medium leading-tight ${notification.type === 'emergency' ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-slate-200'}`}>
                                                            {notification.type === 'emergency' && <span className="text-red-600 dark:text-red-400 font-bold text-xs uppercase block mb-0.5">Emergency Alert</span>}
                                                            {notification.message}
                                                        </p>
                                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap ml-2">{notification.time}</span>
                                                    </div>

                                                    {notification.location && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-1">
                                                            <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-600" />
                                                            <span>Near {notification.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-center">
                                    <button className="text-xs font-medium text-cc-purple-600 dark:text-cc-purple-400 hover:text-cc-purple-700 dark:hover:text-cc-purple-300 transition-colors">
                                        Mark all as read
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Dropdown Trigger */}
                    <div className="flex items-center gap-3 pl-3 border-l border-border cursor-pointer group">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cc-sky-400 to-cc-brown-500 p-0.5 shadow-sm group-hover:shadow-glow transition-all">
                            <div className="w-full h-full bg-card rounded-full flex items-center justify-center text-foreground font-bold text-sm">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                        <div className="hidden sm:block text-sm">
                            <p className="font-semibold text-foreground leading-none">{user.name}</p>
                            <p className="text-muted-foreground font-medium text-xs mt-0.5">{user.role}</p>
                        </div>
                        <ChevronDown size={16} className="text-muted-foreground group-hover:translate-y-0.5 transition-transform" />
                    </div>
                </div>
            </div>
        </nav>
    );
}

function NavItem({ href, icon, label, active }) {
    return (
        <Link
            href={href}
            className={`
        flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
        ${active
                    ? 'bg-cc-purple-500 text-white shadow-md'
                    : 'text-slate-700 dark:text-cc-purple-100 hover:bg-slate-300/50 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white'}
      `}
        >
            {icon}
            <span>{label}</span>
        </Link>
    )
}
