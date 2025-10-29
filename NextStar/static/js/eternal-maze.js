// Eternal Maze - Infinite Loop Without Escape Hints
class EternalMaze {
    constructor() {
        this.isActive = false;
        this.currentLayer = 1;
        this.totalLayers = 1000; // Essentially infinite
        this.escapeLayer = 0;
        this.timeInMaze = 0;
        this.layersVisited = new Set();
        this.mazeContainer = null;
        this.challenges = [];
        this.init();
    }

    init() {
        console.log('🌀 Initializing Eternal Maze...');
        
        // Create maze container
        this.mazeContainer = document.createElement('div');
        this.mazeContainer.id = 'eternalMazeContainer';
        this.mazeContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%),
                #0a0a1a;
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: 'Courier New', monospace;
            color: #00ff88;
        `;
        document.body.appendChild(this.mazeContainer);
        
        // Generate random escape layer (very rare)
        this.escapeLayer = this.generateEscapeLayer();
        console.log(`🎯 Escape Layer: ${this.escapeLayer} (1 in 1000 chance)`);
        
        this.generateEternalChallenges();
        
        // Start maze time tracking
        setInterval(() => {
            if (this.isActive) this.timeInMaze++;
        }, 1000);
        
        console.log('✅ Eternal Maze Ready - May you find your way...');
    }

    generateEscapeLayer() {
        // 0.1% chance layer - truly rare
        return Math.floor(Math.random() * 1000) + 1;
    }

    generateEternalChallenges() {
        this.challenges = [
            {
                question: "The market shifts unpredictably. Do you:",
                options: ["Pivot immediately", "Stay the course", "Analyze deeper", "Expand anyway"]
            },
            {
                question: "Resources are limited. Allocate to:",
                options: ["Marketing blitz", "Product development", "Team training", "Cash reserve"]
            },
            {
                question: "Competitor emerges. Your response:",
                options: ["Price war", "Feature race", "Partnership", "Ignore"]
            },
            {
                question: "Growth plateaus. Next move:",
                options: ["Acquire users", "Monetize existing", "Expand globally", "Innovate product"]
            },
            {
                question: "Team morale drops. You:",
                options: ["Increase pay", "Share vision", "Restructure", "Hire new"]
            },
            {
                question: "Investor demands results. You:",
                options: ["Show metrics", "Ask for time", "Pivot strategy", "Seek alternatives"]
            },
            {
                question: "Technology disrupts. Do you:",
                options: ["Adopt quickly", "Wait and see", "Build defensive", "Acquire capability"]
            },
            {
                question: "Customer churn increases. Action:",
                options: ["Discount offers", "Improve service", "Research causes", "Target new markets"]
            }
        ];
    }

    start() {
        if (!window.gameEngine || !gameEngine.isInitialized) {
            return;
        }

        if (this.isActive) return;

        // Check tickets
        if (gameEngine.player.tickets <= 0) {
            if (window.openWindow) openWindow('shopWindow');
            return;
        }

        // Use ticket silently
        gameEngine.player.tickets--;
        gameEngine.updateUI();

        this.isActive = true;
        this.currentLayer = 1;
        this.timeInMaze = 0;
        this.layersVisited.clear();
        this.mazeContainer.style.display = 'flex';
        
        // New escape point each entry
        this.escapeLayer = this.generateEscapeLayer();
        
        this.showLayer();
        
        if (window.authManager) {
            authManager.addActivity('🌀', 'Entered the Eternal Maze');
        }
    }

    showLayer() {
        if (!this.isActive) return;

        const challenge = this.getRandomChallenge();
        const isEscapeLayer = this.currentLayer === this.escapeLayer;
        this.layersVisited.add(this.currentLayer);
        
        const layerText = this.generateLayerText();
        const timeText = this.formatTimeInMaze();

        this.mazeContainer.innerHTML = `
            <div class="eternal-layer" style="
                background: rgba(5, 10, 20, 0.95);
                border: 2px solid ${isEscapeLayer ? '#ffd700' : '#004400'};
                border-radius: 10px;
                padding: 25px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            ">
                <div style="margin-bottom: 20px; color: #00ff88;">
                    <div style="font-size: 0.9em; opacity: 0.7; margin-bottom: 5px;">
                        LAYER ${this.currentLayer} • ${timeText}
                    </div>
                    <div style="font-size: 0.8em; opacity: 0.5;">
                        ${layerText}
                    </div>
                </div>

