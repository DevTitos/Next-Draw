// Authentication and Profile Management - Django Backend Integration
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.checkAuthenticationStatus();
        this.updateAuthUI();
    }

    async checkAuthenticationStatus() {
        try {
            const response = await this.makeRequest(`${this.apiBase}/auth/check/`);
            
            if (response.authenticated) {
                await this.loadAuthenticatedUser(response);
            } else {
                this.createGuestSession();
            }
        } catch (error) {
            console.log('Not authenticated, creating guest session');
            this.createGuestSession();
        }
    }

    async loadAuthenticatedUser(authData) {
        try {
            // Load full profile data
            const profileData = await this.makeRequest(`${this.apiBase}/profile/`);
            
            this.currentUser = {
                id: authData.user.id,
                name: authData.user.username,
                email: authData.user.email,
                level: profileData.level || 1,
                xp: profileData.xp || 0,
                xpRequired: this.calculateXPRequired(profileData.level || 1),
                avatar: '👨‍🚀',
                isGuest: false,
                joinDate: profileData.created_at || new Date().toISOString(),
                activities: profileData.activities || [],
                profileData: profileData
            };
            
            this.isAuthenticated = true;
            console.log('✅ User authenticated:', this.currentUser.name);
            
            this.updateAuthUI();
            return this.currentUser;
            
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.createGuestSession();
        }
    }

    createGuestSession() {
        this.currentUser = {
            id: 'guest_' + Date.now(),
            name: 'Guest Player',
            email: '',
            level: 1,
            xp: 0,
            xpRequired: 100,
            avatar: '🚀',
            isGuest: true,
            joinDate: new Date().toISOString(),
            activities: []
        };
        this.isAuthenticated = false;
        console.log('👤 Created guest session');
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
            
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }
            
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

    calculateXPRequired(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    async login(email, password) {
        try {
            const response = await this.makeRequest(`${this.apiBase}/auth/login/`, {
                method: 'POST',
                body: JSON.stringify({
                    username: email,
                    password: password
                })
            });

            if (response.success) {
                await this.loadAuthenticatedUser(response);
                this.updateAuthUI();
                this.loadProfileData();
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async register(name, email, password, confirmPassword) {
        try {
            const response = await this.makeRequest(`${this.apiBase}/auth/register/`, {
                method: 'POST',
                body: JSON.stringify({
                    username: name,
                    email: email,
                    password: password,
                    password2: confirmPassword
                })
            });

            if (response.success) {
                await this.loadAuthenticatedUser(response);
                this.updateAuthUI();
                this.loadProfileData();
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await this.makeRequest(`${this.apiBase}/auth/logout/`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.handleUnauthorized();
        }
    }

    handleUnauthorized() {
        this.createGuestSession();
        this.updateAuthUI();
        closeWindow('profileWindow');
    }

    updateAuthUI() {
        const authBtn = document.getElementById('authHudBtn');
        if (!authBtn) return;

        if (this.isAuthenticated && !this.currentUser.isGuest) {
            authBtn.textContent = `👤 ${this.currentUser.name}`;
            authBtn.classList.add('logged-in');
        } else {
            authBtn.textContent = '👤 LOGIN';
            authBtn.classList.remove('logged-in');
        }
    }

    loadProfileData() {
        if (!this.currentUser) return;

        // Update profile window
        const profileName = document.getElementById('profileName');
        const profileAvatar = document.getElementById('profileAvatar');
        const profileLevel = document.getElementById('profileLevel');
        
        if (profileName) profileName.textContent = this.currentUser.name;
        if (profileAvatar) profileAvatar.textContent = this.currentUser.avatar;
        if (profileLevel) profileLevel.textContent = this.currentUser.level;
        
        // Calculate XP percentage
        const xpPercent = (this.currentUser.xp / this.currentUser.xpRequired) * 100;
        const xpProgress = document.getElementById('xpProgress');
        const xpText = document.getElementById('xpText');
        
        if (xpProgress) xpProgress.style.width = `${xpPercent}%`;
        if (xpText) xpText.textContent = `${this.currentUser.xp}/${this.currentUser.xpRequired} XP`;
        
        // Sync with game engine stats if available
        if (window.gameEngine) {
            const profileTickets = document.getElementById('profileTickets');
            const profileVentures = document.getElementById('profileVentures');
            const profileEquity = document.getElementById('profileEquity');
            const profileBadges = document.getElementById('profileBadges');
            
            if (profileTickets) profileTickets.textContent = gameEngine.player.tickets;
            if (profileVentures) profileVentures.textContent = gameEngine.player.ventures.length;
            if (profileEquity) profileEquity.textContent = `${gameEngine.player.equity}%`;
            if (profileBadges) profileBadges.textContent = gameEngine.player.badges.length;
        }
        
        // Load activity
        this.loadActivity();
    }

    loadActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const activities = this.currentUser.activities || [];
        
        if (activities.length === 0) {
            activityList.innerHTML = '<div class="activity-item"><div class="activity-content">No activity yet</div></div>';
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">${activity.description}</div>
                <div class="activity-time">${this.formatTime(activity.created_at)}</div>
            </div>
        `).join('');
    }

    formatTime(timestamp) {
        if (!timestamp) return 'Recently';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    addActivity(icon, message) {
        // This would typically be handled by the backend
        // For now, we'll just update the local state
        if (!this.currentUser.activities) {
            this.currentUser.activities = [];
        }
        
        this.currentUser.activities.unshift({
            icon: icon,
            description: message,
            created_at: new Date().toISOString()
        });
        
        // Keep only last 10 activities
        if (this.currentUser.activities.length > 10) {
            this.currentUser.activities = this.currentUser.activities.slice(0, 10);
        }
        
        // If profile window is open, refresh it
        if (document.getElementById('profileWindow')?.style.display === 'block') {
            this.loadActivity();
        }
    }

    addXP(amount) {
        // This should be handled by the backend
        // For now, we'll update locally and sync on next reload
        this.currentUser.xp += amount;
        
        // Check level up
        while (this.currentUser.xp >= this.currentUser.xpRequired) {
            this.currentUser.xp -= this.currentUser.xpRequired;
            this.currentUser.level++;
            this.currentUser.xpRequired = this.calculateXPRequired(this.currentUser.level);
            
            this.addActivity('🎯', `Reached Level ${this.currentUser.level}!`);
            
            if (window.gameEngine) {
                gameEngine.showNotification(`🎉 Level Up! Now Level ${this.currentUser.level}`, 'success');
            }
        }
        
        // If profile window is open, refresh it
        if (document.getElementById('profileWindow')?.style.display === 'block') {
            this.loadProfileData();
        }
    }
}

// Global auth functions
function openAuthOrProfile() {
    if (!authManager.isAuthenticated || authManager.currentUser.isGuest) {
        openWindow('authWindow');
    } else {
        authManager.loadProfileData();
        openWindow('profileWindow');
    }
}

function switchAuthTab(tab) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    // Activate selected tab
    event.target.classList.add('active');
    document.getElementById(tab + 'Form').classList.add('active');
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        if (window.gameEngine) {
            gameEngine.showNotification('Please fill in all fields', 'error');
        }
        return;
    }
    
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    const originalText = loginButton.textContent;
    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;
    
    const result = await authManager.login(email, password);
    
    loginButton.textContent = originalText;
    loginButton.disabled = false;
    
    if (result.success) {
        closeWindow('authWindow');
        if (window.gameEngine) {
            gameEngine.showNotification(`Welcome back, ${result.user.name}!`, 'success');
        }
        authManager.addActivity('🚀', 'Logged in to the game');
    } else {
        if (window.gameEngine) {
            gameEngine.showNotification(result.error, 'error');
        }
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    if (!name || !email || !password || !confirm) {
        if (window.gameEngine) {
            gameEngine.showNotification('Please fill in all fields', 'error');
        }
        return;
    }
    
    if (password !== confirm) {
        if (window.gameEngine) {
            gameEngine.showNotification('Passwords do not match', 'error');
        }
        return;
    }
    
    const registerButton = document.querySelector('#registerForm button[type="submit"]');
    const originalText = registerButton.textContent;
    registerButton.textContent = 'Creating account...';
    registerButton.disabled = true;
    
    const result = await authManager.register(name, email, password, confirm);
    
    registerButton.textContent = originalText;
    registerButton.disabled = false;
    
    if (result.success) {
        closeWindow('authWindow');
        if (window.gameEngine) {
            gameEngine.showNotification(`Welcome to Next Star, ${result.user.name}!`, 'success');
        }
    } else {
        if (window.gameEngine) {
            gameEngine.showNotification(result.error, 'error');
        }
    }
}

function handleLogout() {
    authManager.logout();
}

// Initialize auth manager
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});