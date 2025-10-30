// Venture Game Engine - CEO Maze Competition System
class VentureGameEngine {
    constructor() {
        this.activeVentures = [];
        this.currentMazeSessions = new Map();
        this.threeJSScenes = new Map();
        this.ventureWindows = new Map();
        this.apiBase = '/api/game'; // Separate API namespace
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('🎮 Initializing Venture Game Engine...');
        
        try {
            await this.loadActiveVentures();
            this.setupEventListeners();
            this.startVentureStatusPolling();
            
            this.isInitialized = true;
            console.log('✅ Venture Game Engine Ready!');
        } catch (error) {
            console.error('❌ Failed to initialize venture game engine:', error);
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken(),
            },
            credentials: 'include',
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Venture API request failed:', error);
            throw error;
        }
    }

    getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    async loadActiveVentures() {
        try {
            const data = await this.makeRequest('/ventures/active/');
            this.activeVentures = data.ventures || [];
            console.log('📊 Loaded active ventures:', this.activeVentures.length);
        } catch (error) {
            console.error('Error loading active ventures:', error);
            this.createDemoVentureGames();
        }
    }

    createDemoVentureGames() {
        console.log('🎮 Creating demo venture games');
        this.activeVentures = [
            {
                id: 101,
                name: 'Quantum CEO Challenge',
                venture_type: 'Technology',
                icon: '🌌',
                description: 'First player to escape the quantum maze becomes CEO with 20% equity',
                status: 'active',
                entry_ticket_cost: 2,
                current_participants: 8,
                max_participants: 20,
                maze_complexity: 7,
                ceo_equity: 20,
                participant_equity: 80,
                time_limit: 3600,
                required_patterns: 5,
                hcs_topic_id: '0.0.1234567',
                is_joinable: true,
                hasJoined: false
            },
            {
                id: 102,
                name: 'Neuro Finance Maze',
                venture_type: 'Finance',
                icon: '🧠',
                description: 'Navigate the neural network maze to claim CEO position',
                status: 'running',
                entry_ticket_cost: 3,
                current_participants: 15,
                max_participants: 25,
                maze_complexity: 8,
                ceo_equity: 25,
                participant_equity: 75,
                time_limit: 2700,
                required_patterns: 6,
                hcs_topic_id: '0.0.1234568',
                is_joinable: false,
                hasJoined: true
            },
            {
                id: 103,
                name: 'Space Logistics Race',
                venture_type: 'Transport',
                icon: '🚀',
                description: 'Race through orbital maze to become Space CEO',
                status: 'upcoming',
                entry_ticket_cost: 1,
                current_participants: 3,
                max_participants: 15,
                maze_complexity: 5,
                ceo_equity: 15,
                participant_equity: 85,
                time_limit: 4800,
                required_patterns: 4,
                hcs_topic_id: '0.0.1234569',
                is_joinable: true,
                hasJoined: false
            }
        ];
    }

    openVentureGameWindow() {
        const windowId = 'ventureGameWindow';
        
        // Close if already open
        if (this.ventureWindows.has(windowId)) {
            closeWindow(windowId);
            this.ventureWindows.delete(windowId);
            return;
        }

        // Create window HTML
        const windowHTML = `
            <div class="window venture-game-window" id="${windowId}" style="top: 50px; left: calc(50% - 450px);">
                <div class="window-header">
                    <div class="window-title">🎮 CEO Venture Games</div>
                    <div class="window-controls">
                        <div class="window-control minimize" onclick="minimizeWindow('${windowId}')"></div>
                        <div class="window-control maximize" onclick="toggleMaximize('${windowId}')"></div>
                        <div class="window-control close" onclick="ventureGameEngine.closeVentureGameWindow()"></div>
                    </div>
                </div>
                <div class="window-content">
                    <div class="venture-game-dashboard">
                        <div class="game-header">
                            <h2>🏆 CEO Competition Arena</h2>
                            <p>Compete in real-time mazes to become Venture CEO. First to escape wins!</p>
                            <button class="refresh-btn" onclick="ventureGameEngine.refreshVentures()">
                                🔄 Refresh Games
                            </button>
                        </div>
                        
                        <div class="venture-games-grid" id="ventureGamesGrid">
                            <!-- Venture games will be loaded here -->
                        </div>
                        
                        <div class="game-stats">
                            <div class="stat-card">
                                <div class="stat-icon">⚡</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="activeGamesCount">0</div>
                                    <div class="stat-label">Active Games</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">👑</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="ceoOpportunities">0</div>
                                    <div class="stat-label">CEO Spots</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🎯</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="yourEntries">0</div>
                                    <div class="stat-label">Your Entries</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.insertAdjacentHTML('beforeend', windowHTML);
        
        // Make draggable
        makeDraggable(windowId);
        
        // Store reference
        this.ventureWindows.set(windowId, {
            id: windowId,
            type: 'dashboard'
        });
        
        // Load venture games
        this.loadVentureGamesUI();
        
        // Open the window
        openWindow(windowId);
    }

    closeVentureGameWindow() {
        const windowId = 'ventureGameWindow';
        closeWindow(windowId);
        this.ventureWindows.delete(windowId);
    }

    loadVentureGamesUI() {
        const grid = document.getElementById('ventureGamesGrid');
        if (!grid) return;

        if (this.activeVentures.length === 0) {
            grid.innerHTML = `
                <div class="no-games-message">
                    <div class="no-games-icon">🎮</div>
                    <h3>No Venture Games Available</h3>
                    <p>New CEO competition games will appear here soon!</p>
                    <button class="join-btn" onclick="ventureGameEngine.refreshVentures()">
                        Check for New Games
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.activeVentures.map(venture => {
            const hasJoined = venture.hasJoined || false;
            const canJoin = venture.is_joinable && !hasJoined;
            const isRunning = venture.status === 'running';
            const isUpcoming = venture.status === 'upcoming';
            
            return `
                <div class="venture-game-card" data-venture-id="${venture.id}">
                    <div class="game-card-header">
                        <div class="game-icon">${venture.icon}</div>
                        <div class="game-status ${venture.status}">${venture.status.toUpperCase()}</div>
                    </div>
                    
                    <div class="game-card-body">
                        <h3 class="game-title">${venture.name}</h3>
                        <p class="game-description">${venture.description}</p>
                        
                        <div class="game-stats">
                            <div class="game-stat">
                                <span class="stat-label">CEO Equity:</span>
                                <span class="stat-value">${venture.ceo_equity}%</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Participants:</span>
                                <span class="stat-value">${venture.current_participants}/${venture.max_participants}</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Complexity:</span>
                                <span class="stat-value">${'★'.repeat(venture.maze_complexity)}</span>
                            </div>
                            <div class="game-stat">
                                <span class="stat-label">Time Limit:</span>
                                <span class="stat-value">${Math.floor(venture.time_limit / 60)}min</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="game-card-actions">
                        ${isRunning && hasJoined ? `
                            <button class="game-btn primary" onclick="ventureGameEngine.enterMaze(${venture.id})">
                                🎮 Enter Maze
                            </button>
                            <button class="game-btn secondary" onclick="ventureGameEngine.viewLeaderboard(${venture.id})">
                                📊 Leaderboard
                            </button>
                        ` : isRunning ? `
                            <button class="game-btn disabled" disabled>
                                🚫 Game Running
                            </button>
                        ` : canJoin ? `
                            <button class="game-btn primary" onclick="ventureGameEngine.joinVentureGame(${venture.id})">
                                Join Game - ${venture.entry_ticket_cost} 🎫
                            </button>
                        ` : hasJoined ? `
                            <div class="joined-badge">
                                ✅ Joined - Waiting for Start
                            </div>
                        ` : `
                            <button class="game-btn disabled" disabled>
                                ${isUpcoming ? '🕐 Starting Soon' : '🚫 Not Joinable'}
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        this.updateGameStats();
    }

    updateGameStats() {
        const activeGames = this.activeVentures.filter(v => v.status === 'running').length;
        const ceoOpportunities = this.activeVentures.filter(v => v.status === 'active' || v.status === 'running').length;
        const yourEntries = this.activeVentures.filter(v => v.hasJoined).length;

        const activeCount = document.getElementById('activeGamesCount');
        const ceoCount = document.getElementById('ceoOpportunities');
        const entriesCount = document.getElementById('yourEntries');

        if (activeCount) activeCount.textContent = activeGames;
        if (ceoCount) ceoCount.textContent = ceoOpportunities;
        if (entriesCount) entriesCount.textContent = yourEntries;
    }

    async joinVentureGame(ventureId) {
        const venture = this.activeVentures.find(v => v.id === ventureId);
        if (!venture) {
            this.showNotification('Venture game not found', 'error');
            return;
        }

        // Check tickets using main game engine
        if (window.gameEngine && gameEngine.player.tickets < venture.entry_ticket_cost) {
            this.showNotification(`Not enough tickets! Need ${venture.entry_ticket_cost}`, 'error');
            openWindow('shopWindow');
            return;
        }

        try {
            const response = await this.makeRequest(`/ventures/${ventureId}/join/`, {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification(`🎉 Joined ${venture.name}!`, 'success');
                
                // Update local state
                venture.hasJoined = true;
                venture.current_participants++;
                venture.status = response.venture_status || venture.status;
                
                // Refresh main game engine if available
                if (window.gameEngine) {
                    gameEngine.player.tickets -= venture.entry_ticket_cost;
                    gameEngine.updateUI();
                }
                
                // Reload the games to show updated status
                await this.loadActiveVentures();
                this.loadVentureGamesUI();
                
                // If venture started, show notification
                if (venture.status === 'running') {
                    setTimeout(() => {
                        this.showNotification(`🚀 ${venture.name} has started! Enter the maze now!`, 'success');
                    }, 1000);
                }
            } else {
                this.showNotification(response.error || 'Failed to join game', 'error');
            }
        } catch (error) {
            console.error('Error joining venture game:', error);
            this.simulateJoinVentureGame(venture);
        }
    }

    simulateJoinVentureGame(venture) {
        console.log('🎮 Simulating venture game join (offline mode)');
        
        venture.hasJoined = true;
        venture.current_participants++;
        venture.status = 'running'; // Auto-start for demo
        
        if (window.gameEngine) {
            gameEngine.player.tickets -= venture.entry_ticket_cost;
            gameEngine.updateUI();
        }
        
        this.loadVentureGamesUI();
        this.showNotification(`🎉 Joined ${venture.name}! Game starting now!`, 'success');
        
        // Auto-enter maze after join in demo mode
        setTimeout(() => {
            this.simulateMazeEntry(venture);
        }, 2000);
    }

    // In the VentureGameEngine class, update these methods:

async enterMaze(ventureId) {
    const venture = this.activeVentures.find(v => v.id === ventureId);
    if (!venture) {
        this.showNotification('Venture not found', 'error');
        return;
    }

    if (venture.status !== 'running') {
        this.showNotification('This venture is not currently running', 'error');
        return;
    }

    try {
        console.log(`🎮 Entering maze for venture ${ventureId}...`);
        const response = await this.makeRequest(`/ventures/${ventureId}/maze/`);
        
        if (response.success) {
            console.log('✅ Maze session created:', response.maze);
            this.openMazeWindow(venture, response.maze);
        } else {
            console.error('❌ Failed to create maze session:', response.error);
            this.showNotification(response.error || 'Failed to enter maze', 'error');
        }
    } catch (error) {
        console.error('Error entering maze:', error);
        // Fallback to demo mode
        this.showNotification('Using demo mode - maze session simulated', 'info');
        this.simulateMazeEntry(venture);
    }
}

openMazeWindow(venture, mazeData) {
    const windowId = `mazeWindow_${venture.id}`;
    
    // Close if already open
    if (this.ventureWindows.has(windowId)) {
        closeWindow(windowId);
        this.ventureWindows.delete(windowId);
    }

    console.log(`🪟 Opening maze window for venture ${venture.id} with session:`, mazeData);

    const windowHTML = `
        <div class="window maze-game-window" id="${windowId}" style="top: 50px; left: calc(50% - 600px);">
            <div class="window-header">
                <div class="window-title">🌌 ${venture.name} - CEO Maze Challenge</div>
                <div class="window-controls">
                    <div class="window-control minimize" onclick="minimizeWindow('${windowId}')"></div>
                    <div class="window-control maximize" onclick="toggleMaximize('${windowId}')"></div>
                    <div class="window-control close" onclick="ventureGameEngine.closeMazeWindow('${venture.id}')"></div>
                </div>
            </div>
            <div class="window-content">
                <div class="maze-game-container">
                    <div class="maze-info-panel">
                        <div class="maze-stats">
                            <div class="maze-stat">
                                <label>Time Remaining:</label>
                                <span id="${windowId}_time">${mazeData.timeRemaining}s</span>
                            </div>
                            <div class="maze-stat">
                                <label>Moves Made:</label>
                                <span id="${windowId}_moves">${mazeData.movesMade}</span>
                            </div>
                            <div class="maze-stat">
                                <label>Patterns Found:</label>
                                <span id="${windowId}_patterns">${mazeData.patternsFound}/${mazeData.patternsRequired}</span>
                            </div>
                            <div class="maze-stat">
                                <label>CEO Prize:</label>
                                <span class="ceo-prize">${venture.ceo_equity}% Equity</span>
                            </div>
                            <div class="maze-stat">
                                <label>Session ID:</label>
                                <span style="font-size: 0.7rem; color: var(--parrot-text-secondary);">${mazeData.sessionId.substring(0, 8)}...</span>
                            </div>
                        </div>
                        
                        <div class="maze-controls">
                            <div class="control-row">
                                <button class="maze-btn" onclick="ventureGameEngine.mazeMove('${venture.id}', 'up')" title="Move Up (W/↑)">↑</button>
                            </div>
                            <div class="control-row">
                                <button class="maze-btn" onclick="ventureGameEngine.mazeMove('${venture.id}', 'left')" title="Move Left (A/←)">←</button>
                                <button class="maze-btn" onclick="ventureGameEngine.mazeMove('${venture.id}', 'right')" title="Move Right (D/→)">→</button>
                            </div>
                            <div class="control-row">
                                <button class="maze-btn" onclick="ventureGameEngine.mazeMove('${venture.id}', 'down')" title="Move Down (S/↓)">↓</button>
                            </div>
                        </div>
                        
                        <div class="maze-hints">
                            <button class="hint-btn" onclick="ventureGameEngine.useHint('${venture.id}')">
                                💡 Use Hint (3 remaining)
                            </button>
                            <div style="margin-top: 10px; font-size: 0.8rem; color: var(--parrot-text-secondary);">
                                Use WASD or Arrow Keys to move
                            </div>
                        </div>
                    </div>
                    
                    <div class="maze-visualization">
                        <div class="threejs-maze-container" id="${windowId}_threejs">
                            <div class="maze-loading">
                                <div class="loading-spinner"></div>
                                <div>Loading 3D Maze...</div>
                            </div>
                        </div>
                        <div class="maze-minimap" id="${windowId}_minimap">
                            <div style="padding: 15px; text-align: center; color: var(--parrot-text-secondary); background: rgba(255,255,255,0.05); border-radius: 8px;">
                                <div style="font-size: 1.2rem; margin-bottom: 5px;">🗺️</div>
                                <div>Mini-map</div>
                                <div style="font-size: 0.7rem; margin-top: 5px; opacity: 0.7;">Coming Soon</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="leaderboard-panel">
                        <h4>🏆 Live Leaderboard</h4>
                        <div class="leaderboard-list" id="${windowId}_leaderboard">
                            <div class="leaderboard-entry">
                                <span class="rank">1</span>
                                <span class="player">You</span>
                                <span class="progress">Starting position</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', windowHTML);
    
    // Make draggable
    makeDraggable(windowId);
    
    // Store session data with proper tracking
    const sessionData = {
        ...mazeData,
        venture: venture,
        windowId: windowId
    };
    
    this.currentMazeSessions.set(venture.id, sessionData);
    this.ventureWindows.set(windowId, {
        id: windowId,
        type: 'maze',
        venture: venture,
        sessionId: mazeData.sessionId
    });
    
    console.log(`✅ Maze session stored for venture ${venture.id}:`, sessionData);
    
    // Initialize Three.js with a small delay to ensure DOM is ready
    setTimeout(() => {
        this.initMazeThreeJS(windowId, venture.id);
    }, 500);
    
    // Open the window
    openWindow(windowId);
    
    // Start timer
    this.startMazeTimer(venture.id, mazeData.timeRemaining);
    
    this.showNotification(`🌌 Entered ${venture.name} maze! Good luck!`, 'success');
}

async mazeMove(ventureId, direction) {
    console.log(`🎮 Making move ${direction} for venture ${ventureId}`);
    
    const mazeSession = this.currentMazeSessions.get(ventureId);
    if (!mazeSession) {
        console.error('❌ Maze session not found for venture:', ventureId);
        console.log('Current sessions:', Array.from(this.currentMazeSessions.keys()));
        this.showNotification('Maze session not found. Please re-enter the maze.', 'error');
        return;
    }

    try {
        console.log(`📡 Sending move request for session: ${mazeSession.sessionId}`);
        const response = await this.makeRequest(`/maze/${mazeSession.sessionId}/move/`, {
            method: 'POST',
            body: JSON.stringify({ direction })
        });

        if (response.success) {
            console.log('✅ Move successful:', response);
            // Update maze session with new data
            Object.assign(mazeSession, response);
            
            // Update UI
            this.updateMazeUI(ventureId, response);
            
            // Update Three.js visualization
            this.updateMazeThreeJS(ventureId, response.newPosition);
            
            if (response.completed) {
                this.showNotification('🎉 Maze Completed! Checking CEO status...', 'success');
                setTimeout(() => {
                    this.loadActiveVentures();
                    this.closeMazeWindow(ventureId);
                }, 3000);
            }
        } else {
            console.error('❌ Move failed:', response.error);
            this.showNotification(response.error || 'Move failed', 'error');
        }
    } catch (error) {
        console.error('Move API call failed:', error);
        // Fallback to simulation
        this.showNotification('Using simulated move (offline mode)', 'info');
        this.simulateMazeMove(ventureId, direction);
    }
}

// Enhanced simulation mode with better session handling
simulateMazeEntry(venture) {
    console.log('🎮 Creating simulated maze session for venture:', venture.id);
    
    const mazeData = {
        sessionId: 'demo-session-' + Date.now(),
        ventureId: venture.id,
        timeRemaining: venture.time_limit,
        movesMade: 0,
        patternsFound: 0,
        patternsRequired: venture.required_patterns,
        currentPosition: { x: 0, y: 0 },
        completed: false,
        complexity: venture.maze_complexity,
        timeLimit: venture.time_limit,
        mazeLayout: { size: 10, start: {x:0,y:0}, end: {x:9,y:9} },
        discoveredPatterns: [],
        status: 'active'
    };
    
    this.openMazeWindow(venture, mazeData);
}

simulateMazeMove(ventureId, direction) {
    console.log(`🎮 Simulating move ${direction} for venture ${ventureId}`);
    
    const mazeSession = this.currentMazeSessions.get(ventureId);
    if (!mazeSession) {
        console.error('❌ No maze session found for simulation');
        return;
    }

    // Simulate move
    mazeSession.movesMade++;
    mazeSession.patternsFound = Math.min(
        mazeSession.patternsRequired, 
        mazeSession.patternsFound + (Math.random() > 0.7 ? 1 : 0)
    );
    mazeSession.timeRemaining = Math.max(0, mazeSession.timeRemaining - 1);
    
    // Simulate position change
    const currentX = mazeSession.currentPosition?.x || 0;
    const currentY = mazeSession.currentPosition?.y || 0;
    
    let newX = currentX;
    let newY = currentY;
    
    switch(direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
    }
    
    // Keep within bounds (0-9 grid)
    newX = Math.max(0, Math.min(9, newX));
    newY = Math.max(0, Math.min(9, newY));
    
    mazeSession.currentPosition = { x: newX, y: newY };
    
    console.log(`📍 New position: (${newX}, ${newY})`);
    
    // Check for completion (reach end position 9,9 with enough patterns)
    const patternsRequired = Math.floor(mazeSession.patternsRequired * 0.7); // 70% for demo
    if ((newX === 9 && newY === 9 && mazeSession.patternsFound >= patternsRequired) || Math.random() > 0.97) {
        mazeSession.completed = true;
        this.showNotification('🎉 Maze Completed! You are now CEO candidate!', 'success');
        
        // Update venture status in local state
        const venture = this.activeVentures.find(v => v.id === ventureId);
        if (venture) {
            venture.status = 'completed';
        }
    }
    
    this.updateMazeUI(ventureId, mazeSession);
    this.updateMazeThreeJS(ventureId, mazeSession.currentPosition);
}

    closeMazeWindow(ventureId) {
        const windowId = `mazeWindow_${ventureId}`;
        
        // Clean up Three.js
        const sceneData = this.threeJSScenes.get(windowId);
        if (sceneData) {
            try {
                sceneData.renderer.dispose();
                if (sceneData.renderer.domElement && sceneData.renderer.domElement.parentNode) {
                    sceneData.renderer.domElement.parentNode.removeChild(sceneData.renderer.domElement);
                }
            } catch (error) {
                console.error('Error cleaning up Three.js:', error);
            }
            this.threeJSScenes.delete(windowId);
        }
        
        // Remove window
        closeWindow(windowId);
        this.currentMazeSessions.delete(ventureId);
        this.ventureWindows.delete(windowId);
        
        this.showNotification('Maze session closed', 'info');
    }

    initMazeThreeJS(windowId, ventureId) {
        const container = document.getElementById(`${windowId}_threejs`);
        if (!container) {
            console.error('Three.js container not found:', `${windowId}_threejs`);
            return;
        }

        try {
            // Clear loading state
            container.innerHTML = '';
            
            // Check if Three.js is available
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js library not loaded');
            }

            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0a1a);
            
            // Create camera
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 8, 12);
            camera.lookAt(0, 0, 0);
            
            // Create renderer
            const renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false
            });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setClearColor(0x0a0a1a, 1);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            container.appendChild(renderer.domElement);
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 20, 5);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            scene.add(directionalLight);
            
            // Create maze floor
            const floorGeometry = new THREE.PlaneGeometry(20, 20);
            const floorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x1a1a2e,
                roughness: 0.8,
                metalness: 0.2
            });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);
            
            // Create maze walls
            this.createMazeWalls(scene);
            
            // Create player character
            const playerGeometry = new THREE.ConeGeometry(0.3, 1, 4);
            const playerMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00ff88,
                emissive: 0x004400,
                metalness: 0.3,
                roughness: 0.4
            });
            const player = new THREE.Mesh(playerGeometry, playerMaterial);
            player.position.y = 0.5;
            player.castShadow = true;
            scene.add(player);
            
            // Create goal
            const goalGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 8);
            const goalMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffaa00,
                emissive: 0x442200,
                metalness: 0.5,
                roughness: 0.3
            });
            const goal = new THREE.Mesh(goalGeometry, goalMaterial);
            goal.position.set(8, 0.1, 8);
            goal.castShadow = true;
            scene.add(goal);
            
            // Add some decorative elements
            this.addMazeDecorations(scene);
            
            // Store scene data
            this.threeJSScenes.set(windowId, { 
                scene, 
                camera, 
                renderer, 
                player,
                goal
            });
            
            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                
                // Simple animations
                if (player) player.rotation.y += 0.02;
                if (goal) goal.rotation.y += 0.01;
                
                renderer.render(scene, camera);
            };
            animate();
            
            // Handle window resize
            const handleResize = () => {
                const sceneData = this.threeJSScenes.get(windowId);
                if (sceneData && container) {
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    
                    sceneData.camera.aspect = width / height;
                    sceneData.camera.updateProjectionMatrix();
                    sceneData.renderer.setSize(width, height);
                }
            };
            
            // Add resize observer
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container);
            
            // Store observer for cleanup
            this.threeJSScenes.get(windowId).resizeObserver = resizeObserver;
            
        } catch (error) {
            console.error('Error initializing Three.js:', error);
            container.innerHTML = `
                <div class="maze-loading" style="color: #ff4444;">
                    <div>❌ Failed to load 3D Maze</div>
                    <div style="font-size: 0.8rem; margin-top: 10px;">${error.message}</div>
                    <div style="font-size: 0.7rem; margin-top: 5px; opacity: 0.7;">
                        Make sure Three.js is loaded in your HTML
                    </div>
                </div>
            `;
        }
    }

    createMazeWalls(scene) {
        const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a4a,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Create sample maze walls
        const wallPositions = [
            { x: 2, z: 0 }, { x: 4, z: 1 }, { x: 1, z: 3 },
            { x: 5, z: 2 }, { x: 3, z: 4 }, { x: 6, z: 3 },
            { x: 2, z: 5 }, { x: 4, z: 6 }, { x: 7, z: 4 },
            { x: 0, z: 2 }, { x: 1, z: 6 }, { x: 8, z: 1 },
            { x: 9, z: 3 }, { x: 3, z: 7 }, { x: 6, z: 6 }
        ];
        
        wallPositions.forEach(pos => {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(pos.x, 1, pos.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            scene.add(wall);
        });
    }

    addMazeDecorations(scene) {
        // Add some floating particles
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 20;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        
        // Store particles for animation
        this.particles = particles;
        this.particlePositions = positions;
    }

    async mazeMove(ventureId, direction) {
        const mazeSession = this.currentMazeSessions.get(ventureId);
        if (!mazeSession) {
            this.showNotification('Maze session not found', 'error');
            return;
        }

        try {
            const response = await this.makeRequest(`/maze/${mazeSession.sessionId}/move/`, {
                method: 'POST',
                body: JSON.stringify({ direction })
            });

            if (response.success) {
                // Update maze session
                Object.assign(mazeSession, response);
                
                // Update UI
                this.updateMazeUI(ventureId, response);
                
                // Update Three.js visualization
                this.updateMazeThreeJS(ventureId, response.newPosition);
                
                if (response.completed) {
                    this.showNotification('🎉 Maze Completed! Checking CEO status...', 'success');
                    setTimeout(() => {
                        this.loadActiveVentures();
                        this.closeMazeWindow(ventureId);
                    }, 3000);
                }
            } else {
                this.showNotification(response.error || 'Move failed', 'error');
            }
        } catch (error) {
            console.error('Move failed:', error);
            this.simulateMazeMove(ventureId, direction);
        }
    }

    simulateMazeMove(ventureId, direction) {
        const mazeSession = this.currentMazeSessions.get(ventureId);
        if (!mazeSession) return;

        // Simulate move
        mazeSession.movesMade++;
        mazeSession.patternsFound = Math.min(
            mazeSession.patternsRequired, 
            mazeSession.patternsFound + (Math.random() > 0.7 ? 1 : 0)
        );
        mazeSession.timeRemaining = Math.max(0, mazeSession.timeRemaining - 1);
        
        // Simulate position change
        const currentX = mazeSession.currentPosition?.x || 0;
        const currentY = mazeSession.currentPosition?.y || 0;
        
        let newX = currentX;
        let newY = currentY;
        
        switch(direction) {
            case 'up': newY--; break;
            case 'down': newY++; break;
            case 'left': newX--; break;
            case 'right': newX++; break;
        }
        
        // Keep within bounds
        newX = Math.max(0, Math.min(9, newX));
        newY = Math.max(0, Math.min(9, newY));
        
        mazeSession.currentPosition = { x: newX, y: newY };
        
        // Random completion for demo
        if (Math.random() > 0.95 || (newX === 9 && newY === 9)) {
            mazeSession.completed = true;
            this.showNotification('🎉 Maze Completed! You might be CEO!', 'success');
        }
        
        this.updateMazeUI(ventureId, mazeSession);
        this.updateMazeThreeJS(ventureId, mazeSession.currentPosition);
    }

    updateMazeUI(ventureId, data) {
        const windowId = `mazeWindow_${ventureId}`;
        
        const timeElement = document.getElementById(`${windowId}_time`);
        const movesElement = document.getElementById(`${windowId}_moves`);
        const patternsElement = document.getElementById(`${windowId}_patterns`);
        
        if (timeElement) timeElement.textContent = `${data.timeRemaining}s`;
        if (movesElement) movesElement.textContent = data.movesMade;
        if (patternsElement) patternsElement.textContent = `${data.patternsFound}/${data.patternsRequired}`;
    }

    updateMazeThreeJS(ventureId, position) {
        const windowId = `mazeWindow_${ventureId}`;
        const sceneData = this.threeJSScenes.get(windowId);
        
        if (sceneData && sceneData.player) {
            // Convert 2D grid position to 3D world position
            const worldX = (position.x - 4.5) * 2;
            const worldZ = (position.y - 4.5) * 2;
            
            sceneData.player.position.x = worldX;
            sceneData.player.position.z = worldZ;
        }
    }

    startMazeTimer(ventureId, initialTime) {
        const timer = setInterval(() => {
            const mazeSession = this.currentMazeSessions.get(ventureId);
            if (!mazeSession || mazeSession.completed) {
                clearInterval(timer);
                return;
            }
            
            mazeSession.timeRemaining--;
            this.updateMazeUI(ventureId, mazeSession);
            
            if (mazeSession.timeRemaining <= 0) {
                clearInterval(timer);
                this.showNotification('⏰ Time\'s up! Maze failed.', 'error');
                this.closeMazeWindow(ventureId);
            }
        }, 1000);
        
        // Store timer for cleanup
        this.currentMazeSessions.get(ventureId).timer = timer;
    }

    useHint(ventureId) {
        this.showNotification('💡 Hint: Look for the golden path patterns!', 'info');
    }

    async viewLeaderboard(ventureId) {
        try {
            const response = await this.makeRequest(`/ventures/${ventureId}/leaderboard/`);
            this.showLeaderboardModal(ventureId, response.leaderboard);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showDemoLeaderboard(ventureId);
        }
    }

    showLeaderboardModal(ventureId, leaderboard) {
        const venture = this.activeVentures.find(v => v.id === ventureId);
        const modalHTML = `
            <div class="modal" id="gameLeaderboardModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🏆 ${venture?.name} - Leaderboard</h3>
                        <span class="modal-close" onclick="this.closest('.modal').remove()">×</span>
                    </div>
                    <div class="modal-body">
                        <div class="game-leaderboard">
                            ${leaderboard && leaderboard.length > 0 ? leaderboard.map((entry, index) => `
                                <div class="leaderboard-entry ${entry.isCEO ? 'ceo-entry' : ''}">
                                    <span class="rank">${index + 1}</span>
                                    <span class="player">${entry.player}</span>
                                    <span class="time">${entry.completionTime || 'In Progress'}</span>
                                    ${entry.isCEO ? '<span class="ceo-badge">👑 CEO</span>' : ''}
                                </div>
                            `).join('') : `
                                <div class="no-entries">No completions yet. Be the first CEO!</div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    showDemoLeaderboard(ventureId) {
        const venture = this.activeVentures.find(v => v.id === ventureId);
        const modalHTML = `
            <div class="modal" id="gameLeaderboardModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🏆 ${venture?.name} - Leaderboard</h3>
                        <span class="modal-close" onclick="this.closest('.modal').remove()">×</span>
                    </div>
                    <div class="modal-body">
                        <div class="game-leaderboard">
                            <div class="leaderboard-entry">
                                <span class="rank">1</span>
                                <span class="player">Quantum_Pioneer</span>
                                <span class="time">245s</span>
                                <span class="ceo-badge">👑 CEO</span>
                            </div>
                            <div class="leaderboard-entry">
                                <span class="rank">2</span>
                                <span class="player">Star_Navigator</span>
                                <span class="time">312s</span>
                            </div>
                            <div class="leaderboard-entry">
                                <span class="rank">3</span>
                                <span class="player">Cyber_Explorer</span>
                                <span class="time">In Progress</span>
                            </div>
                            <div class="leaderboard-entry">
                                <span class="rank">4</span>
                                <span class="player">You</span>
                                <span class="time">In Progress</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    simulateMazeEntry(venture) {
        const mazeData = {
            sessionId: 'demo-' + Date.now(),
            timeRemaining: venture.time_limit,
            movesMade: 0,
            patternsFound: 0,
            patternsRequired: venture.required_patterns,
            currentPosition: { x: 0, y: 0 },
            completed: false
        };
        
        this.openMazeWindow(venture, mazeData);
    }

    cleanupThreeJSScenes() {
        this.threeJSScenes.forEach((sceneData, windowId) => {
            try {
                if (sceneData.renderer) {
                    sceneData.renderer.dispose();
                    if (sceneData.renderer.domElement && sceneData.renderer.domElement.parentNode) {
                        sceneData.renderer.domElement.parentNode.removeChild(sceneData.renderer.domElement);
                    }
                }
                if (sceneData.resizeObserver) {
                    sceneData.resizeObserver.disconnect();
                }
            } catch (error) {
                console.error('Error cleaning up Three.js scene:', error);
            }
        });
        this.threeJSScenes.clear();
    }

    async refreshVentures() {
        try {
            await this.loadActiveVentures();
            this.loadVentureGamesUI();
            this.showNotification('Venture games refreshed!', 'success');
        } catch (error) {
            console.error('Error refreshing ventures:', error);
            this.showNotification('Failed to refresh games', 'error');
        }
    }

    startVentureStatusPolling() {
        // Refresh venture status every 15 seconds
        setInterval(async () => {
            if (this.ventureWindows.size > 0) { // Only poll if windows are open
                await this.loadActiveVentures();
                this.loadVentureGamesUI();
            }
        }, 15000);
    }

    setupEventListeners() {
        // Keyboard controls for maze
        document.addEventListener('keydown', (e) => {
            const activeMazeWindow = Array.from(this.ventureWindows.values())
                .find(w => w.type === 'maze');
            
            if (!activeMazeWindow) return;
            
            const keyMap = {
                'ArrowUp': 'up',
                'ArrowDown': 'down', 
                'ArrowLeft': 'left',
                'ArrowRight': 'right',
                'w': 'up',
                's': 'down',
                'a': 'left',
                'd': 'right'
            };
            
            if (keyMap[e.key]) {
                e.preventDefault();
                this.mazeMove(activeMazeWindow.venture.id, keyMap[e.key]);
            }
        });

        // Handle page unload cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanupThreeJSScenes();
        });
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback notification
            const notification = document.createElement('div');
            notification.textContent = `[Venture Game] ${message}`;
            notification.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#0099ff'};
                color: ${type === 'success' ? '#000' : '#fff'};
                padding: 15px 25px;
                border-radius: 10px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.ventureGameEngine = new VentureGameEngine();
});