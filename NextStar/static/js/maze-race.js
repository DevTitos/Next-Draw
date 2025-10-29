// Simple 3D Maze Race - Fixed Version
class MazeRace {
    constructor() {
        this.isActive = false;
        this.currentStep = 0;
        this.totalSteps = 5;
        this.mazeContainer = null;
        this.init();
    }

    init() {
        console.log('🔄 Initializing Maze Race...');
        
        // Create maze UI container (hidden by default)
        this.mazeContainer = document.createElement('div');
        this.mazeContainer.id = 'mazeRaceContainer';
        this.mazeContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: 'Courier New', monospace;
        `;
        document.body.appendChild(this.mazeContainer);
        
        console.log('✅ Maze Race Initialized!');
    }

    start() {
        // Check if game engine is ready
        if (!window.gameEngine || !gameEngine.isInitialized) {
            this.showNotification('❌ Game not loaded yet. Please wait...', 'error');
            return;
        }

        if (this.isActive) {
            this.showNotification('Maze race already active!', 'info');
            return;
        }
        
        // Check tickets
        if (gameEngine.player.tickets <= 0) {
            this.showNotification('You need at least 1 ticket to enter the maze!', 'error');
            if (window.openWindow) {
                openWindow('shopWindow');
            }
            return;
        }
        
        // Use one ticket for maze entry
        gameEngine.player.tickets--;
        gameEngine.updateUI();
        
        this.isActive = true;
        this.currentStep = 0;
        this.mazeContainer.style.display = 'flex';
        this.showStep();

        // Add activity
        if (window.authManager) {
            authManager.addActivity('🌀', 'Entered Strategy Maze Race');
        }
        
        this.showNotification('🚀 Maze Race Started! Make strategic choices!', 'success');
    }

    showStep() {
        if (!this.isActive) return;

        const mazeData = this.generateStepData(this.currentStep);
        
        this.mazeContainer.innerHTML = `
            <div class="maze-window" style="
                background: #1a1a2a;
                border: 3px solid #00ff88;
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                color: white;
                text-align: center;
                box-shadow: 0 20px 50px rgba(0, 255, 136, 0.3);
            ">
                <h2 style="color: #00ff88; margin-bottom: 20px;">🚀 STRATEGY MAZE RACE</h2>
                
                <div class="progress" style="margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Step ${this.currentStep + 1} of ${this.totalSteps}</span>
                        <span>${Math.round((this.currentStep / this.totalSteps) * 100)}% Complete</span>
                    </div>
                    <div style="background: #333; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #00ff88, #0099ff); height: 100%; width: ${(this.currentStep / this.totalSteps) * 100}%; transition: width 0.5s;"></div>
                    </div>
                </div>

                <div style="background: rgba(0, 255, 136, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                    <h3 style="color: #00ff88; margin-bottom: 15px;">Choose Your Path:</h3>
                    <p style="color: #ccc; margin-bottom: 20px;">${mazeData.description}</p>
                    
                    <div style="display: grid; gap: 15px;">
                        ${mazeData.choices.map((choice, index) => `
                            <button onclick="mazeRace.selectChoice(${index})" 
                                    style="background: ${choice.isCorrect ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)'};
                                           border: 2px solid ${choice.isCorrect ? '#00ff88' : '#ff4444'};
                                           color: white;
                                           padding: 15px;
                                           border-radius: 8px;
                                           cursor: pointer;
                                           font-family: 'Courier New', monospace;
                                           font-size: 16px;
                                           transition: all 0.3s;">
                                <div style="font-weight: bold; margin-bottom: 5px;">${choice.direction}</div>
                                <div style="font-size: 14px; opacity: 0.8;">${choice.outcome}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <button onclick="mazeRace.exit()" 
                        style="background: rgba(255, 68, 68, 0.2); 
                               border: 2px solid #ff4444; 
                               color: #ff4444; 
                               padding: 10px 20px; 
                               border-radius: 5px; 
                               cursor: pointer;
                               font-family: 'Courier New', monospace;">
                    🚪 Exit Maze
                </button>
            </div>
        `;
    }

    generateStepData(step) {
        const scenarios = [
            {
                description: "You enter a crystal chamber with two glowing portals. One shimmers with blue energy, the other pulses with red light.",
                choices: [
                    {
                        direction: "🌀 BLUE PORTAL",
                        outcome: "Teleports you forward safely",
                        isCorrect: true
                    },
                    {
                        direction: "🔴 RED PORTAL", 
                        outcome: "Triggers security traps",
                        isCorrect: false
                    }
                ]
            },
            {
                description: "The path splits around a massive energy core. Left path has stable bridges, right path has floating platforms.",
                choices: [
                    {
                        direction: "🌉 LEFT BRIDGE",
                        outcome: "Stable but longer route",
                        isCorrect: false
                    },
                    {
                        direction: "⚡ RIGHT PLATFORMS",
                        outcome: "Risky but fast track",
                        isCorrect: true
                    }
                ]
            },
            {
                description: "You find a data terminal with two access codes. One grants admin privileges, the other triggers lockdown.",
                choices: [
                    {
                        direction: "🔑 CODE ALPHA",
                        outcome: "Admin access - open all doors",
                        isCorrect: true
                    },
                    {
                        direction: "🚨 CODE OMEGA",
                        outcome: "Security lockdown activated",
                        isCorrect: false
                    }
                ]
            },
            {
                description: "A quantum tunnel branches into two realities. One shows success, the other shows failure.",
                choices: [
                    {
                        direction: "📈 REALITY A",
                        outcome: "Shows venture success path",
                        isCorrect: true
                    },
                    {
                        direction: "📉 REALITY B",
                        outcome: "Shows bankruptcy warning",
                        isCorrect: false
                    }
                ]
            },
            {
                description: "Final challenge! Two investment strategies. One is aggressive growth, the other is safe but slow.",
                choices: [
                    {
                        direction: "🚀 AGGRESSIVE",
                        outcome: "High risk, high reward",
                        isCorrect: true
                    },
                    {
                        direction: "🛡️ CONSERVATIVE",
                        outcome: "Safe but limited growth",
                        isCorrect: false
                    }
                ]
            }
        ];

        return scenarios[step] || scenarios[0];
    }

    selectChoice(choiceIndex) {
        if (!this.isActive) return;

        const mazeData = this.generateStepData(this.currentStep);
        const choice = mazeData.choices[choiceIndex];

        if (choice.isCorrect) {
            this.currentStep++;
            
            if (this.currentStep >= this.totalSteps) {
                this.completeMaze();
            } else {
                this.showStep();
                this.showNotification('✅ Correct choice! Advancing...', 'success');
                
                // Add small reward for correct choice
                if (window.gameEngine && gameEngine.isInitialized) {
                    gameEngine.player.tickets += 1;
                    gameEngine.updateUI();
                }
            }
        } else {
            this.showNotification('💥 Wrong choice! Try again.', 'error');
            // Player stays on current step to try again
        }
    }

    completeMaze() {
        this.showNotification('🎉 MAZE COMPLETED! You won 5 Star Tickets!', 'success');
        
        // Big reward for completion
        if (window.gameEngine && gameEngine.isInitialized) {
            gameEngine.player.tickets += 5;
            gameEngine.updateUI();
            
            if (window.authManager) {
                authManager.addXP(100);
                authManager.addActivity('🏆', 'Completed Strategy Maze Race');
            }
        }
        
        this.exit();
    }

    exit() {
        this.isActive = false;
        this.mazeContainer.style.display = 'none';
        
        if (window.gameEngine && gameEngine.isInitialized) {
            gameEngine.showNotification('Returned to main game', 'info');
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#00ff88' : '#ff4444'};
            color: ${type === 'success' ? '#000' : '#fff'};
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10001;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Create global instance
const mazeRace = new MazeRace();