                <div style="
                    background: rgba(0, 255, 136, 0.05);
                    border: 1px solid #003300;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <div style="color: #00ff88; margin-bottom: 15px; font-size: 1.1em;">
                        ${challenge.question}
                    </div>
                    
                    <div style="display: grid; gap: 8px;">
                        ${challenge.options.map((option, index) => `
                            <button onclick="eternalMaze.choosePath(${index})" 
                                    style="background: rgba(0, 68, 0, 0.3);
                                           border: 1px solid #002200;
                                           color: #00cc00;
                                           padding: 10px;
                                           border-radius: 5px;
                                           cursor: pointer;
                                           font-family: 'Courier New', monospace;
                                           font-size: 0.9em;
                                           transition: all 0.3s;">
                                ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="color: #004400; font-size: 0.8em; margin-top: 15px;">
                    ${this.getMazeStatus()}
                </div>

                <button onclick="eternalMaze.exit()" 
                        style="background: rgba(255, 68, 68, 0.1);
                               border: 1px solid #330000;
                               color: #660000;
                               padding: 8px 15px;
                               border-radius: 5px;
                               cursor: pointer;
                               margin-top: 15px;
                               font-size: 0.8em;">
                    ⚡ Attempt Escape
                </button>
            </div>
        `;
    }

    generateLayerText() {
        const texts = [
            "The path twists endlessly...",
            "Another corridor, similar to the last...",
            "The walls shift imperceptibly...",
            "Echoes of previous travelers...",
            "Time flows differently here...",
            "Patterns repeat with variations...",
            "The maze watches and waits...",
            "Decisions ripple through the void..."
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    }

    formatTimeInMaze() {
        const hours = Math.floor(this.timeInMaze / 3600);
        const minutes = Math.floor((this.timeInMaze % 3600) / 60);
        const seconds = this.timeInMaze % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getRandomChallenge() {
        return this.challenges[Math.floor(Math.random() * this.challenges.length)];
    }

    getMazeStatus() {
        const statuses = [
            `${this.layersVisited.size} layers explored`,
            "The exit remains hidden...",
            "Continue your journey",
            "The maze continues endlessly",
            "Search for patterns",
            "Trust your instincts",
            "The way forward is unclear",
            "Perseverance is key"
        ];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    choosePath(choiceIndex) {
        if (!this.isActive) return;

        const isEscapeLayer = this.currentLayer === this.escapeLayer;
        const isEscapeChoice = this.isEscapeChoice(choiceIndex);

        if (isEscapeLayer && isEscapeChoice) {
            // Player has found the escape!
            this.escape();
        } else {
            // Continue wandering
            this.advanceLayer();
        }
    }

    isEscapeChoice(choiceIndex) {
        // Escape requires specific choice pattern on escape layer
        const escapePattern = this.escapeLayer % 4; // Different pattern for each escape layer
        return choiceIndex === escapePattern;
    }

    advanceLayer() {
        // Move to next layer - sometimes forward, sometimes random
        if (Math.random() < 0.3) {
            // 30% chance to jump randomly
            this.currentLayer = Math.floor(Math.random() * this.totalLayers) + 1;
        } else {
            // 70% chance to move forward (with occasional loops)
            this.currentLayer++;
            if (this.currentLayer > this.totalLayers) {
                this.currentLayer = 1; // Loop back to beginning
            }
        }
        
        this.showLayer();
    }

    escape() {
        // Calculate reward based on time spent
        const baseReward = 5;
        const timeBonus = Math.max(1, Math.floor(this.timeInMaze / 300)); // Bonus for persistence
        const totalReward = baseReward + timeBonus;
        
        // Silent success - no big celebration
        if (window.gameEngine) {
            gameEngine.player.tickets += totalReward;
            gameEngine.updateUI();
        }
        
        if (window.authManager) {
            const xp = 50 + (timeBonus * 10);
            authManager.addXP(xp);
            authManager.addActivity('🎯', `Escaped Eternal Maze after ${this.formatTimeInMaze()}`);
        }
        
        this.exit();
    }

    exit() {
        this.isActive = false;
        this.mazeContainer.style.display = 'none';
    }
}

// Create global instance
const eternalMaze = new EternalMaze();