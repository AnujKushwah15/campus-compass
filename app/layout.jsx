import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { TripProvider } from "@/features/tracking/context/TripContext";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Campus Compass: Real-time Transit Telemetry",
    description: "GPS & Bus real-time stream telematics tracking portal.",
};

export default function RootLayout({
    children,
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider>
                    <AuthProvider>
                        <TripProvider>
                            {children}
                        </TripProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
