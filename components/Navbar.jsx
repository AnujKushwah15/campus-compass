"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { Home, Calendar, User, ChevronDown, Bell } from 'lucide-react';
import { useState } from 'react';

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

    return (
        <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/20 px-4 sm:px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Left: Logo */}
                <Link href={basePath} className="hover:opacity-80 transition-opacity">
                    <Logo />
                </Link>

                {/* Center: Navigation (Hidden on mobile for simplicity in this demo, but could be hamburger) */}
                <div className="hidden md:flex items-center gap-1 bg-white/40 p-1 rounded-full border border-white/50 backdrop-blur-md">
                    <NavItem href={basePath} icon={<Home size={18} />} label="Home" active={pathname === basePath} />
                    <NavItem href={`${basePath}/attendance`} icon={<Calendar size={18} />} label="Attendance" active={pathname.startsWith(`${basePath}/attendance`)} />
                    <NavItem href="/dashboard/profile" icon={<User size={18} />} label="Profile" active={isActive('/dashboard/profile')} />
                </div>

                {/* Right: User Profile */}
                <div className="flex items-center gap-4">
                    {/* Notification Bell */}
                    <button className="p-2 text-cc-pista-800 hover:bg-cc-pista-500/10 rounded-full transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-400 rounded-full border border-white" />
                    </button>

                    {/* User Dropdown Trigger */}
                    <div className="flex items-center gap-3 pl-3 border-l border-cc-pista-800/10 cursor-pointer group">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cc-sky-300 to-cc-brown-400 p-0.5 shadow-sm group-hover:shadow-glow transition-all">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-cc-pista-800 font-bold text-sm">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                        <div className="hidden sm:block text-sm">
                            <p className="font-semibold text-cc-pista-800 leading-none">{user.name}</p>
                            <p className="text-cc-pista-500 text-xs mt-0.5">{user.role}</p>
                        </div>
                        <ChevronDown size={16} className="text-cc-pista-500 group-hover:translate-y-0.5 transition-transform" />
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
                    ? 'bg-cc-pista-500 text-white shadow-md'
                    : 'text-cc-pista-800 hover:bg-white/60 hover:text-cc-pista-900'}
      `}
        >
            {icon}
            <span>{label}</span>
        </Link>
    )
}
