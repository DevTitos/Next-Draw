// Start Menu Functionality
let startMenuVisible = false;

function toggleStartMenu() {
    const startMenu = document.getElementById('startMenu');
    startMenuVisible = !startMenuVisible;
    
    if (startMenuVisible) {
        startMenu.classList.add('show');
        updateStartMenuData();
        startClock();
    } else {
        startMenu.classList.remove('show');
    }
}

function hideStartMenu() {
    const startMenu = document.getElementById('startMenu');
    startMenu.classList.remove('show');
    startMenuVisible = false;
}

function updateStartMenuData() {
    // Update user info
    if (window.authManager && authManager.currentUser) {
        document.getElementById('startMenuAvatar').textContent = authManager.currentUser.avatar;
        document.getElementById('startMenuName').textContent = authManager.currentUser.name;
        document.getElementById('startMenuLevel').textContent = authManager.currentUser.level;
    }

    // Update game stats
    if (window.gameEngine) {
        document.getElementById('startMenuTickets').textContent = gameEngine.player.tickets;
        document.getElementById('startMenuStars').textContent = gameEngine.player.stars || 100;
        document.getElementById('startMenuEquity').textContent = gameEngine.player.equity.toFixed(1) + '%';

        // Update quick stats
        document.getElementById('quickVenturesJoined').textContent = gameEngine.player.ventures.length;
        document.getElementById('quickTotalEquity').textContent = gameEngine.player.equity.toFixed(1) + '%';
        document.getElementById('quickBadgesEarned').textContent = gameEngine.player.badges.length;
        
        // Update recent ventures
        updateRecentVentures();
    }

    // Update wallet data
    updateWalletData();
}

function updateRecentVentures() {
    const recentList = document.getElementById('recentVenturesList');
    const ventures = gameEngine.player.ventures.slice(0, 3); // Show last 3 ventures
    
    if (ventures.length === 0) {
        recentList.innerHTML = '<div class="recent-item"><div class="recent-name">No ventures joined yet</div></div>';
        return;
    }

    recentList.innerHTML = ventures.map(venture => `
        <div class="recent-item" onclick="openWindow('portfolioWindow'); hideStartMenu();">
            <div class="recent-icon">${venture.venture?.icon || '📊'}</div>
            <div class="recent-name">${venture.venture?.name || 'Unknown Venture'}</div>
            <div class="recent-equity">${venture.equity_share?.toFixed(1) || '0'}%</div>
        </div>
    `).join('');
}

function updateWalletData() {
    if (window.gameEngine) {
        document.getElementById('walletStars').textContent = gameEngine.player.stars || 100;
        document.getElementById('walletTickets').textContent = gameEngine.player.tickets;
        document.getElementById('walletCoins').textContent = (gameEngine.player.coins || 1000).toLocaleString();
    }
}

function startClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('currentTime').textContent = timeString;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

async function handleLogout() {
    try {
        // Show loading state
        if (window.gameEngine) {
            gameEngine.showNotification('Logging out...', 'info');
        }

        // Try API logout first
        const response = await fetch('/api/auth/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Clear local storage and state
            localStorage.removeItem('nextStarUser');
            localStorage.removeItem('nextStarGame');
            
            // Clear any game engine state
            if (window.gameEngine) {
                gameEngine.player = {
                    tickets: 0,
                    ventures: [],
                    equity: 0,
                    badges: [],
                    activities: [],
                    xp: 0,
                    level: 1
                };
                gameEngine.isInitialized = false;
            }
            
            // Clear auth manager state
            if (window.authManager) {
                authManager.currentUser = null;
                authManager.isAuthenticated = false;
            }
            
            // Show success message
            if (window.gameEngine) {
                gameEngine.showNotification('Logged out successfully!', 'success');
            }
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = data.redirect_url || '/';
            }, 1000);
            
        } else {
            throw new Error(data.error || 'Logout failed');
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        
        // Fallback to traditional logout
        try {
            // Clear local storage
            localStorage.removeItem('nextStarUser');
            localStorage.removeItem('nextStarGame');
            
            // Redirect to traditional logout
            window.location.href = '/accounts/logout/';
            
        } catch (fallbackError) {
            console.error('Fallback logout failed:', fallbackError);
            
            // Last resort - redirect to home
            window.location.href = '/';
        }
    }
}

// Helper function to get CSRF token
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue || '';
}

function showLogoutConfirmation() {
    return new Promise((resolve) => {
        // Create confirmation modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        `;

        modal.innerHTML = `
            <div style="
                background: var(--parrot-window-bg);
                border: 2px solid var(--parrot-accent);
                border-radius: 15px;
                padding: 30px;
                max-width: 400px;
                text-align: center;
            ">
                <h3 style="color: var(--parrot-accent); margin-bottom: 15px;">Confirm Logout</h3>
                <p style="margin-bottom: 25px; line-height: 1.5;">
                    Are you sure you want to logout?<br>
                    Your game progress is saved automatically.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="this.closest('div[style]').remove(); resolve(false);" 
                            style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: 1px solid var(--parrot-border); border-radius: 5px; color: var(--parrot-text); cursor: pointer;">
                        Cancel
                    </button>
                    <button onclick="this.closest('div[style]').remove(); resolve(true);" 
                            style="padding: 10px 20px; background: #ff4444; border: none; border-radius: 5px; color: white; cursor: pointer;">
                        Logout
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    });
}

function showNotifications() {
    // Simple notification display
    if (window.gameEngine) {
        gameEngine.showNotification('🔔 You have 3 unread notifications', 'info');
    }
}

// Close start menu when clicking outside
document.addEventListener('click', (event) => {
    const startMenu = document.getElementById('startMenu');
    const startTrigger = document.querySelector('.start-menu-trigger');
    
    if (startMenuVisible && 
        !startMenu.contains(event.target) && 
        !startTrigger.contains(event.target)) {
        hideStartMenu();
    }
});

// Search functionality
document.getElementById('startMenuSearch').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm.length > 2) {
        performSearch(searchTerm);
    }
});

function performSearch(term) {
    // Simple search implementation
    const results = [];
    
    // Search in ventures
    if (window.gameEngine) {
        const ventureResults = gameEngine.ventures.filter(venture => 
            venture.name.toLowerCase().includes(term) ||
            venture.description.toLowerCase().includes(term)
        );
        results.push(...ventureResults.map(v => ({ type: 'venture', data: v })));
    }
    
    // You can add more search categories here
    console.log('Search results for:', term, results);
    
    // For now, just show a notification
    if (results.length > 0) {
        gameEngine.showNotification(`Found ${results.length} results for "${term}"`, 'info');
    }
}

// Initialize start menu when page loads
document.addEventListener('DOMContentLoaded', function() {
    startClock();
});