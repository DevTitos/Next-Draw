// Data Manager for Shares, Projects, and Leaderboard
class DataManager {
    constructor() {
        this.projects = [];
        this.leaderboard = [];
        this.init();
    }

    init() {
        this.generateSampleData();
        console.log('✅ Data Manager Initialized');
    }

    generateSampleData() {
        // Generate sample projects
        this.projects = [
            {
                id: 1,
                name: 'Quantum Solar Grid',
                icon: '⚡',
                type: 'Energy',
                description: 'Revolutionary solar technology using quantum dots for 300% efficiency',
                progress: 75,
                totalShares: 10000,
                fundedShares: 7500,
                valuation: 2500000,
                startDate: '2024-01-15',
                estimatedCompletion: '2024-06-30',
                status: 'active',
                ceo: 'SolarMaster',
                teamSize: 12
            },
            {
                id: 2,
                name: 'Neuro Finance AI',
                icon: '🧠',
                type: 'Finance',
                description: 'AI-powered investment platform using neural networks for market prediction',
                progress: 45,
                totalShares: 8000,
                fundedShares: 3600,
                valuation: 1800000,
                startDate: '2024-02-01',
                estimatedCompletion: '2024-08-15',
                status: 'active',
                ceo: 'FinWizard',
                teamSize: 8
            },
            {
                id: 3,
                name: 'Aqua Pure Systems',
                icon: '💧',
                type: 'Environment',
                description: 'Advanced water purification using graphene filters and IoT monitoring',
                progress: 90,
                totalShares: 6000,
                fundedShares: 5400,
                valuation: 1200000,
                startDate: '2023-11-20',
                estimatedCompletion: '2024-04-10',
                status: 'active',
                ceo: 'WaterTech',
                teamSize: 6
            },
            {
                id: 4,
                name: 'Urban Farm Network',
                icon: '🌱',
                type: 'Agriculture',
                description: 'Vertical farming system for urban areas with automated hydroponics',
                progress: 30,
                totalShares: 12000,
                fundedShares: 3600,
                valuation: 3000000,
                startDate: '2024-03-01',
                estimatedCompletion: '2024-12-15',
                status: 'active',
                ceo: 'GreenThumb',
                teamSize: 15
            }
        ];

        // Generate sample leaderboard data
        this.generateLeaderboard();
    }

    generateLeaderboard() {
        const players = [
            { name: 'QuantumInvestor', shares: 1250, equityValue: 62500, projects: 8, level: 15 },
            { name: 'StarBuilder', shares: 980, equityValue: 49000, projects: 6, level: 12 },
            { name: 'VentureMaster', shares: 875, equityValue: 43750, projects: 7, level: 11 },
            { name: 'EquityHunter', shares: 720, equityValue: 36000, projects: 5, level: 10 },
            { name: 'FutureBuilder', shares: 650, equityValue: 32500, projects: 4, level: 9 },
            { name: 'TechPioneer', shares: 580, equityValue: 29000, projects: 5, level: 8 },
            { name: 'GreenInvestor', shares: 520, equityValue: 26000, projects: 4, level: 8 },
            { name: 'FinanceGuru', shares: 480, equityValue: 24000, projects: 3, level: 7 },
            { name: 'EnergyMaster', shares: 420, equityValue: 21000, projects: 3, level: 7 },
            { name: 'InnovationKing', shares: 380, equityValue: 19000, projects: 2, level: 6 }
        ];

        // Add current player if authenticated
        if (window.authManager && !authManager.currentUser.isGuest) {
            const playerShares = this.calculatePlayerShares();
            players.push({
                name: authManager.currentUser.name,
                shares: playerShares.totalShares,
                equityValue: playerShares.totalValue,
                projects: playerShares.projectsCount,
                level: authManager.currentUser.level
            });
        }

        this.leaderboard = players.sort((a, b) => b.shares - a.shares);
    }

    calculatePlayerShares() {
        if (!window.gameEngine) return { totalShares: 0, totalValue: 0, projectsCount: 0 };
        
        const player = gameEngine.player;
        let totalShares = 0;
        let totalValue = 0;
        let projectsCount = player.ventures.length;

        player.ventures.forEach(venture => {
            // Convert equity percentage to shares (simplified calculation)
            const shares = Math.round(venture.equity * 100);
            totalShares += shares;
            totalValue += venture.value;
        });

        return { totalShares, totalValue, projectsCount };
    }

    getPlayerSharesData() {
        if (!window.gameEngine) return [];
        
        const sharesData = [];
        gameEngine.player.ventures.forEach(venture => {
            const project = this.projects.find(p => p.name === venture.name) || {
                name: venture.name,
                totalShares: 1000,
                status: 'active'
            };

            const shares = Math.round(venture.equity * 100);
            const equityPercent = venture.equity;
            const value = venture.value;

            sharesData.push({
                project: venture.name,
                shares: shares,
                equityPercent: equityPercent,
                value: value,
                status: project.status
            });
        });

        return sharesData;
    }

    getPlayerRank() {
        const playerShares = this.calculatePlayerShares();
        const playerName = window.authManager && !authManager.currentUser.isGuest ? 
            authManager.currentUser.name : 'Guest';
            
        const rank = this.leaderboard.findIndex(player => player.name === playerName);
        return rank !== -1 ? rank + 1 : this.leaderboard.length + 1;
    }

