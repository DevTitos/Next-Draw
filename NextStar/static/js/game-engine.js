// Main Game Engine - Django Backend Integration
class GameEngine {
    constructor() {
        this.player = {
            tickets: 0,
            ventures: [],
            equity: 0,
            badges: [],
            activities: [],
            xp: 0,
            level: 1
        };
        
        this.ventures = [];
        this.isInitialized = false;
        this.apiBase = '/api'; // Adjust based on your Django URL configuration
    }

    async init() {
        console.log('🔄 Initializing Game Engine...');
        
        try {
            // Load player profile and ventures
            await Promise.all([
                this.loadPlayerProfile(),
                this.loadVentures()
            ]);
            
            // Update UI
            this.updateUI();
            this.loadVenturesUI();
            this.loadPortfolio();
            this.loadBadges();
            
            this.isInitialized = true;
            console.log('✅ Game Engine Initialized!');
            
            this.showNotification('🚀 Next Star Game Ready!', 'success');
        } catch (error) {
            console.error('❌ Failed to initialize game engine:', error);
            this.showNotification('Failed to load game data', 'error');
        }
    }

    async makeRequest(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken(),
            },
            credentials: 'include', // Important for session cookies
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Unauthorized - redirect to login
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }
            
            if (response.status === 403) {
                throw new Error('Access forbidden');
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
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

    async loadPlayerProfile() {
        try {
            const data = await this.makeRequest(`${this.apiBase}/profile/`);
            this.player = {
                tickets: data.tickets || 0,
                equity: data.total_equity || 0,
                xp: data.xp || 0,
                level: data.level || 1,
                ventures: data.ventures || [],
                badges: data.badges || [],
                activities: data.activities || []
            };
            console.log('📁 Loaded player profile:', this.player);
        } catch (error) {
            console.error('Error loading player profile:', error);
            // Fallback to local data for demo
            this.createDemoPlayer();
        }
    }

    async loadVentures() {
        try {
            const data = await this.makeRequest(`${this.apiBase}/ventures/`);
            this.ventures = data;
            console.log('📊 Loaded ventures:', this.ventures.length);
        } catch (error) {
            console.error('Error loading ventures:', error);
            // Fallback to demo ventures
            this.createDemoVentures();
        }
    }

    createDemoPlayer() {
        console.log('🎮 Creating demo player data');
        this.player = {
            tickets: 5,
            ventures: [],
            equity: 0,
            badges: [],
            activities: [
                {
                    icon: '🎮',
                    description: 'Started playing Next Star',
                    created_at: new Date().toISOString()
                }
            ],
            xp: 0,
            level: 1
        };
    }

    createDemoVentures() {
        console.log('🎮 Creating demo ventures');
        this.ventures = [
            {
                id: 1,
                name: 'Quantum Farms',
                venture_type: 'Agriculture',
                icon: '🌱',
                description: 'Grow super crops using quantum-enhanced soil technology',
                current_players: 24,
                max_players: 50,
                difficulty: 'Medium',
                winner_equity: 20,
                community_equity: 80,
                is_active: true
            },
            {
                id: 2,
                name: 'Neo Energy Core',
                venture_type: 'Energy',
                icon: '⚡',
                description: 'Harness cosmic energy with miniature black hole reactors',
                current_players: 18,
                max_players: 30,
                difficulty: 'Hard',
                winner_equity: 25,
                community_equity: 75,
                is_active: true
            },
            {
                id: 3,
                name: 'Cyber Finance AI',
                venture_type: 'Finance',
                icon: '💰',
                description: 'AI-powered banking that predicts market fluctuations',
                current_players: 32,
                max_players: 60,
                difficulty: 'Medium',
                winner_equity: 20,
                community_equity: 80,
                is_active: true
            },
            {
                id: 4,
                name: 'Neuro Health Tech',
                venture_type: 'Healthcare',
                icon: '🏥',
                description: 'Brain-computer interfaces for medical rehabilitation',
                current_players: 15,
                max_players: 40,
                difficulty: 'Easy',
                winner_equity: 15,
                community_equity: 85,
                is_active: true
            },
            {
                id: 5,
                name: 'Space Logistics Inc',
                venture_type: 'Transport',
                icon: '🚀',
                description: 'Orbital delivery services for lunar colonies',
                current_players: 28,
                max_players: 45,
                difficulty: 'Hard',
                winner_equity: 30,
                community_equity: 70,
                is_active: true
            }
        ];
    }

    updateUI() {
        console.log('🔄 Updating UI...');
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        updateElement('ticketCount', `🎫 ${this.player.tickets}`);
        updateElement('ventureCount', `⚔️ ${this.player.ventures.length}`);
        updateElement('equityPercent', `📈 ${this.player.equity.toFixed(1)}%`);
        
        // Update profile if it exists
        if (window.authManager) {
            authManager.loadProfileData();
        }
    }

    loadVenturesUI() {
        const grid = document.getElementById('ventureGrid');
        if (!grid) {
            console.log('❌ Venture grid not found');
            return;
        }

        if (this.ventures.length === 0) {
            grid.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">No ventures available at the moment.</div>';
            return;
        }

        grid.innerHTML = this.ventures.map(venture => {
            const hasJoined = this.player.ventures.some(v => v.venture?.id === venture.id);
            const isFull = venture.current_players >= venture.max_players;
            const canJoin = this.player.tickets > 0 && !hasJoined && !isFull && venture.is_active;
            
            return `
                <div class="venture-card" onclick="gameEngine.showVentureDetails(${venture.id})">
                    <div class="venture-header">
                        <div class="venture-icon">${venture.icon}</div>
                        <div class="venture-info">
                            <h3>${venture.name}</h3>
                            <div class="venture-stats">
                                <span>${venture.venture_type}</span>
                                <span class="difficulty-${venture.difficulty.toLowerCase()}">${venture.difficulty}</span>
                                <span>${venture.current_players}/${venture.max_players} Players</span>
                            </div>
                        </div>
                    </div>
                    <div class="venture-description">${venture.description}</div>
                    <div class="venture-equity">
                        <small>Winner: ${venture.winner_equity}% • Community: ${venture.community_equity}%</small>
                    </div>
                    <button class="join-btn" 
                            onclick="event.stopPropagation(); gameEngine.joinVenture(${venture.id})" 
                            ${!canJoin ? 'disabled' : ''}>
                        ${hasJoined ? '✅ JOINED' : isFull ? '🚫 FULL' : `JOIN VENTURE - ${venture.ticket_cost || 1} TICKET`}
                    </button>
                </div>
            `;
        }).join('');

        // Add difficulty styling
        this.addDifficultyStyles();
    }

    addDifficultyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .difficulty-easy { color: #00ff88; }
            .difficulty-medium { color: #ffaa00; }
            .difficulty-hard { color: #ff4444; }
            .difficulty-expert { color: #ff00ff; }
        `;
        document.head.appendChild(style);
    }

    loadPortfolio() {
        const grid = document.getElementById('portfolioGrid');
        if (!grid) return;

        if (this.player.ventures.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🚀</div>
                    <h3>No ventures yet</h3>
                    <p>Join some ventures to build your portfolio and start earning equity!</p>
                    <button class="join-btn" onclick="openWindow('ventureWindow')" style="margin-top: 20px;">
                        Explore Ventures
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.player.ventures.map(pv => {
            const venture = pv.venture || {};
            const value = pv.current_value || pv.estimated_value || 1000;
            const equity = pv.equity_share || 0;
            
            return `
                <div class="portfolio-item">
                    <div class="portfolio-icon">${venture.icon || '📊'}</div>
                    <div class="portfolio-details">
                        <h4>${venture.name || 'Unknown Venture'}</h4>
                        <div class="portfolio-equity">${equity.toFixed(2)}% Equity</div>
                        <div class="portfolio-value">Est. Value: $${parseFloat(value).toLocaleString()}</div>
                        <div class="portfolio-profit" style="color: ${value > 1000 ? '#00ff88' : '#ff4444'}; font-size: 0.8rem;">
                            ${value > 1000 ? '📈 Profitable' : '📉 Developing'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadBadges() {
        const grid = document.getElementById('badgesGrid');
        if (!grid) return;

        if (this.player.badges.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; color: #666; padding: 20px;">
                    <div>No badges yet. Complete achievements to earn badges!</div>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.player.badges.map(pb => {
            const badge = pb.badge || {};
            return `
                <div class="badge-item unlocked">
                    <div class="badge-icon">${badge.icon || '🏆'}</div>
                    <div class="badge-name">${badge.name || 'Achievement'}</div>
                    <div class="badge-desc">${badge.description || 'Earned achievement'}</div>
                </div>
            `;
        }).join('');
    }

    async joinVenture(ventureId) {
        if (!this.isInitialized) {
            this.showNotification('Game still loading...', 'error');
            return;
        }

        const venture = this.ventures.find(v => v.id === ventureId);
        if (!venture) {
            this.showNotification('Venture not found', 'error');
            return;
        }

        // Client-side validation
        if (this.player.tickets <= 0) {
            this.showNotification('Not enough tickets! Buy more from the shop.', 'error');
            openWindow('shopWindow');
            return;
        }

        if (this.player.ventures.some(v => v.venture?.id === ventureId)) {
            this.showNotification(`You already joined ${venture.name}!`, 'info');
            return;
        }

        if (venture.current_players >= venture.max_players) {
            this.showNotification(`${venture.name} is full!`, 'error');
            return;
        }

        if (!venture.is_active) {
            this.showNotification(`${venture.name} is not currently active`, 'error');
            return;
        }

        try {
            const response = await this.makeRequest(
                `${this.apiBase}/ventures/${ventureId}/join/`,
                { method: 'POST' }
            );

            if (response.success) {
                // Reload player data to get updated state
                await this.loadPlayerProfile();
                await this.loadVentures();
                
                this.updateUI();
                this.loadPortfolio();
                this.loadVenturesUI();
                
                this.showNotification(`🎉 Successfully joined ${venture.name}! +${response.equity_share || 0}% equity`, 'success');
                
                // Add activity
                if (window.authManager) {
                    authManager.addActivity('⚔️', `Joined venture: ${venture.name}`);
                    authManager.addXP(10);
                }
            } else {
                this.showNotification(response.error || 'Failed to join venture', 'error');
            }
        } catch (error) {
            console.error('Error joining venture:', error);
            
            // Fallback to local simulation if API fails
            this.simulateJoinVenture(venture);
        }
    }

    simulateJoinVenture(venture) {
        console.log('🎮 Simulating venture join (offline mode)');
        
        // Use ticket
        this.player.tickets--;
        
        // Calculate equity share
        const equityShare = (venture.community_equity / venture.max_players) * 0.1;
        
        // Add to portfolio
        this.player.ventures.push({
            id: Date.now(),
            venture: venture,
            equity_share: equityShare,
            current_value: Math.floor(Math.random() * 5000) + 1000,
            joined_at: new Date().toISOString()
        });
        
        // Update total equity
        this.player.equity = this.player.ventures.reduce((sum, v) => sum + (v.equity_share || 0), 0);
        
        // Update venture player count
        venture.current_players++;
        
        // Add XP
        this.player.xp += 10;
        
        // Check level up
        this.checkLevelUp();
        
        // Update UI
        this.updateUI();
        this.loadPortfolio();
        this.loadVenturesUI();
        
        this.showNotification(`🎉 Joined ${venture.name}! +${equityShare.toFixed(2)}% equity`, 'success');
        
        // Add activity
        if (window.authManager) {
            authManager.addActivity('⚔️', `Joined venture: ${venture.name}`);
        }
    }

    async buyTickets(count) {
        if (!this.isInitialized) {
            this.showNotification('Game still loading...', 'error');
            return;
        }

        try {
            const response = await this.makeRequest(
                `${this.apiBase}/profile/buy_tickets/`,
                {
                    method: 'POST',
                    body: JSON.stringify({ count: count })
                }
            );

            if (response.success) {
                // Update local state
                this.player.tickets = response.total_tickets;
                
                this.updateUI();
                this.loadVenturesUI();
                
                this.showNotification(response.message, 'success');
                
                // Add activity
                if (window.authManager) {
                    authManager.addActivity('🎫', `Purchased ${count} tickets`);
                }
            } else {
                this.showNotification(response.error || 'Failed to purchase tickets', 'error');
            }
        } catch (error) {
            console.error('Error buying tickets:', error);
            
            // Fallback to local simulation
            this.simulateBuyTickets(count);
        }
    }

    simulateBuyTickets(count) {
        console.log('🎮 Simulating ticket purchase (offline mode)');
        this.player.tickets += count;
        this.updateUI();
        this.loadVenturesUI();
        this.showNotification(`Purchased ${count} Star Tickets!`, 'success');
        
        // Add activity
        if (window.authManager) {
            authManager.addActivity('🎫', `Purchased ${count} tickets`);
        }
    }

    checkLevelUp() {
        const xpRequired = 100 * (this.player.level ** 2);
        
        if (this.player.xp >= xpRequired) {
            this.player.xp -= xpRequired;
            this.player.level++;
            
            // Reward for leveling up
            this.player.tickets += 2;
            
            this.showNotification(`🎉 Level Up! Now Level ${this.player.level}`, 'success');
            
            // Add activity
            if (window.authManager) {
                authManager.addActivity('🎯', `Reached Level ${this.player.level}!`);
            }
            
            // Check for further level ups
            this.checkLevelUp();
        }
    }

    showVentureDetails(ventureId) {
        const venture = this.ventures.find(v => v.id === ventureId);
        if (!venture) return;

        const detailsHtml = `
            <div style="padding: 20px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <div style="font-size: 3rem;">${venture.icon}</div>
                    <div>
                        <h2 style="color: var(--parrot-accent); margin-bottom: 5px;">${venture.name}</h2>
                        <div style="color: var(--parrot-text-secondary);">${venture.venture_type} • ${venture.difficulty}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: var(--parrot-accent); margin-bottom: 10px;">Description</h3>
                    <p>${venture.description}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: var(--parrot-text-secondary);">Players</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">${venture.current_players}/${venture.max_players}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: var(--parrot-text-secondary);">Winner Equity</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--parrot-accent);">${venture.winner_equity}%</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: var(--parrot-text-secondary);">Community Pool</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">${venture.community_equity}%</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.8rem; color: var(--parrot-text-secondary);">Ticket Cost</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">${venture.ticket_cost || 1}</div>
                    </div>
                </div>
                
                <button class="join-btn" onclick="gameEngine.joinVenture(${venture.id})" 
                        ${this.player.tickets <= 0 ? 'disabled' : ''}
                        style="width: 100%;">
                    ${this.player.tickets <= 0 ? 'Need More Tickets' : `Join Venture - ${venture.ticket_cost || 1} Ticket`}
                </button>
            </div>
        `;

        // Create or update modal window
        let modal = document.getElementById('ventureDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ventureDetailsModal';
            modal.className = 'window';
            modal.style.width = '500px';
            modal.style.height = '600px';
            modal.style.top = '100px';
            modal.style.left = 'calc(50% - 250px)';
            modal.style.zIndex = '1000';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';
            
            modal.innerHTML = `
                <div class="window-header">
                    <div class="window-title">Venture Details</div>
                    <div class="window-controls">
                        <div class="window-control close" onclick="document.getElementById('ventureDetailsModal').remove()"></div>
                    </div>
                </div>
                <div class="window-content">
                    ${detailsHtml}
                </div>
            `;
            
            document.body.appendChild(modal);
            makeDraggable('ventureDetailsModal');
        } else {
            modal.querySelector('.window-content').innerHTML = detailsHtml;
            modal.style.display = 'flex';
        }
    }

    handleUnauthorized() {
        console.log('🔐 User not authenticated, redirecting to login...');
        window.location.href = '/login/';
    }

    showNotification(message, type = 'info') {
        // Use the global notification function if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback notification
        const notification = document.createElement('div');
        notification.textContent = message;
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

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Utility method to refresh all game data
    async refreshGameData() {
        try {
            await Promise.all([
                this.loadPlayerProfile(),
                this.loadVentures()
            ]);
            
            this.updateUI();
            this.loadVenturesUI();
            this.loadPortfolio();
            this.loadBadges();
            
            this.showNotification('Game data refreshed!', 'success');
        } catch (error) {
            console.error('Error refreshing game data:', error);
            this.showNotification('Failed to refresh data', 'error');
        }
    }
}

// Initialize game engine when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.gameEngine = new GameEngine();
    window.gameEngine.init();
});

// Make refresh available globally
window.refreshGameData = () => window.gameEngine.refreshGameData();