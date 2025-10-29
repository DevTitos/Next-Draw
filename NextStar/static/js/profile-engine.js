// Profile Engine - Handles player profile data and UI
class ProfileEngine {
    constructor() {
        this.profileData = null;
        this.currentTab = 'overview';
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('👤 Initializing Profile Engine...');
        await this.loadProfileData();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    async loadProfileData() {
        try {
            console.log('📥 Loading profile data...');
            const response = await fetch('/api/profile/');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.profileData = data;
            this.updateProfileUI();
            
            console.log('✅ Profile data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            this.showError('Failed to load profile data');
        }
    }

    updateProfileUI() {
        if (!this.profileData) return;

        this.updateBasicInfo();
        this.updateXPProgress();
        this.updateOverviewTab();
        this.updateVenturesTab();
        this.updateBadgesTab();
        this.updateActivityTab();
        this.updateSettingsTab();
    }

    updateBasicInfo() {
        // Avatar and basic info
        document.getElementById('profileAvatar').textContent = '👤'; // You can make this dynamic
        document.getElementById('profileName').textContent = this.profileData.username;
        document.getElementById('profileLevel').textContent = this.profileData.level;
        
        // Join date
        const joinDate = new Date(this.profileData.created_at);
        document.getElementById('profileJoinDate').textContent = joinDate.toLocaleDateString();
        
        // Quick stats
        document.getElementById('quickTickets').textContent = this.profileData.tickets;
        document.getElementById('quickStars').textContent = this.profileData.stars || 0;
        document.getElementById('quickCoins').textContent = this.profileData.coins || 0;
    }

    updateXPProgress() {
        const currentLevel = this.profileData.level;
        const currentXP = this.profileData.xp;
        
        // Simple XP calculation (100 * level^2 for next level)
        const xpForNextLevel = 100 * Math.pow(currentLevel, 2);
        const xpForCurrentLevel = 100 * Math.pow(currentLevel - 1, 2);
        const xpInCurrentLevel = currentXP - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = (xpInCurrentLevel / xpNeeded) * 100;

        document.getElementById('currentLevel').textContent = currentLevel;
        document.getElementById('xpText').textContent = `${xpInCurrentLevel}/${xpNeeded} XP`;
        document.getElementById('xpProgressFill').style.width = `${progressPercent}%`;
        document.getElementById('nextLevelText').textContent = `Next Level: ${xpNeeded} XP`;
    }

    updateOverviewTab() {
        // Stats cards
        document.getElementById('totalEquity').textContent = `${this.profileData.total_equity.toFixed(1)}%`;
        document.getElementById('venturesCount').textContent = this.profileData.ventures.length;
        document.getElementById('badgesCount').textContent = this.profileData.badges.length;
        
        // Calculate portfolio value
        const portfolioValue = this.calculatePortfolioValue();
        document.getElementById('portfolioValue').textContent = `$${portfolioValue.toLocaleString()}`;

        // Activity preview (last 3 activities)
        this.updateActivityPreview();
    }

    updateVenturesTab() {
        const container = document.getElementById('venturesList');
        const ventures = this.profileData.ventures;

        if (ventures.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚔️</div>
                    <h3>No Ventures Yet</h3>
                    <p>Join some ventures to start building your portfolio!</p>
                    <button class="join-btn" onclick="openWindow('ventureWindow')">Explore Ventures</button>
                </div>
            `;
            return;
        }

        // Calculate total portfolio value
        const totalValue = this.calculatePortfolioValue();
        document.getElementById('portfolioTotalValue').textContent = totalValue.toLocaleString();

        container.innerHTML = ventures.map(venture => `
            <div class="venture-portfolio-item">
                <div class="venture-icon">${venture.venture.icon}</div>
                <div class="venture-details">
                    <h4 class="venture-name">${venture.venture.name}</h4>
                    <div class="venture-meta">
                        <span class="venture-type">${venture.venture.venture_type}</span>
                        <span class="venture-equity">${venture.equity_share.toFixed(2)}% Equity</span>
                    </div>
                    <div class="venture-value">Value: $${venture.current_value.toLocaleString()}</div>
                </div>
                <div class="venture-actions">
                    <div class="venture-performance ${venture.current_value > 1000 ? 'positive' : 'neutral'}">
                        ${venture.current_value > 1000 ? '📈' : '📊'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateBadgesTab() {
        const container = document.getElementById('badgesGrid');
        const badges = this.profileData.badges;

        document.getElementById('badgesEarnedCount').textContent = badges.length;

        if (badges.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏆</div>
                    <h3>No Badges Yet</h3>
                    <p>Complete achievements and participate in the community to earn badges!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = badges.map(badge => `
            <div class="badge-card ${badge.badge.rarity}">
                <div class="badge-icon">${badge.badge.icon}</div>
                <div class="badge-content">
                    <h4 class="badge-name">${badge.badge.name}</h4>
                    <p class="badge-description">${badge.badge.description}</p>
                    <div class="badge-meta">
                        <span class="badge-rarity ${badge.badge.rarity}">${badge.badge.rarity}</span>
                        <span class="badge-date">${new Date(badge.unlocked_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateActivityTab() {
        const container = document.getElementById('activityList');
        const activities = this.profileData.activities;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No Activity Yet</h3>
                    <p>Your activity history will appear here as you play!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${this.formatActivityTime(activity.created_at)}</div>
                </div>
            </div>
        `).join('');
    }

    updateActivityPreview() {
        const container = document.getElementById('activityPreview');
        const activities = this.profileData.activities.slice(0, 3); // Show last 3 activities

        if (activities.length === 0) {
            container.innerHTML = '<div class="no-activity">No recent activity</div>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-preview-item">
                <span class="preview-icon">${activity.icon}</span>
                <span class="preview-text">${activity.description}</span>
            </div>
        `).join('');
    }

    updateSettingsTab() {
        // Populate settings form
        document.getElementById('displayName').value = this.profileData.username;
        document.getElementById('email').value = this.profileData.email;
        
        // You can add more settings here based on your user model
    }

    calculatePortfolioValue() {
        if (!this.profileData.ventures.length) return 0;
        
        return this.profileData.ventures.reduce((total, venture) => {
            return total + venture.current_value;
        }, 0);
    }

    formatActivityTime(timestamp) {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffMs = now - activityTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return activityTime.toLocaleDateString();
    }

    switchTab(tabName) {
        // Update tabs
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Activate selected tab
        event.target.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        this.currentTab = tabName;
    }

    changeAvatar() {
        const avatars = ['🚀', '👨‍🚀', '👩‍🚀', '🦁', '🐯', '🐲', '🌟', '⚡', '🔥', '💎'];
        const currentAvatar = document.getElementById('profileAvatar').textContent;
        const currentIndex = avatars.indexOf(currentAvatar);
        const nextIndex = (currentIndex + 1) % avatars.length;
        
        document.getElementById('profileAvatar').textContent = avatars[nextIndex];
        
        if (window.gameEngine) {
            gameEngine.showNotification('Avatar updated!', 'success');
        }
    }

    async saveSettings() {
        // This would typically send settings to the server
        const displayName = document.getElementById('displayName').value;
        const email = document.getElementById('email').value;
        
        // Simple client-side validation
        if (!displayName.trim()) {
            this.showError('Display name cannot be empty');
            return;
        }

        try {
            // Here you would make an API call to save settings
            // For now, just show a success message
            if (window.gameEngine) {
                gameEngine.showNotification('Settings saved successfully!', 'success');
            }
            
            // Update the profile name in UI
            document.getElementById('profileName').textContent = displayName;
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showError(message) {
        if (window.gameEngine) {
            gameEngine.showNotification(message, 'error');
        }
    }

    setupEventListeners() {
        // Add any additional event listeners here
        console.log('🎯 Profile engine event listeners setup');
    }

    refreshProfile() {
        this.loadProfileData();
        if (window.gameEngine) {
            gameEngine.showNotification('Profile refreshed!', 'info');
        }
    }
}

// Initialize profile engine
const profileEngine = new ProfileEngine();

// Make functions global
window.profileEngine = profileEngine;