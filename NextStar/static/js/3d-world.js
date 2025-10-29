// 3D Game World with Simulated Challenges
class GameWorld3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
        this.ventureBuildings = [];
        
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0a2a);
        
        // Setup camera
        this.camera.position.set(0, 5, 10);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0x00ff88, 1);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
        
        // Create game world
        this.createGround();
        this.createVentureBuildings();
        this.createFloatingParticles();
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(50, 50);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a3a,
            shininess: 100 
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }

    createVentureBuildings() {
        const ventureTypes = [
            { type: 'tech', color: 0x0099ff, position: [-8, 0, -5], size: 1.5 },
            { type: 'energy', color: 0xffaa00, position: [0, 0, -8], size: 2 },
            { type: 'agriculture', color: 0x00ff88, position: [8, 0, -5], size: 1.2 },
            { type: 'finance', color: 0xff44aa, position: [-5, 0, 5], size: 1.8 },
            { type: 'health', color: 0xff4444, position: [5, 0, 5], size: 1.6 }
        ];

        ventureTypes.forEach((venture, index) => {
            const building = this.createBuilding(venture.color, venture.size);
            building.position.set(venture.position[0], venture.position[1], venture.position[2]);
            building.userData = { type: venture.type, id: index + 1 };
            
            // Add floating animation
            this.addFloatingAnimation(building);
            
            // Add glow effect
            this.addGlowEffect(building, venture.color);
            
            this.scene.add(building);
            this.ventureBuildings.push(building);
        });
    }

    createBuilding(color, size) {
        const geometry = new THREE.BoxGeometry(size, size * 3, size);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        });
        return new THREE.Mesh(geometry, material);
    }

    addFloatingAnimation(building) {
        const startY = building.position.y;
        const speed = 0.5 + Math.random() * 0.5;
        
        const animate = () => {
            building.position.y = startY + Math.sin(Date.now() * 0.001 * speed) * 0.5;
            building.rotation.y += 0.01;
        };
        
        // Store animation function
        building.userData.animate = animate;
    }

    addGlowEffect(building, color) {
        const glowGeometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.set(1.2, 1.2, 1.2);
        building.add(glow);
    }

    createFloatingParticles() {
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

            colors[i * 3] = Math.random();
            colors[i * 3 + 1] = Math.random();
            colors[i * 3 + 2] = Math.random();
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true
        });

        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);

        // Animate particles
        this.animateParticles(particleSystem);
    }

    animateParticles(particles) {
        const positions = particles.geometry.attributes.position.array;
        
        const animate = () => {
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 0.01; // Float down
                if (positions[i + 1] < 0) {
                    positions[i + 1] = 20; // Reset to top
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
        };
        
        setInterval(animate, 50);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Animate buildings
        this.ventureBuildings.forEach(building => {
            if (building.userData.animate) {
                building.userData.animate();
            }
        });

        // Slowly rotate camera around scene
        this.camera.position.x = Math.sin(Date.now() * 0.0005) * 15;
        this.camera.position.z = Math.cos(Date.now() * 0.0005) * 15;
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}