    updateLeaderboard() {
        this.generateLeaderboard();
    }
}

// Global functions for the new windows
function openSharesWindow() {
    if (!window.dataManager) {
        gameEngine.showNotification('Data manager not loaded', 'error');
        return;
    }
    
    if (window.authManager && authManager.currentUser.isGuest) {
        gameEngine.showNotification('Please login to view your shares', 'error');
        openWindow('authWindow');
        return;
    }
    
    loadSharesData();
    openWindow('sharesWindow');
}

function openProjectsWindow() {
    if (!window.dataManager) {
        gameEngine.showNotification('Data manager not loaded', 'error');
        return;
    }
    
    loadProjectsData();
    openWindow('projectsWindow');
}

function openLeaderboardWindow() {
    if (!window.dataManager) {
        gameEngine.showNotification('Data manager not loaded', 'error');
        return;
    }
    
    loadLeaderboardData();
    openWindow('leaderboardWindow');
}

function loadSharesData() {
    const sharesData = dataManager.getPlayerSharesData();
    const playerShares = dataManager.calculatePlayerShares();
    
    // Update summary
    document.getElementById('totalShares').textContent = playerShares.totalShares.toLocaleString();
    document.getElementById('totalEquityValue').textContent = `$${playerShares.totalValue.toLocaleString()}`;
    document.getElementById('activeProjects').textContent = playerShares.projectsCount;
    
    // Update table
    const tableBody = document.getElementById('sharesTableBody');
    tableBody.innerHTML = sharesData.map(share => `
        <tr>
            <td>${share.project}</td>
            <td class="share-value">${share.shares.toLocaleString()}</td>
            <td class="share-percent">${share.equityPercent.toFixed(2)}%</td>
            <td class="share-value">$${share.value.toLocaleString()}</td>
            <td><span class="status-badge status-${share.status}">${share.status.toUpperCase()}</span></td>
        </tr>
    `).join('');
    
    if (sharesData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #666; padding: 40px;">
                    No shares yet. Join ventures to start earning shares!
                </td>
            </tr>
        `;
    }
}

function loadProjectsData() {
    const projectsGrid = document.getElementById('projectsGrid');
    projectsGrid.innerHTML = dataManager.projects.map(project => `
        <div class="project-card">
            <div class="project-header">
                <div class="project-icon">${project.icon}</div>
                <div class="project-info">
                    <h3>${project.name}</h3>
                    <div class="project-meta">
                        <span>${project.type}</span>
                        <span>CEO: ${project.ceo}</span>
                        <span>Team: ${project.teamSize} members</span>
                    </div>
                </div>
            </div>
            
            <p style="color: #ccc; margin-bottom: 15px;">${project.description}</p>
            
            <div class="project-progress">
                <div class="progress-info">
                    <span>Funding Progress</span>
                    <span>${project.progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress}%"></div>
                </div>
            </div>
            
            <div class="project-stats">
                <div class="project-stat">
                    <div class="project-stat-value">${project.fundedShares.toLocaleString()}</div>
                    <div class="project-stat-label">Shares Funded</div>
                </div>
                <div class="project-stat">
                    <div class="project-stat-value">$${(project.valuation / 1000).toFixed(0)}K</div>
                    <div class="project-stat-label">Valuation</div>
                </div>
                <div class="project-stat">
                    <div class="project-stat-value">${project.estimatedCompletion}</div>
                    <div class="project-stat-label">Est. Completion</div>
                </div>
            </div>
        </div>
    `).join('');
}

function loadLeaderboardData() {
    dataManager.updateLeaderboard();
    
    const tableBody = document.getElementById('leaderboardTableBody');
    const currentPlayerName = window.authManager && !authManager.currentUser.isGuest ? 
        authManager.currentUser.name : null;
    
    tableBody.innerHTML = dataManager.leaderboard.map((player, index) => {
        const isCurrentPlayer = player.name === currentPlayerName;
        const rankClass = index < 3 ? `rank-${index + 1}` : '';
        
        return `
            <tr class="${isCurrentPlayer ? 'current-player' : ''}">
                <td class="${rankClass}">#${index + 1}</td>
                <td class="${rankClass}">${player.name} ${isCurrentPlayer ? ' (You)' : ''}</td>
                <td>${player.shares.toLocaleString()}</td>
                <td>$${player.equityValue.toLocaleString()}</td>
                <td>${player.projects}</td>
                <td>${player.level}</td>
            </tr>
        `;
    }).join('');
    
    // Update stats
    document.getElementById('playerRank').textContent = `#${dataManager.getPlayerRank()}`;
    document.getElementById('totalPlayers').textContent = dataManager.leaderboard.length;
}

function changeLeaderboardFilter(filter) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Sort leaderboard based on filter
    switch(filter) {
        case 'shares':
            dataManager.leaderboard.sort((a, b) => b.shares - a.shares);
            break;
        case 'equity':
            dataManager.leaderboard.sort((a, b) => b.equityValue - a.equityValue);
            break;
        case 'projects':
            dataManager.leaderboard.sort((a, b) => b.projects - a.projects);
            break;
    }
    
    loadLeaderboardData();
}

// Initialize data manager
let dataManager;
document.addEventListener('DOMContentLoaded', () => {
    dataManager = new DataManager();
    window.dataManager = dataManager;
});