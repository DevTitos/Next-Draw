// Eternal Maze Engine - Advanced Strategic Problem Solving
class EternalMazeEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.maze = null;
        this.player = null;
        this.isInitialized = false;
        this.level = 1;
        this.moves = 0;
        this.startTime = null;
        this.currentTime = 0;
        this.timerInterval = null;
        this.patternsFound = 0;
        this.totalPatterns = 7;
        this.strategyMode = false;
        this.availableStrategies = [];
        this.currentSequence = [];
        this.mazeStructure = null;
        this.lights = [];
        this.particleSystem = null;
        this.patternOrbs = [];
        this.exit = null;
        this.playerLight = null;
        this.animationId = null;
    }

    init() {
        if (this.isInitialized) {
            this.handleResize();
            return;
        }
        
        console.log('🌌 Initializing Eternal Maze...');
        this.setupThreeJS();
        this.createMaze();
        this.setupControls();
        this.startTimer();
        this.isInitialized = true;
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            this.handleResize();
        }, 100);
        
        this.showMessage(
            'Welcome to the Eternal Maze.<br><br>' +
            'This is no ordinary maze. The walls shift, patterns emerge, and only strategic minds can find the exit.<br><br>' +
            '<strong>Your Mission:</strong><br>' +
            '• Find the 7 hidden patterns scattered throughout the maze<br>' +
            '• Use Strategy Mode to input the correct pattern sequence<br>' +
            '• Reach the exit before time runs out<br><br>' +
            'Ordinary moves will keep you trapped forever...',
            'warning'
        );

        // Start animation loop
        this.animate();
    }

    setupThreeJS() {
        const canvas = document.getElementById('mazeCanvas');
        const container = canvas.parentElement;
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 10, 50);

        // Camera setup with dynamic aspect ratio
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 8, 0);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0x00ff88, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Animated point lights
        this.createAnimatedLights();

        // Particle system
        this.createParticleSystem();
    }

    createAnimatedLights() {
        const colors = [0x00ff88, 0x0099ff, 0xff00ff, 0xffff00];
        this.lights = [];

        for (let i = 0; i < 8; i++) {
            const light = new THREE.PointLight(colors[i % colors.length], 1, 20);
            const angle = (i / 8) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 15, 5, Math.sin(angle) * 15);
            this.scene.add(light);
            this.lights.push({ 
                light, 
                angle, 
                speed: 0.5 + Math.random() * 1.5,
                radius: 12 + Math.random() * 6,
                height: 3 + Math.random() * 4
            });
        }
    }

    createParticleSystem() {
        const particleCount = 2000;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = (Math.random() - 0.5) * 200;
            positions[i + 2] = (Math.random() - 0.5) * 200;

            colors[i] = Math.random() * 0.5 + 0.5;
            colors[i + 1] = Math.random() * 0.5 + 0.5;
            colors[i + 2] = Math.random() * 0.5 + 0.5;

            sizes[i / 3] = Math.random() * 0.5 + 0.1;
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });

        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particleSystem);
    }

    createMaze() {
        // Clear existing maze
        if (this.maze) {
            this.scene.remove(this.maze);
        }

        this.maze = new THREE.Group();
        this.mazeStructure = this.generateMazeStructure(this.level);
        
        const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
        const wallMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a2e,
            emissive: 0x00ff88,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.8
        });

        const pathMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.1
        });

        // Create maze walls and paths
        for (let z = 0; z < this.mazeStructure.length; z++) {
            for (let x = 0; x < this.mazeStructure[z].length; x++) {
                if (this.mazeStructure[z][x] === 1) { // Wall
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(x - 7.5, 0, z - 7.5);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.maze.add(wall);
                } else { // Path
                    const path = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.9, 0.9),
                        pathMaterial
                    );
                    path.rotation.x = -Math.PI / 2;
                    path.position.set(x - 7.5, -0.9, z - 7.5);
                    this.maze.add(path);
                }
            }
        }

        // Create exit (hidden until patterns are found)
        this.createExit();

        // Create player
        this.createPlayer();

        // Create pattern orbs
        this.createPatternOrbs();

        this.scene.add(this.maze);
    }

    generateMazeStructure(level) {
        // Complex maze generation with multiple solutions but only one true path
        const size = 15;
        const maze = Array(size).fill().map(() => Array(size).fill(1));

        // Generate multiple paths but with hidden patterns
        this.generatePath(maze, 1, 1, level);
        this.addStrategicElements(maze, level);
        this.addDecoyPaths(maze);

        // Ensure start and end are open
        maze[1][1] = 0;
        maze[size-2][size-2] = 0;

        return maze;
    }

    generatePath(maze, startX, startZ, level) {
        const stack = [{x: startX, z: startZ}];
        const directions = [
            {dx: 2, dz: 0}, {dx: -2, dz: 0},
            {dx: 0, dz: 2}, {dx: 0, dz: -2}
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            maze[current.z][current.x] = 0;

            // Shuffle directions for more randomness
            this.shuffleArray(directions);

            let found = false;
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;

                if (nx >= 0 && nx < maze[0].length && nz >= 0 && nz < maze.length && maze[nz][nx] === 1) {
                    // Carve path
                    maze[current.z + dir.dz/2][current.x + dir.dx/2] = 0;
                    maze[nz][nx] = 0;
                    stack.push({x: nx, z: nz});
                    found = true;
                    break;
                }
            }

            if (!found) {
                stack.pop();
            }
        }
    }

    addStrategicElements(maze, level) {
        // Add strategic decision points
        const decisionPoints = [
            {x: 3, z: 3}, {x: 11, z: 3}, {x: 7, z: 7}, {x: 3, z: 11}, {x: 11, z: 11}
        ];

        decisionPoints.forEach(point => {
            if (maze[point.z] && maze[point.z][point.x] === 0) {
                // Create strategic crossroads
                maze[point.z][point.x] = 2; // Special strategic point
            }
        });
    }

    addDecoyPaths(maze) {
        // Add paths that look promising but lead to dead ends
        for (let i = 0; i < 5; i++) {
            const startX = Math.floor(Math.random() * 5) + 5;
            const startZ = Math.floor(Math.random() * 5) + 5;
            if (maze[startZ][startX] === 0) {
                this.createDecoyPath(maze, startX, startZ);
            }
        }
    }

    createDecoyPath(maze, startX, startZ) {
        // Create paths that look real but are traps
        const length = 3 + Math.floor(Math.random() * 4);
        let x = startX, z = startZ;
        const directions = [
            {dx: 1, dz: 0}, {dx: -1, dz: 0},
            {dx: 0, dz: 1}, {dx: 0, dz: -1}
        ];

        for (let i = 0; i < length; i++) {
            this.shuffleArray(directions);
            let moved = false;

            for (const dir of directions) {
                const nx = x + dir.dx;
                const nz = z + dir.dz;

                if (nx >= 0 && nx < maze[0].length && nz >= 0 && nz < maze.length && maze[nz][nx] === 1) {
                    maze[nz][nx] = 0;
                    x = nx;
                    z = nz;
                    moved = true;
                    break;
                }
            }

            if (!moved) break;
        }
    }

    createPlayer() {
        const geometry = new THREE.ConeGeometry(0.3, 1, 8);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x0099ff,
            emissive: 0x0099ff,
            emissiveIntensity: 0.5
        });

        this.player = new THREE.Mesh(geometry, material);
        this.player.position.set(0.5, 0, 0.5);
        this.player.rotation.x = Math.PI;
        this.maze.add(this.player);

        // Player light
        this.playerLight = new THREE.PointLight(0x0099ff, 1, 5);
        this.player.add(this.playerLight);
    }

    createPatternOrbs() {
        this.patternOrbs = [];
        const patternPositions = this.generatePatternPositions();

        patternPositions.forEach((pos, index) => {
            const geometry = new THREE.SphereGeometry(0.4, 16, 16);
            const material = new THREE.MeshPhongMaterial({
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.8
            });

            const orb = new THREE.Mesh(geometry, material);
            orb.position.set(pos.x - 7.5, 1, pos.z - 7.5);
            orb.userData = { type: 'pattern', index: index + 1 };
            
            // Add pulsing animation
            this.animateOrb(orb);
            
            this.maze.add(orb);
            this.patternOrbs.push(orb);
        });
    }

    generatePatternPositions() {
        // Strategic positions that require pattern recognition
        return [
            {x: 2, z: 2},   // Pattern 1: Starting sequence
            {x: 12, z: 2},  // Pattern 2: Mirror symmetry
            {x: 2, z: 12},  // Pattern 3: Rotational symmetry
            {x: 12, z: 12}, // Pattern 4: Fibonacci sequence
            {x: 7, z: 7},   // Pattern 5: Prime number pattern
            {x: 4, z: 8},   // Pattern 6: Binary decision tree
            {x: 10, z: 6}   // Pattern 7: Final strategic combination
        ];
    }

    animateOrb(orb) {
        const originalScale = 1;
        let time = 0;

        const animate = () => {
            if (!orb.visible) return;
            
            time += 0.02;
            const scale = originalScale + Math.sin(time) * 0.2;
            orb.scale.set(scale, scale, scale);
            
            orb.material.opacity = 0.6 + Math.sin(time * 1.5) * 0.4;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    createExit() {
        const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });

        this.exit = new THREE.Mesh(geometry, material);
        this.exit.rotation.x = Math.PI / 2;
        this.exit.position.set(6.5, 0.1, 6.5);
        this.exit.userData = { type: 'exit' };
        this.maze.add(this.exit);
    }

    setupControls() {
        document.addEventListener('keydown', (event) => {
            if (!this.strategyMode) {
                this.handleBasicMovement(event);
            } else {
                this.handleStrategicMovement(event);
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleBasicMovement(event) {
        const oldPosition = this.player.position.clone();
        let moved = false;

        switch(event.key) {
            case 'ArrowUp':
                this.player.position.z -= 1;
                moved = true;
                break;
            case 'ArrowDown':
                this.player.position.z += 1;
                moved = true;
                break;
            case 'ArrowLeft':
                this.player.position.x -= 1;
                moved = true;
                break;
            case 'ArrowRight':
                this.player.position.x += 1;
                moved = true;
                break;
        }

        if (moved) {
            event.preventDefault();
            if (this.isValidPosition(this.player.position)) {
                this.moves++;
                this.updateStats();
                this.checkPatternCollection();
                this.checkExit();
            } else {
                this.player.position.copy(oldPosition);
                this.showMessage('Path blocked. The maze resists ordinary movement.', 'error');
            }
        }
    }

    handleStrategicMovement(event) {
        // Strategic movement requires pattern-based decisions
        if (event.key >= '1' && event.key <= '7') {
            event.preventDefault();
            const patternIndex = parseInt(event.key) - 1;
            if (patternIndex < this.patternsFound) {
                this.currentSequence.push(patternIndex + 1);
                this.updateStrategyInterface();
                
                if (this.currentSequence.length >= 3) {
                    this.checkStrategicSequence();
                }
            } else {
                this.showMessage('You haven\'t collected that pattern yet!', 'error');
            }
        }
    }

    isValidPosition(position) {
        const gridX = Math.round(position.x + 7.5);
        const gridZ = Math.round(position.z + 7.5);

        if (gridX < 0 || gridX >= 15 || gridZ < 0 || gridZ >= 15) {
            return false;
        }

        return this.mazeStructure[gridZ][gridX] === 0 || this.mazeStructure[gridZ][gridX] === 2;
    }

    checkPatternCollection() {
        const playerGridX = Math.round(this.player.position.x + 7.5);
        const playerGridZ = Math.round(this.player.position.z + 7.5);

        this.patternOrbs.forEach((orb, index) => {
            if (!orb.visible) return;
            
            const orbGridX = Math.round(orb.position.x + 7.5);
            const orbGridZ = Math.round(orb.position.z + 7.5);

            if (playerGridX === orbGridX && playerGridZ === orbGridZ) {
                // Collect pattern
                this.collectPattern(index);
            }
        });
    }

    collectPattern(index) {
        this.patternsFound++;
        this.patternOrbs[index].visible = false;
        
        this.showMessage(
            `🎉 Pattern ${index + 1} acquired!<br><br>` +
            `<strong>Hint:</strong> ${this.getPatternHint(index + 1)}`,
            'success'
        );

        this.updateStats();

        if (this.patternsFound === this.totalPatterns) {
            this.activateExit();
        }
    }

    getPatternHint(patternNumber) {
        const hints = [
            "Pattern 1: Observe the starting sequence. Remember the order of your first moves.",
            "Pattern 2: Look for mirror symmetry in your path choices. Left/right decisions matter.",
            "Pattern 3: Rotational patterns repeat every 4 moves. Think in cycles.",
            "Pattern 4: Fibonacci sequence appears in path lengths: 1,1,2,3,5,8...",
            "Pattern 5: Prime numbers unlock strategic positions. Count your moves carefully.",
            "Pattern 6: Binary decisions create the path forward. Each choice branches exponentially.",
            "Pattern 7: Combine all previous patterns in strategic order. The whole is greater than the sum."
        ];
        return hints[patternNumber - 1];
    }

    activateExit() {
        this.exit.material.opacity = 0.8;
        this.exit.material.emissiveIntensity = 0.8;
        
        this.showMessage(
            '🌟 All patterns collected! The exit is now visible.<br><br>' +
            '<strong>Warning:</strong> Ordinary movement will not reach it.<br>' +
            'Activate Strategy Mode and use the patterns you collected to create a path.',
            'warning'
        );
    }

    checkExit() {
        if (this.patternsFound < this.totalPatterns) return;

        const playerGridX = Math.round(this.player.position.x + 7.5);
        const playerGridZ = Math.round(this.player.position.z + 7.5);
        const exitGridX = Math.round(this.exit.position.x + 7.5);
        const exitGridZ = Math.round(this.exit.position.z + 7.5);

        if (playerGridX === exitGridX && playerGridZ === exitGridZ) {
            this.completeMaze();
        }
    }

    checkStrategicSequence() {
        if (this.isValidStrategicSequence()) {
            this.executeStrategicMove();
        } else if (this.currentSequence.length >= 7) {
            this.showMessage('Incorrect sequence. The maze resets your input. Analyze the patterns more carefully.', 'error');
            this.currentSequence = [];
            this.updateStrategyInterface();
        }
    }

    isValidStrategicSequence() {
        // Complex sequence validation that requires strategic thinking
        // This is a simplified version - real implementation would be more complex
        const requiredSequence = this.generateRequiredSequence();
        
        if (this.currentSequence.length !== requiredSequence.length) {
            return false;
        }

        for (let i = 0; i < this.currentSequence.length; i++) {
            if (this.currentSequence[i] !== requiredSequence[i]) {
                return false;
            }
        }

        return true;
    }

    generateRequiredSequence() {
        // Generate sequence based on collected patterns
        // In a real game, this would be much more complex and involve:
        // - Maze topology analysis
        // - Pattern relationships
        // - Strategic decision trees
        // - Player movement history
        
        // For demonstration, using a simple sequence based on collected patterns
        const baseSequence = [1, 2, 3, 4, 5, 6, 7];
        return baseSequence.slice(0, this.patternsFound).reverse();
    }

    executeStrategicMove() {
        this.showMessage(
            '🎯 Strategic path created!<br><br>' +
            'The patterns align and a clear path to the exit appears.<br>' +
            'Move to the exit using arrow keys.',
            'success'
        );

        // Make exit reachable
        this.createStrategicPath();
        this.currentSequence = [];
        this.updateStrategyInterface();
    }

    createStrategicPath() {
        // Create a visual path to the exit
        const pathPoints = this.calculatePathToExit();
        
        pathPoints.forEach(point => {
            const pathGeometry = new THREE.PlaneGeometry(0.8, 0.8);
            const pathMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ff88,
                emissive: 0x00ff88,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.6
            });

            const path = new THREE.Mesh(pathGeometry, pathMaterial);
            path.rotation.x = -Math.PI / 2;
            path.position.set(point.x - 7.5, -0.8, point.z - 7.5);
            this.maze.add(path);
        });

        // Update maze structure to make path walkable
        pathPoints.forEach(point => {
            if (this.mazeStructure[point.z] && this.mazeStructure[point.z][point.x] !== undefined) {
                this.mazeStructure[point.z][point.x] = 0;
            }
        });
    }

    calculatePathToExit() {
        // Simple path calculation for demonstration
        // Real implementation would use pathfinding algorithm
        const playerPos = {
            x: Math.round(this.player.position.x + 7.5),
            z: Math.round(this.player.position.z + 7.5)
        };
        
        const exitPos = {
            x: Math.round(this.exit.position.x + 7.5),
            z: Math.round(this.exit.position.z + 7.5)
        };

        const path = [];
        let current = { ...playerPos };

        while (current.x !== exitPos.x || current.z !== exitPos.z) {
            path.push({ ...current });
            
            if (current.x < exitPos.x) current.x++;
            else if (current.x > exitPos.x) current.x--;
            else if (current.z < exitPos.z) current.z++;
            else if (current.z > exitPos.z) current.z--;
        }

        path.push(exitPos);
        return path;
    }

    completeMaze() {
        this.stopTimer();
        
        const score = this.calculateScore();
        const reward = this.calculateReward(score);
        
        this.showMessage(
            `🌌 MASTER STRATEGIST! 🌌<br><br>` +
            `You have escaped the Eternal Maze!<br>` +
            `<strong>Level:</strong> ${this.level}<br>` +
            `<strong>Moves:</strong> ${this.moves}<br>` +
            `<strong>Time:</strong> ${this.formatTime(this.currentTime)}<br>` +
            `<strong>Score:</strong> ${score.toLocaleString()}<br><br>` +
            `<strong>Reward:</strong><br>` +
            `⭐ ${reward.stars} stars<br>` +
            `🎫 ${reward.tickets} tickets<br>` +
            `📈 ${reward.xp} XP`,
            'success'
        );

        // Award player
        if (window.gameEngine) {
            gameEngine.player.stars += reward.stars;
            gameEngine.player.tickets += reward.tickets;
            gameEngine.player.xp += reward.xp;
            gameEngine.updateUI();
            
            // Add activity
            if (window.authManager) {
                authManager.addActivity('🌌', `Escaped Eternal Maze Level ${this.level}`);
                authManager.addXP(reward.xp);
            }
        }

        // Prepare next level
        setTimeout(() => {
            this.level++;
            this.resetMaze();
        }, 3000);
    }

    calculateScore() {
        const timeScore = Math.max(0, 5000 - this.currentTime * 10);
        const moveScore = Math.max(0, 1000 - this.moves * 5);
        const patternScore = this.patternsFound * 500;
        const levelMultiplier = this.level * 2;
        
        return Math.floor((timeScore + moveScore + patternScore) * levelMultiplier);
    }

    calculateReward(score) {
        return {
            stars: Math.floor(score / 100),
            tickets: Math.floor(score / 500),
            xp: Math.floor(score / 10)
        };
    }

    showHint() {
        if (window.gameEngine && gameEngine.player.stars >= 5) {
            gameEngine.player.stars -= 5;
            gameEngine.updateUI();
            
            const randomPattern = Math.floor(Math.random() * this.patternsFound) + 1;
            this.showMessage(
                `💡 Strategic Hint:<br><br>` +
                `<strong>Pattern ${randomPattern}:</strong><br>` +
                this.getPatternHint(randomPattern),
                'info'
            );
        } else {
            this.showMessage('Not enough stars for a hint! You need 5⭐', 'error');
        }
    }

    activateStrategyMode() {
        if (this.patternsFound === 0) {
            this.showMessage('You need to collect at least one pattern to activate Strategy Mode.', 'error');
            return;
        }

        this.strategyMode = true;
        document.getElementById('strategyPanel').style.display = 'block';
        this.updateStrategyInterface();
        
        this.showMessage(
            '🎯 Strategy Mode Activated!<br><br>' +
            '<strong>How it works:</strong><br>' +
            '• Use number keys 1-7 to input pattern sequences<br>' +
            '• Each number corresponds to a pattern you found<br>' +
            '• Input the correct sequence to create a path to the exit<br><br>' +
            '<strong>Hint:</strong> The sequence is based on the strategic relationships between the patterns you collected.',
            'info'
        );
    }

    updateStrategyInterface() {
        const sequenceElement = document.getElementById('patternSequence');
        const patternsElement = document.getElementById('availablePatterns');
        
        sequenceElement.textContent = this.currentSequence.length > 0 
            ? this.currentSequence.join(' → ') 
            : 'None';
            
        const availablePatterns = Array.from({length: this.patternsFound}, (_, i) => i + 1);
        patternsElement.textContent = availablePatterns.length > 0 
            ? availablePatterns.join(', ') 
            : 'None collected';
    }

    showMessage(content, type = 'info') {
        const messageElement = document.getElementById('mazeMessage');
        const contentElement = document.getElementById('messageContent');
        const titleElement = document.getElementById('modalTitle');
        
        // Set title based on type
        const titles = {
            'info': 'Information',
            'warning': 'Warning',
            'error': 'Error',
            'success': 'Success'
        };
        
        titleElement.textContent = titles[type] || 'Message';
        contentElement.innerHTML = content;
        
        // Set color based on type
        const colors = {
            'info': '#0099ff',
            'warning': '#ffaa00',
            'error': '#ff4444',
            'success': '#00ff88'
        };
        
        contentElement.style.color = colors[type] || '#ffffff';
        messageElement.style.display = 'flex';
    }

    hideMessage() {
        document.getElementById('mazeMessage').style.display = 'none';
    }

    handleResize() {
        if (!this.isInitialized) return;
        
        const canvas = document.getElementById('mazeCanvas');
        const container = canvas.parentElement;
        
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            // Update renderer size
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            
            // Update camera aspect ratio
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            this.currentTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateStats();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateStats() {
        document.getElementById('mazeLevel').textContent = this.level;
        document.getElementById('mazeMoves').textContent = this.moves;
        document.getElementById('mazeTime').textContent = this.formatTime(this.currentTime);
        document.getElementById('patternsFound').textContent = `${this.patternsFound}/${this.totalPatterns}`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    resetMaze() {
        this.stopTimer();
        this.moves = 0;
        this.patternsFound = 0;
        this.currentSequence = [];
        this.strategyMode = false;
        this.currentTime = 0;
        
        document.getElementById('strategyPanel').style.display = 'none';
        this.createMaze();
        this.startTimer();
        this.updateStats();
        
        this.showMessage(
            `Level ${this.level} initiated.<br><br>` +
            'The maze has reconfigured itself.<br>' +
            'Find the new pattern locations and escape!',
            'info'
        );
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    animate() {
        if (!this.isInitialized) return;

        // Animate lights
        this.lights.forEach(lightObj => {
            lightObj.angle += lightObj.speed * 0.01;
            lightObj.light.position.x = Math.cos(lightObj.angle) * lightObj.radius;
            lightObj.light.position.z = Math.sin(lightObj.angle) * lightObj.radius;
            lightObj.light.position.y = lightObj.height + Math.sin(lightObj.angle * 2) * 2;
        });

        // Animate particle system
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.001;
            this.particleSystem.rotation.x += 0.0005;
        }

        // Animate exit if active
        if (this.exit && this.patternsFound === this.totalPatterns) {
            this.exit.rotation.z += 0.02;
            this.exit.material.opacity = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
        }

        // Render
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        this.stopTimer();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.isInitialized = false;
    }
}

// Initialize maze engine
const mazeEngine = new EternalMazeEngine();

// Make sure to clean up when window closes
window.addEventListener('beforeunload', () => {
    mazeEngine.destroy();
});