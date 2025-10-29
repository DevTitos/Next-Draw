// Infinite Loop Maze - Strategic Break Point Game
class InfiniteMaze {
    constructor() {
        this.isActive = false;
        this.currentLayer = 1;
        this.totalLayers = 10;
        this.breakPointLayer = 0;
        this.playerAttempts = 0;
        this.mazeContainer = null;
        this.challenges = [];
        this.init();
    }

    init() {
        console.log('🔄 Initializing Infinite Maze...');
        
        // Create maze container
        this.mazeContainer = document.createElement('div');
        this.mazeContainer.id = 'infiniteMazeContainer';
        this.mazeContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, #0a0a2a 0%, #000 100%);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: 'Courier New', monospace;
            color: white;
        `;
        document.body.appendChild(this.mazeContainer);
        
        // Generate random break point
        this.breakPointLayer = Math.floor(Math.random() * this.totalLayers) + 1;
        console.log(`🎯 Break Point: Layer ${this.breakPointLayer}`);
        
        // Generate challenges
        this.generateChallenges();
        
        console.log('✅ Infinite Maze Ready!');
    }

    generateChallenges() {
        this.challenges = [
            {
                type: 'logic',
                question: "If a venture grows 20% monthly, how many months to 5x?",
                options: ["9 months", "11 months", "13 months", "15 months"],
                correct: 0,
                hint: "Use compound growth formula"
            },
            {
                type: 'strategy',
                question: "Best market entry for African fintech?",
                options: ["Rural unbanked", "Urban youth", "Small businesses", "All segments"],
                correct: 3,
                hint: "Diversified approach reduces risk"
            },
            {
                type: 'math',
                question: "Calculate customer lifetime value: $50/month, 2 year retention",
                options: ["$600", "$800", "$1200", "$2400"],
                correct: 2,
                hint: "Multiply monthly revenue by months"
            },
            {
                type: 'ethics',
                question: "Founder wants 60% equity. Fair counter-offer?",
                options: ["40% founder, 60% investors", "60% founder, 40% investors", "70% founder, 30% investors", "50/50 split"],
                correct: 1,
                hint: "Founder should maintain control"
            },
            {
                type: 'analysis',
                question: "Competitor has 80% market share. Your move?",
                options: ["Direct competition", "Niche market", "Partnership", "Innovate"],
                correct: 1,
                hint: "Find underserved segments"
            }
        ];
    }

    start() {
        if (!window.gameEngine || !gameEngine.isInitialized) {
            this.showNotification('❌ Game not ready', 'error');
            return;
        }

        if (this.isActive) return;

        // Check tickets
        if (gameEngine.player.tickets <= 0) {
            this.showNotification('🎫 Need 1 ticket to enter maze', 'error');
            if (window.openWindow) openWindow('shopWindow');
            return;
        }

        // Use ticket
        gameEngine.player.tickets--;
        gameEngine.updateUI();

        this.isActive = true;
        this.currentLayer = 1;
        this.playerAttempts = 0;
        this.mazeContainer.style.display = 'flex';
        
        // Generate new break point each game
        this.breakPointLayer = Math.floor(Math.random() * this.totalLayers) + 1;
        
        this.showLayer();
        this.showNotification('🌀 INFINITE MAZE STARTED! Find the break point!', 'success');
        
        if (window.authManager) {
            authManager.addActivity('🌀', 'Entered Infinite Maze');
        }
    }

    showLayer() {
        if (!this.isActive) return;

        const challenge = this.getRandomChallenge();
        const isBreakPoint = this.currentLayer === this.breakPointLayer;
        
        this.mazeContainer.innerHTML = `
            <div class="maze-layer" style="
                background: rgba(10, 20, 40, 0.95);
                border: 3px solid ${isBreakPoint ? '#ffd700' : '#00ff88'};
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 50px ${isBreakPoint ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 255, 136, 0.3)'};
            ">
                <div style="margin-bottom: 20px;">
                    <h2 style="color: ${isBreakPoint ? '#ffd700' : '#00ff88'}; margin-bottom: 10px;">
                        ${isBreakPoint ? '🎯 BREAK POINT!' : '🌀 INFINITE MAZE'}
                    </h2>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Layer ${this.currentLayer} of ${this.totalLayers} • Attempts: ${this.playerAttempts}
                    </div>
                </div>

                <div style="
                    background: rgba(0, 255, 136, 0.1);
                    border: 2px solid #00ff88;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <h3 style="color: #00ff88; margin-bottom: 15px;">STRATEGIC CHALLENGE</h3>
                    <p style="color: #ccc; margin-bottom: 20px; line-height: 1.4;">${challenge.question}</p>
                    
                    <div style="display: grid; gap: 10px;">
                        ${challenge.options.map((option, index) => `
                            <button onclick="infiniteMaze.submitAnswer(${index})" 
                                    style="background: rgba(255, 255, 255, 0.05);
                                           border: 2px solid #333;
                                           color: white;
                                           padding: 12px;
                                           border-radius: 8px;
                                           cursor: pointer;
                                           font-family: 'Courier New', monospace;
                                           transition: all 0.3s;">
                                ${option}
                            </button>
                        `).join('')}
                    </div>
                    
                    <div style="margin-top: 15px; color: #666; font-size: 0.8em;">
                        💡 ${challenge.hint}
                    </div>
                </div>

                ${isBreakPoint ? `
                    <div style="
                        background: rgba(255, 215, 0, 0.2);
                        border: 2px solid #ffd700;
                        border-radius: 10px;
                        padding: 15px;
                        margin-bottom: 15px;
                        color: #ffd700;
                    ">
                        🎉 THIS IS THE BREAK POINT! Solve correctly to escape!
                    </div>
                ` : ''}

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="infiniteMaze.showHint()" 
                            style="background: rgba(0, 153, 255, 0.2);
                                   border: 2px solid #0099ff;
                                   color: #0099ff;
                                   padding: 8px 15px;
                                   border-radius: 5px;
                                   cursor: pointer;">
                        💡 Hint
                    </button>
                    <button onclick="infiniteMaze.exit()" 
                            style="background: rgba(255, 68, 68, 0.2);
                                   border: 2px solid #ff4444;
                                   color: #ff4444;
                                   padding: 8px 15px;
                                   border-radius: 5px;
                                   cursor: pointer;">
                        🚪 Exit
                    </button>
                </div>

                <div style="margin-top: 20px; color: #666; font-size: 0.8em;">
                    ${this.getLayerProgress()}
                </div>
            </div>
        `;
    }

    getRandomChallenge() {
        return this.challenges[Math.floor(Math.random() * this.challenges.length)];
    }

    getLayerProgress() {
        const progress = (this.currentLayer / this.totalLayers) * 100;
        const breakPointDistance = Math.abs(this.currentLayer - this.breakPointLayer);
        
        let hint = '';
        if (breakPointDistance <= 2) {
            hint = '🎯 Break point is very close!';
        } else if (breakPointDistance <= 5) {
            hint = '🔍 Break point is nearby...';
        } else {
            hint = '🌀 Keep searching through the layers...';
        }
        
        return `${hint} • Progress: ${Math.round(progress)}%`;
    }

    submitAnswer(selectedIndex) {
        if (!this.isActive) return;

        this.playerAttempts++;
        const challenge = this.getRandomChallenge();
        const isCorrect = selectedIndex === challenge.correct;
        const isBreakPoint = this.currentLayer === this.breakPointLayer;

        if (isCorrect) {
            if (isBreakPoint) {
                // Player found and solved the break point!
                this.escapeMaze();
            } else {
                // Correct answer, advance to next layer
                this.currentLayer++;
                if (this.currentLayer > this.totalLayers) {
                    this.currentLayer = 1; // Loop back to start
                }
                this.showLayer();
                this.showNotification('✅ Correct! Advancing to next layer...', 'success');
                
                // Small reward for correct answers
                if (window.authManager) {
                    authManager.addXP(5);
                }
            }
        } else {
            // Wrong answer - strategic penalty
            const penalty = this.calculatePenalty();
            this.showNotification(`💥 Wrong! ${penalty}`, 'error');
            
            // Small XP for trying
            if (window.authManager) {
                authManager.addXP(1);
            }
        }
    }

    calculatePenalty() {
        const penalties = [
            "Looping back 1 layer",
            "Lost 1 attempt",
            "Next challenge harder",
            "Time penalty applied"
        ];
        return penalties[Math.floor(Math.random() * penalties.length)];
    }

    escapeMaze() {
        this.showNotification('🎊 MAZE ESCAPED! You found the break point!', 'success');
        
        // Big rewards for escaping
        if (window.gameEngine) {
            const rewardTickets = Math.max(3, 10 - this.playerAttempts); // More tickets for fewer attempts
            gameEngine.player.tickets += rewardTickets;
            gameEngine.updateUI();
        }
        
        if (window.authManager) {
            authManager.addXP(100);
            authManager.addActivity('🏆', `Escaped Infinite Maze in ${this.playerAttempts} attempts`);
        }
        
        this.exit();
    }

    showHint() {
        const challenge = this.getRandomChallenge();
        this.showNotification(`💡 Hint: ${challenge.hint}`, 'info');
    }

    exit() {
        this.isActive = false;
        this.mazeContainer.style.display = 'none';
        
        if (window.gameEngine) {
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
            background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#0099ff'};
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
const infiniteMaze = new InfiniteMaze();