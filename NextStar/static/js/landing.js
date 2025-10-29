// Landing Page Interactions and Animations
class LandingPage {
    constructor() {
        this.init();
    }

    init() {
        console.log('🚀 Initializing Next Star Landing Page...');
        
        this.setupSmoothScrolling();
        this.setupAnimations();
        this.createHeroBackground();
        this.updateLiveStats();
        
        console.log('✅ Landing Page Ready!');
    }

    setupSmoothScrolling() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe elements for animation
        document.querySelectorAll('.vision-card, .process-step, .game-card, .tech-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    createHeroBackground() {
        // Create a simple Three.js background for the hero section
        const canvas = document.getElementById('heroCanvas');
        if (!canvas) return;

        try {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
            
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000, 0);
            
            // Create floating particles
            const particlesGeometry = new THREE.BufferGeometry();
            const particleCount = 1000;
            const posArray = new Float32Array(particleCount * 3);
            
            for (let i = 0; i < particleCount * 3; i++) {
                posArray[i] = (Math.random() - 0.5) * 10;
            }
            
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            
            const particlesMaterial = new THREE.PointsMaterial({
                size: 0.02,
                color: 0x00ff88,
                transparent: true,
                opacity: 0.6
            });
            
            const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(particlesMesh);
            
            camera.position.z = 5;
            
            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                
                particlesMesh.rotation.x += 0.0005;
                particlesMesh.rotation.y += 0.001;
                
                // Gentle floating animation
                const positions = particlesMesh.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.0005;
                }
                particlesMesh.geometry.attributes.position.needsUpdate = true;
                
                renderer.render(scene, camera);
            };
            
            animate();
            
            // Handle resize
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
        } catch (error) {
            console.log('Three.js not available, using fallback background');
            canvas.style.background = 'radial-gradient(circle at center, #0a0a2a 0%, #000 100%)';
        }
    }

    updateLiveStats() {
        // Simulate live updating statistics
        const stats = {
            venturesFunded: 47,
            playersActive: 2847,
            totalEquity: 2800000
        };

        setInterval(() => {
            // Small random fluctuations to make it feel alive
            stats.venturesFunded += Math.random() > 0.8 ? 1 : 0;
            stats.playersActive += Math.floor(Math.random() * 3);
            stats.totalEquity += Math.floor(Math.random() * 1000);
            
            document.getElementById('venturesFunded').textContent = stats.venturesFunded;
            document.getElementById('playersActive').textContent = stats.playersActive.toLocaleString();
            document.getElementById('totalEquity').textContent = `$${(stats.totalEquity / 1000000).toFixed(1)}M`;
        }, 5000);
    }
}

// Global functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function enterGame() {
    // Redirect to main game or show login modal
    window.location.href = '/gaming/'; // Change to your main game page
}

function openWhitepaper() {
    // Open whitepaper PDF or page
    window.open('whitepaper.pdf', '_blank');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LandingPage();
});

// Parallax effect for hero background
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-background');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});