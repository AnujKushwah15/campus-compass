'use client';
import { useEffect, useRef } from 'react';

export default function BackgroundAnimation() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let animationFrameId;

        // Configuration
        const particleCount = 50; // Reduced count slightly for larger icons
        const connectionDistance = 150;
        const mouseDistance = 200;

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;

                // Theme colors: Purple, Sky, and a subtle Amber for "Commute/Time" feel
                const colors = ['rgba(139, 92, 246, ', 'rgba(14, 165, 233, '];
                this.colorBase = colors[Math.floor(Math.random() * colors.length)];
                this.opacity = Math.random() * 0.5 + 0.3;

                // Types: dot (default), bus, pin
                const rand = Math.random();
                if (rand > 0.90) this.type = 'bus';
                else if (rand > 0.80) this.type = 'pin';
                else this.type = 'dot';
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            drawBus(x, y, color) {
                ctx.fillStyle = color;
                // Bus Body - Scaled up ~1.5x
                ctx.beginPath();
                ctx.roundRect(x - 12, y - 7.5, 24, 15, 3);
                ctx.fill();
                // Windows
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(x - 9, y - 4.5, 18, 4.5);

                // Wheels
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x - 6, y + 7.5, 3, 0, Math.PI * 2);
                ctx.arc(x + 6, y + 7.5, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            drawPin(x, y, color) {
                ctx.fillStyle = color;
                ctx.beginPath();
                // Pin Head - Scaled up ~1.5x
                ctx.arc(x, y - 6, 7.5, 0, Math.PI * 2);
                // Pin Point
                ctx.moveTo(x - 6, y - 3);
                ctx.lineTo(x, y + 9);
                ctx.lineTo(x + 6, y - 3);
                ctx.fill();
                // Dot in pin
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(x, y - 6, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            draw() {
                const color = this.colorBase + this.opacity + ')';

                if (this.type === 'bus') {
                    this.drawBus(this.x, this.y, color);
                } else if (this.type === 'pin') {
                    this.drawPin(this.x, this.y, color);
                } else {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                }
            }
        }

        const init = () => {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        let mouse = { x: null, y: null };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((particle, i) => {
                particle.update();
                particle.draw();

                // Connect particles
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[j].x - particle.x;
                    const dy = particles[j].y - particle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - distance / connectionDistance)})`; // Faint purple connection
                        ctx.lineWidth = 1;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }

                // Mouse interaction
                if (mouse.x != null) {
                    const dx = mouse.x - particle.x;
                    const dy = mouse.y - particle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouseDistance) {
                        const angle = Math.atan2(dy, dx);
                        const force = (mouseDistance - distance) / mouseDistance;
                        const pushX = Math.cos(angle) * force * 2;
                        const pushY = Math.sin(angle) * force * 2;

                        particle.vx -= pushX * 0.05;
                        particle.vy -= pushY * 0.05;
                    }
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
        }

        window.addEventListener('resize', resize);
        // Attach listeners to window/document to catch mouse outside canvas if needed, 
        // but attaching to canvas is fine for 'hover' effect.
        window.addEventListener('mousemove', handleMouseMove); // Use window to track mouse better across page hero

        resize();
        init();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient Background Layer */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cc-purple-900/5 to-background z-0"></div>
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 w-full h-full opacity-60"
            />
        </div>
    );
}
