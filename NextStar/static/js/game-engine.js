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
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
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
                tickets: data.tickets,
                equity: data.total_equity,
                xp: data.xp,
                level: data.level,
                ventures: data.ventures,
                badges: data.badges,
                activities: data.activities
            };
            console.log('📁 Loaded player profile');
        } catch (error) {
            console.error('Error loading player profile:', error);
            throw error;
        }
    }

    async loadVentures() {
        try {
            const data = await this.makeRequest(`${this.apiBase}/ventures/`);
            this.ventures = data;
            console.log('📊 Loaded ventures:', data.length);
        } catch (error) {
            console.error('Error loading ventures:', error);
            throw error;
        }
    }

    updateUI() {
        console.log('🔄 Updating UI...');
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        updateElement('ticketCount', this.player.tickets);
        updateElement('ventureCount', this.player.ventures.length);
        updateElement('equityPercent', `${this.player.equity.toFixed(2)}%`);
        updateElement('xpCount', this.player.xp);
        updateElement('levelCount', this.player.level);
        
        // Update profile if it exists
        if (window.authManager && document.getElementById('profileTickets')) {
            authManager.loadProfileData();
        }
    }

    loadVenturesUI() {
        const grid = document.getElementById('ventureGrid');
        if (!grid) {
            console.log('❌ Venture grid not found');
            return;
        }

        grid.innerHTML = this.ventures.map(venture => `
            <div class="venture-card" onclick="gameEngine.joinVenture(${venture.id})">
                <div class="venture-header">
                    <div class="venture-icon">${venture.icon}</div>
                    <div class="venture-info">
                        <h3>${venture.name}</h3>
                        <div class="venture-stats">
                            <span>${venture.venture_type}</span>
                            <span>${venture.difficulty}</span>
                            <span>${venture.current_players}/${venture.max_players} Players</span>
                        </div>
                    </div>
                </div>
                <div class="venture-description">${venture.description}</div>
                <button class="join-btn" ${this.player.tickets <= 0 ? 'disabled' : ''}>
                    JOIN VENTURE - 1 TICKET
                </button>
            </div>
        `).join('');
    }

    loadPortfolio() {
        const grid = document.getElementById('portfolioGrid');
        if (!grid) return;

        if (this.player.ventures.length === 0) {
            grid.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">No ventures yet. Join some ventures to build your portfolio!</div>';
            return;
        }

        grid.innerHTML = this.player.ventures.map(pv => `
            <div class="portfolio-item">
                <div class="portfolio-icon">${pv.venture.icon}</div>
                <div class="portfolio-details">
                    <h4>${pv.venture.name}</h4>
                    <div class="portfolio-equity">${pv.equity_share.toFixed(2)}% Equity</div>
                    <div class="portfolio-value">Est. Value: $${parseFloat(pv.estimated_value).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }

    loadBadges() {
        const grid = document.getElementById('badgesGrid');
        if (!grid) return;

        grid.innerHTML = this.player.badges.map(pb => `
            <div class="badge-item unlocked">
                <div class="badge-icon">${pb.badge.icon}</div>
                <div class="badge-name">${pb.badge.name}</div>
                <div class="badge-desc">${pb.badge.description}</div>
            </div>
        `).join('');
    }

    async joinVenture(ventureId) {
        if (!this.isInitialized) {
            this.showNotification('Game still loading...', 'error');
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
                
                this.showNotification(response.message, 'success');
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Error joining venture:', error);
            this.showNotification('Failed to join venture', 'error');
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
            }
        } catch (error) {
            console.error('Error buying tickets:', error);
            this.showNotification('Failed to purchase tickets', 'error');
        }
    }

    showNotification(message, type) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
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
}

// Initialize game engine when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.gameEngine = new GameEngine();
    window.gameEngine.init();
});