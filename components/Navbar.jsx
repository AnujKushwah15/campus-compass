"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { Home, Calendar, User, ChevronDown, Bell } from 'lucide-react';

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

    return (
        <>
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
                    
                    {/* Desktop-only Right Items */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Notification Bell */}
                        <Link
                            href={`${basePath}/notifications`}
                            className="p-2 text-cc-purple-800 hover:bg-cc-purple-500/10 rounded-full transition-colors relative"
                        >
                            <Bell size={20} />
                            {/* Static unread indicator for demo */}
                            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-400 rounded-full border border-white" />
                        </Link>


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
            </div>
        </nav>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border z-[60] px-4 py-2 pb-safe flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
            <MobileNavItem href={basePath} icon={<Home size={20} />} label="Home" active={pathname === basePath} />
            <MobileNavItem href={`${basePath}/attendance`} icon={<Calendar size={20} />} label="Attendance" active={pathname.startsWith(`${basePath}/attendance`)} />
            
            {/* Mobile Notification Trigger */}
            <MobileNavItem 
                href={`${basePath}/notifications`} 
                icon={
                    <div className="relative">
                        <Bell size={20} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full border border-white dark:border-slate-900" />
                    </div>
                } 
                label="Alerts" 
                active={pathname.startsWith(`${basePath}/notifications`)} 
            />


            <MobileNavItem href={`${basePath}/profile`} icon={<User size={20} />} label="Profile" active={isActive(`${basePath}/profile`)} />
        </div>
        </>
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

function MobileNavItem({ href, icon, label, active }) {
    return (
        <Link
            href={href}
            className={`
        flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl text-[10px] font-bold transition-all duration-300
        ${active
                    ? 'text-cc-purple-600 dark:text-cc-purple-400 bg-cc-purple-50 dark:bg-cc-purple-900/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
      `}
        >
            <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
                {icon}
            </div>
            <span>{label}</span>
        </Link>
    )
}
