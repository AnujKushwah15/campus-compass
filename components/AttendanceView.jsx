"use client";

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AttendanceView({ data, title, studentName, titleClassName }) {
    // data structure expected:
    // { totalDays: 24, presentDays: 20, absentDays: 4, percentage: 83, history: [ { date: '2023-12-01', status: 'present' }, ... ] }

    // Helper to get days in month
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();

    // Generate dummy calendar days if not provided in history
    // We will just map the passed history or create a mock view

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${titleClassName || 'text-cc-purple-800'}`}>{title}</h1>
                    <p className="text-cc-purple-500 text-sm">Attendance for <span className="font-semibold">{studentName}</span> • {currentMonth} {currentYear}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Card className="flex items-center gap-3 !py-2 !px-4 bg-white/60" padding="none">
                        <div className={`w-2.5 h-2.5 rounded-full ${data.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        <span className="text-sm font-semibold text-cc-purple-800">Overall: <AnimatedCounter end={data.percentage} suffix="%" duration={2000} decimals={1} /></span>
                    </Card>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    className="opacity-0 animate-pop-in delay-100"
                    label="Total Working Days"
                    value={<AnimatedCounter end={data.totalDays} />}
                    icon={<Calendar className="text-cc-sky-500" />}
                    color="bg-cc-sky-500/10"
                />
                <StatCard
                    className="opacity-0 animate-pop-in delay-200"
                    label="Days Present"
                    value={<AnimatedCounter end={data.presentDays} delay={200} />}
                    icon={<CheckCircle className="text-green-500" />}
                    color="bg-green-500/10"
                />
                <StatCard
                    className="opacity-0 animate-pop-in delay-300"
                    label="Days Absent"
                    value={<AnimatedCounter end={data.absentDays} delay={400} />}
                    icon={<XCircle className="text-red-500" />}
                    color="bg-red-500/10"
                />
                <StatCard
                    className="opacity-0 animate-pop-in delay-400"
                    label="Attendance %"
                    value={<AnimatedCounter end={data.percentage} suffix="%" decimals={1} delay={600} />}
                    icon={<Clock className="text-cc-brown-400" />}
                    color="bg-cc-brown-400/10"
                />
            </div>

            {/* Calendar View */}
            <Card className="relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] opacity-0 animate-pop-in delay-500">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-cc-purple-800 text-lg">Monthly Overview</h3>
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 dark:bg-green-900 dark:border-green-700"></div>
                            <span className="text-cc-purple-500 dark:text-white">Present</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 dark:bg-red-900 dark:border-red-700"></div>
                            <span className="text-cc-purple-500 dark:text-white">Absent</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300 dark:bg-slate-800 dark:border-slate-600"></div>
                            <span className="text-cc-purple-500 dark:text-white">Holiday/Weekend</span>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid Mockup */}
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-semibold text-cc-purple-400 dark:text-gray-300 uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {/* Empty slots for days before the 1st of the month */}
                    {Array.from({ length: new Date(currentYear, currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[80px]"></div>
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;

                        // Accurate day of week calculation
                        const dateObj = new Date(currentYear, currentDate.getMonth(), day);
                        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat

                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isAbsent = !isWeekend && (day === 4 || day === 12 || day === 21 || day === 25);
                        const isPresent = !isWeekend && !isAbsent;

                        let bgClass = "bg-gray-50 text-gray-400 dark:bg-slate-800/50 dark:text-gray-500"; // Default/Weekend
                        let borderClass = "border-gray-100 dark:border-slate-700"

                        if (isPresent) {
                            bgClass = "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-white dark:hover:bg-green-900/30";
                            borderClass = "border-green-200 dark:border-green-900/50";
                        } else if (isAbsent) {
                            bgClass = "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-white dark:hover:bg-red-900/30";
                            borderClass = "border-red-200 dark:border-red-900/50";
                        }

                        return (
                            <div
                                key={i}
                                className={`
                                    min-h-[60px] md:min-h-[80px] p-2 rounded-lg border flex flex-col items-center justify-between transition-colors
                                    ${bgClass} ${borderClass}
                                `}
                            >
                                <span className="text-sm font-medium">{day}</span>
                                {isPresent && <CheckCircle size={16} className="text-green-500 opacity-60" />}
                                {isAbsent && <XCircle size={16} className="text-red-500 opacity-60" />}
                            </div>
                        )
                    })}
                </div>
                {/* Decorative background elements */}
                <div className="absolute right-0 top-0 w-64 h-64 opacity-[0.03] rounded-full translate-x-20 -translate-y-20 blur-3xl bg-cc-purple-500 pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-48 h-48 opacity-[0.03] rounded-full -translate-x-10 translate-y-10 blur-2xl bg-cc-sky-500 pointer-events-none"></div>
            </Card>
        </div>
    );
}

function StatCard({ label, value, icon, color, className }) {
    const baseColorClass = color.replace('/10', '');

    return (
        <Card className={`flex items-center gap-4 relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] ${className || ''}`} padding="md">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 ${color}`}>{icon}</div>
            <div className="relative z-10">
                <p className="text-cc-purple-500 text-xs font-medium uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
            {/* Decorative background elements */}
            <div className={`absolute right-0 top-0 w-32 h-32 opacity-[0.08] rounded-full translate-x-10 -translate-y-10 blur-xl ${baseColorClass}`}></div>
            <div className={`absolute left-0 bottom-0 w-24 h-24 opacity-[0.06] rounded-full -translate-x-8 translate-y-8 blur-xl ${baseColorClass}`}></div>
        </Card>
    );
}
