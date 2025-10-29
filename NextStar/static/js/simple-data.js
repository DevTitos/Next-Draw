// Simple Data Manager for Shares and Leaderboard
class SimpleDataManager {
    constructor() {
        this.projects = [];
        this.players = [];
        this.init();
    }

    init() {
        this.createSampleData();
        console.log('✅ Simple Data Manager Ready');
    }

    createSampleData() {
        // Sample projects
        this.projects = [
            {
                id: 1,
                name: 'Solar Africa',
                icon: '⚡',
                progress: 75,
                shares: 10000,
                funded: 7500,
                value: 2500000,
                ceo: 'SolarMaster',
                status: 'active'
            },
            {
                id: 2,
                name: 'FinTech Kenya',
                icon: '💰',
                progress: 45,
                shares: 8000,
                funded: 3600,
                value: 1800000,
                ceo: 'FinWizard',
                status: 'active'
            },
            {
                id: 3,
                name: 'AgriTech Ghana',
                icon: '🌱',
                progress: 90,
                shares: 6000,
                funded: 5400,
                value: 1200000,
                ceo: 'GreenThumb',
                status: 'active'
            }
        ];

        // Sample players
        this.players = [
            { name: 'QuantumInvestor', shares: 1250, value: 62500, projects: 8, level: 15 },
            { name: 'StarBuilder', shares: 980, value: 49000, projects: 6, level: 12 },
            { name: 'VentureMaster', shares: 875, value: 43750, projects: 7, level: 11 },
            { name: 'EquityHunter', shares: 720, value: 36000, projects: 5, level: 10 },
            { name: 'FutureBuilder', shares: 650, value: 32500, projects: 4, level: 9 },
            { name: 'TechPioneer', shares: 580, value: 29000, projects: 5, level: 8 }
        ];
    }

    getPlayerShares() {
        if (!window.gameEngine) return { total: 0, value: 0, projects: 0 };
        
        let totalShares = 0;
        let totalValue = 0;
        
        gameEngine.player.ventures.forEach(venture => {
            totalShares += Math.round(venture.equity * 100);
            totalValue += venture.value;
        });

        return {
            total: totalShares,
            value: totalValue,
            projects: gameEngine.player.ventures.length
        };
    }

    getPlayerRank() {
        const playerShares = this.getPlayerShares();
        const playerName = window.authManager?.currentUser?.name || 'Guest';
        
        // Add current player to rankings
        const allPlayers = [...this.players];
        if (window.authManager && !authManager.currentUser.isGuest) {
            allPlayers.push({
                name: playerName,
                shares: playerShares.total,
                value: playerShares.value,
                projects: playerShares.projects,
                level: authManager.currentUser.level
            });
        }

        // Sort by shares
        allPlayers.sort((a, b) => b.shares - a.shares);
        
        const rank = allPlayers.findIndex(p => p.name === playerName);
        return rank !== -1 ? rank + 1 : allPlayers.length + 1;
    }

    getLeaderboard(sortBy = 'shares') {
        const allPlayers = [...this.players];
        
        // Add current player if authenticated
        if (window.authManager && !authManager.currentUser.isGuest) {
            const playerShares = this.getPlayerShares();
            allPlayers.push({
                name: authManager.currentUser.name,
                shares: playerShares.total,
                value: playerShares.value,
                projects: playerShares.projects,
                level: authManager.currentUser.level
            });
        }

        // Sort based on criteria
        switch(sortBy) {
            case 'shares':
                allPlayers.sort((a, b) => b.shares - a.shares);
                break;
            case 'value':
                allPlayers.sort((a, b) => b.value - a.value);
                break;
            case 'projects':
                allPlayers.sort((a, b) => b.projects - a.projects);
                break;
        }

        return allPlayers;
    }
}

// Create global instance
const simpleData = new SimpleDataManager();