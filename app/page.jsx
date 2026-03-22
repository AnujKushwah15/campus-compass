"use client";
import Link from 'next/link';
import { MapPin, Shield, Clock, Smartphone, Menu, X, ArrowRight, CheckCircle, Users, Facebook, Twitter, Instagram, Linkedin, Map } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';
import Card from '@/components/ui/Card';
import TextReveal from '@/components/ui/TextReveal';
import ScrollReveal from '@/components/ui/ScrollReveal';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 isolate ${isScrolled ? 'bg-background/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 flex items-center justify-between relative">
          {/* Left */}
          <div className="flex-shrink-0 z-10">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
            <div className="flex items-center space-x-8">
              <NavLink href="#home" label="Home" />
              <NavLink href="#features" label="Features" />
              <NavLink href="#benefits" label="Why Us" />
              <NavLink href="#contact" label="Contact" />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4 flex-shrink-0 z-10">
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth">
                <Button variant="secondary" size="sm" className="hidden lg:inline-flex border-primary text-primary hover:bg-muted hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all duration-300">
                  Log In
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="primary" size="sm" className="shadow-lg shadow-cc-purple-500/20 ring-2 ring-cc-purple-500 hover:ring-cc-purple-400 transition-all">
                  Get Started
                </Button>
              </Link>
              <ThemeToggle />
            </div>

            {/* Mobile Menu Button and Theme Toggle */}
            <div className="md:hidden flex items-center gap-4">
              <ThemeToggle />
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-foreground p-2">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-xl p-4 flex flex-col space-y-4 animate-in slide-in-from-top-5">
            <MobileNavLink href="#home" label="Home" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="#features" label="Features" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="#benefits" label="Benefits" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="#contact" label="Contact" onClick={() => setMobileMenuOpen(false)} />
            <div className="pt-4 flex flex-col space-y-3">
              <Link href="/auth" className="w-full">
                <Button variant="secondary" className="w-full justify-center">Log In</Button>
              </Link>
              <Link href="/auth" className="w-full">
                <Button variant="primary" className="w-full justify-center">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <BackgroundAnimation />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-6 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Live System Active
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight max-w-4xl mx-auto animate-fade-in-slide-up">
            Next-Gen Campus <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cc-purple-600 to-cc-sky-500">Campus Compass</span>
          </h1>
          <TextReveal
            text="Experience real-time bus location, enhanced safety, and seamless communication for students, parents, and administration."
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed h-20 md:h-auto"
            delay={500}
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth">
              <Button size="lg" className="rounded-full px-8 shadow-xl shadow-cc-purple-500/20 ring-2 ring-cc-purple-500 hover:ring-cc-purple-400 hover:shadow-cc-purple-500/30 transition-all hover:scale-105">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="secondary" size="lg" className="rounded-full px-8 bg-white/60 backdrop-blur-sm border-white hover:bg-white transition-all">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Hero Mockup Area */}
          <ScrollReveal className="mt-16 md:mt-24 w-full max-w-5xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cc-purple-500 to-cc-sky-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-1000 animate-pulse"></div>
            <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border-2 border-cc-purple-500/50 shadow-[0_0_30px_rgba(139,92,246,0.2)] overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center group-hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-500">
              <div className="text-center p-8">
                <div className="scale-150 opacity-100 mb-4 flex justify-center filter drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"><Logo /></div>
                <p className="text-cc-purple-200 font-bold text-xl md:text-2xl tracking-widest uppercase drop-shadow-md">Safe • Secure • Smart</p>
              </div>
              {/* Simulated UI cards */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-cc-purple-900/40 to-transparent"></div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need to stay on track</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Campus Compass brings state-of-the-art technology to university transportation.</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ScrollReveal delay={0} className="h-full">
              <FeatureCard
                icon={<MapPin className="text-cc-sky-500" size={32} />}
                title="Real-Time Tracking"
                description="View exact bus locations live on an interactive map with zero latency updates."
              />
            </ScrollReveal>
            <ScrollReveal delay={200} className="h-full">
              <FeatureCard
                icon={<Shield className="text-cc-purple-500" size={32} />}
                title="Enhanced Safety"
                description="SOS alerts, route deviation monitoring, and secure student authentication."
              />
            </ScrollReveal>
            <ScrollReveal delay={400} className="h-full">
              <FeatureCard
                icon={<Clock className="text-cc-brown-500" size={32} />}
                title="Smart Schedules"
                description="AI-powered ETA predictions to help you better plan your commute."
              />
            </ScrollReveal>
            <ScrollReveal delay={600} className="h-full">
              <FeatureCard
                icon={<Smartphone className="text-cc-purple-700" size={32} />}
                title="Mobile First"
                description="A responsive app-like experience available on all your devices."
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="benefits" className="py-24 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Simplifying Campus Commute for Everyone</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  We bridge the gap between students, parents, and college administration.
                  Our platform ensures transparency and reliability in every ride.
                </p>

                <div className="space-y-6">
                  <BenefitRow
                    title="For Students"
                    text="Never miss a bus again with live tracking and instant arrival notifications."
                  />
                  <BenefitRow
                    title="For Parents"
                    text="Peace of mind knowing your child's exact location during their daily commute."
                  />
                  <BenefitRow
                    title="For Administration"
                    text="Efficient fleet management and automated attendance reporting."
                  />
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200} className="relative">
              <div>
                <Card className="p-0 md:p-8 bg-card/80 backdrop-blur border-border shadow-xl relative z-10 overflow-hidden">
                  <div className="p-6 md:p-0 space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-cc-purple-100/50">
                      <div className="bg-white p-3 rounded-full shadow-sm text-cc-purple-600"><CheckCircle size={24} /></div>
                      <div>
                        <h4 className="font-bold text-cc-purple-900">99.9% Uptime</h4>
                        <p className="text-sm text-cc-purple-600">Reliable tracking servers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-cc-sky-100/50">
                      <div className="bg-white p-3 rounded-full shadow-sm text-cc-sky-600"><Users size={24} /></div>
                      <div>
                        <h4 className="font-bold text-cc-purple-900">5000+ Students</h4>
                        <p className="text-sm text-cc-purple-600">Trust Campus Compass daily</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-cc-brown-100/50">
                      <div className="bg-white p-3 rounded-full shadow-sm text-cc-brown-600"><Map size={24} /></div>
                      <div>
                        <h4 className="font-bold text-cc-purple-900">50+ Routes</h4>
                        <p className="text-sm text-cc-purple-600">Optimized daily coverage</p>
                      </div>
                    </div>
                  </div>
                </Card>
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cc-purple-300/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cc-sky-300/20 rounded-full blur-3xl"></div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-cc-purple-950 text-cc-purple-50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="mb-4 grayscale brightness-200 contrast-200 opacity-80">
                {/* Simple text fallback if logo doesn't work well in mono */}
                <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <MapPin className="text-white" size={20} />
                  </div>
                  Campus Compass
                </div>
              </div>
              <p className="text-cc-purple-200 text-sm leading-relaxed">
                Revolutionizing college transportation with enhanced safety and real-time connectivity.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-cc-purple-200">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Student Login</Link></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Parent Portal</Link></li>
                <li><Link href="/staff/login" className="hover:text-white transition-colors">Driver/Staff App</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-cc-pista-300">
                <li><Link href="#about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <SocialIcon icon={<Facebook size={18} />} />
                <SocialIcon icon={<Twitter size={18} />} />
                <SocialIcon icon={<Instagram size={18} />} />
                <SocialIcon icon={<Linkedin size={18} />} />
              </div>
            </div>
          </div>

          <div className="border-t border-cc-purple-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-cc-purple-400">
            <p>&copy; {new Date().getFullYear()} Campus Compass. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Made with ❤️ for safer campuses.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}




function NavLink({ href, label }) {
  return (
    <a href={href} className="text-sm font-medium text-foreground hover:text-cc-purple-500 transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]">
      {label}
    </a>
  )
}

function MobileNavLink({ href, label, onClick }) {
  return (
    <a href={href} onClick={onClick} className="block w-full py-2 text-base font-medium text-foreground border-b border-border hover:bg-muted transition-colors">
      {label}
    </a>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="group h-full p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-2xl hover:shadow-cc-purple-500/20 hover:border-cc-purple-500/30 hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
        {description}
      </p>
    </div>
  )
}

function BenefitRow({ title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 mt-1">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <CheckCircle size={14} />
        </div>
      </div>
      <div>
        <h4 className="font-bold text-foreground text-lg">{title}</h4>
        <p className="text-muted-foreground text-sm mt-1">{text}</p>
      </div>
    </div>
  )
}

function SocialIcon({ icon }) {
  return (
    <a href="#" className="w-8 h-8 rounded-full bg-cc-purple-900 border border-cc-purple-800 flex items-center justify-center text-cc-purple-400 hover:text-white hover:border-cc-purple-500 hover:bg-cc-purple-800 transition-all">
      {icon}
    </a>
  )
}
