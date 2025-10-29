// CEO Matrix - Only for Strategic Masterminds
class CEOMatrix {
    constructor() {
        this.isActive = false;
        this.currentPhase = 1;
        this.totalPhases = 7; // 7 phases of CEO mastery
        this.ceoScore = 100; // Start with perfect score
        this.strategicDecisions = [];
        this.longTermVision = [];
        this.matrixContainer = null;
        this.phaseData = [];
        this.init();
    }

    init() {
        console.log('🏢 Initializing CEO Proving Ground...');
        
        this.matrixContainer = document.createElement('div');
        this.matrixContainer.id = 'ceoMatrixContainer';
        this.matrixContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 20%, rgba(0, 255, 136, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(0, 153, 255, 0.1) 0%, transparent 50%),
                #0a1a2a;
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: 'Courier New', monospace;
            color: #00ff88;
        `;
        document.body.appendChild(this.matrixContainer);
        
        this.generateCEOPhases();
        console.log('✅ CEO Matrix Ready - Only the worthy shall pass');
    }

    generateCEOPhases() {
        this.phaseData = [
            {
                phase: 1,
                title: "FOUNDATION VISION",
                challenge: "Define your 10-year company vision. What legacy will you build?",
                decisions: [
                    { text: "Disrupt existing markets with radical innovation", score: 8, longTerm: true },
                    { text: "Incremental improvement in proven markets", score: 5, longTerm: false },
                    { text: "Copy successful business models with better execution", score: 3, longTerm: false },
                    { text: "Focus on quick profitability and exit strategy", score: 2, longTerm: false }
                ],
                perfectChoice: 0
            },
            {
                phase: 2,
                title: "TEAM ARCHITECTURE", 
                challenge: "Build your founding team. What talent mix ensures long-term success?",
                decisions: [
                    { text: "Hire visionaries who challenge your thinking", score: 9, longTerm: true },
                    { text: "Balance experienced operators with young innovators", score: 7, longTerm: true },
                    { text: "Focus on technical excellence above all", score: 4, longTerm: false },
                    { text: "Hire for immediate skill gaps only", score: 2, longTerm: false }
                ],
                perfectChoice: 0
            },
            {
                phase: 3,
                title: "CAPITAL STRATEGY",
                challenge: "Choose your funding approach for sustainable 10-year growth",
                decisions: [
                    { text: "Bootstrap to maintain control and vision integrity", score: 8, longTerm: true },
                    { text: "Strategic investors who add industry expertise", score: 7, longTerm: true },
                    { text: "Maximize valuation with aggressive VC funding", score: 4, longTerm: false },
                    { text: "Focus on quick revenue over investment", score: 3, longTerm: false }
                ],
                perfectChoice: 1
            },
            {
                phase: 4,
                title: "MARKET TIMING",
                challenge: "When to launch? Early adoption vs. market readiness",
                decisions: [
                    { text: "Create the market - educate and lead", score: 9, longTerm: true },
                    { text: "Wait for clear signals then move decisively", score: 6, longTerm: false },
                    { text: "Follow early adopters with improved offering", score: 4, longTerm: false },
                    { text: "Wait for market maturity then compete on price", score: 2, longTerm: false }
                ],
                perfectChoice: 0
            },
            {
                phase: 5,
                title: "SCALING PHILOSOPHY",
                challenge: "How will you scale without losing company culture?",
                decisions: [
                    { text: "Culture-first scaling with systematic values integration", score: 9, longTerm: true },
                    { text: "Controlled growth with cultural gatekeeping", score: 7, longTerm: true },
                    { text: "Rapid scaling, fix culture issues later", score: 3, longTerm: false },
                    { text: "Outsource scaling to professional managers", score: 2, longTerm: false }
                ],
                perfectChoice: 0
            },
            {
                phase: 6,
                title: "CRISIS LEADERSHIP",
                challenge: "Major market crash hits. Your 5-year recovery strategy?",
                decisions: [
                    { text: "Double down on innovation while others retreat", score: 10, longTerm: true },
                    { text: "Preserve cash but maintain strategic investments", score: 7, longTerm: true },
                    { text: "Severe cost cutting across all departments", score: 3, longTerm: false },
                    { text: "Pivot to survival mode, abandon long-term goals", score: 1, longTerm: false }
                ],
                perfectChoice: 0
            },
            {
                phase: 7,
                title: "LEGACY DECISION",
                challenge: "After 15 years of success, what's your ultimate move?",
                decisions: [
                    { text: "Build an institution that outlives you", score: 10, longTerm: true },
                    { text: "Train successor and transition to board role", score: 8, longTerm: true },
                    { text: "Maximize shareholder value through acquisition", score: 4, longTerm: false },
                    { text: "Cash out and start new ventures", score: 2, longTerm: false }
                ],
                perfectChoice: 0
            }
        ];
    }

    start() {
        if (!window.gameEngine || !gameEngine.isInitialized) {
            return;
        }

        // Only allow players with proven track record
        if (gameEngine.player.ventures.length < 3) {
            this.showNotification("❌ Prove yourself with 3+ ventures first", "error");
            return;
        }

        if (this.isActive) return;

        if (gameEngine.player.tickets <= 0) {
            if (window.openWindow) openWindow('shopWindow');
            return;
        }

        // Use ticket
        gameEngine.player.tickets--;
        gameEngine.updateUI();

        this.isActive = true;
        this.currentPhase = 1;
        this.ceoScore = 100; // Perfect score to start
        this.strategicDecisions = [];
        this.longTermVision = [];
        this.matrixContainer.style.display = 'flex';
        
        this.showPhase();
        
        if (window.authManager) {
            authManager.addActivity('🏢', 'Entered CEO Proving Ground');
        }
    }

    showPhase() {
        if (!this.isActive) return;

        const phase = this.phaseData.find(p => p.phase === this.currentPhase);
        const progress = (this.currentPhase / this.totalPhases) * 100;
        const scoreColor = this.getScoreColor();

        this.matrixContainer.innerHTML = `
            <div class="ceo-phase" style="
                background: rgba(10, 30, 50, 0.95);
                border: 3px solid ${scoreColor};
                border-radius: 15px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 20px 50px rgba(0, 255, 136, 0.2);
            ">
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 0.9em; color: #0099ff; margin-bottom: 5px;">
                        PHASE ${this.currentPhase} of ${this.totalPhases}
                    </div>
                    <div style="font-size: 1.3em; font-weight: bold; color: ${scoreColor}; margin-bottom: 10px;">
                        ${phase.title}
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px; justify-content: center;">
                        <div style="font-size: 0.9em; color: #ccc;">
                            CEO SCORE: <strong style="color: ${scoreColor};">${this.ceoScore}/100</strong>
                        </div>
                        <div style="flex: 1; max-width: 200px; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; background: ${scoreColor}; width: ${progress}%;"></div>
                        </div>
                    </div>
                </div>

                <div style="
                    background: rgba(0, 255, 136, 0.1);
                    border: 2px solid ${scoreColor};
                    border-radius: 10px;
                    padding: 25px;
                    margin-bottom: 25px;
                ">
                    <div style="color: #00ff88; font-size: 1.1em; line-height: 1.4; margin-bottom: 20px;">
                        ${phase.challenge}
                    </div>
                    
                    <div style="display: grid; gap: 12px;">
                        ${phase.decisions.map((decision, index) => `
                            <button onclick="ceoMatrix.makeDecision(${index})" 
                                    style="background: rgba(255, 255, 255, 0.05);
                                           border: 2px solid #334455;
                                           color: #ccddee;
                                           padding: 15px;
                                           border-radius: 8px;
                                           cursor: pointer;
                                           font-family: 'Courier New', monospace;
                                           text-align: left;
                                           line-height: 1.3;
                                           transition: all 0.3s;">
                                ${decision.text}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="color: #666; font-size: 0.8em; text-align: center;">
                    ${this.getPhaseInsight()}
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="ceoMatrix.exit()" 
                            style="background: rgba(255, 68, 68, 0.2);
                                   border: 2px solid #ff4444;
                                   color: #ff4444;
                                   padding: 8px 20px;
                                   border-radius: 5px;
                                   cursor: pointer;
                                   font-size: 0.9em;">
                        🚪 Abandon Quest
                    </button>
                </div>
            </div>
        `;
    }

    getScoreColor() {
        if (this.ceoScore >= 90) return '#00ff88';
        if (this.ceoScore >= 80) return '#00cc66';
        if (this.ceoScore >= 70) return '#ffaa00';
        if (this.ceoScore >= 60) return '#ff6600';
        return '#ff4444';
    }

    getPhaseInsight() {
        const insights = [
            "True CEOs think in decades, not quarters",
            "Vision without execution is hallucination", 
            "Culture eats strategy for breakfast",
            "The best time to plant a tree was 20 years ago",
            "Sustainable growth requires patient capital",
            "Great companies are built to last generations",
            "Legacy is measured in impact, not income"
        ];
        return insights[this.currentPhase - 1] || insights[0];
    }

    makeDecision(choiceIndex) {
        if (!this.isActive) return;

        const phase = this.phaseData.find(p => p.phase === this.currentPhase);
        const decision = phase.decisions[choiceIndex];
        
        // Record decision
        this.strategicDecisions.push({
            phase: this.currentPhase,
            choice: decision.text,
            score: decision.score,
            isLongTerm: decision.longTerm
        });

        if (decision.longTerm) {
            this.longTermVision.push(decision);
        }

        // Update CEO score
        this.updateCEOScore(decision.score, choiceIndex === phase.perfectChoice);

        // Move to next phase or complete
        if (this.currentPhase < this.totalPhases) {
            this.currentPhase++;
            this.showPhase();
        } else {
            this.completeMatrix();
        }
    }

    updateCEOScore(decisionScore, isPerfectChoice) {
        const baseDeduction = 10 - decisionScore; // Perfect decision = 0 deduction
        const perfectBonus = isPerfectChoice ? 0 : 5; // Additional penalty for imperfect choices
        
        this.ceoScore -= (baseDeduction + perfectBonus);
        this.ceoScore = Math.max(0, this.ceoScore); // Don't go below 0
    }

    completeMatrix() {
        this.isActive = false;
        
        const passed = this.ceoScore >= 80; // Must maintain 80%+ score
        const longTermRatio = this.longTermVision.length / this.totalPhases;
        
        if (passed && longTermRatio >= 0.8) {
            this.becomeStarCEO();
        } else {
            this.failMatrix();
        }
    }

    becomeStarCEO() {
        // Ultimate achievement - Star CEO status
        const rewardTickets = 20 + Math.floor(this.ceoScore / 5); // 20-40 tickets
        
        if (window.gameEngine) {
            gameEngine.player.tickets += rewardTickets;
            
            // Add special CEO badge
            if (!gameEngine.badges.find(b => b.name === 'Star CEO')) {
                gameEngine.badges.push({
                    id: 999,
                    name: 'Star CEO',
                    icon: '👑',
                    description: 'Mastered the CEO Proving Ground',
                    unlocked: true
                });
            }
            gameEngine.updateUI();
        }
        
        if (window.authManager) {
            authManager.addXP(500); // Massive XP reward
            authManager.addActivity('👑', `BECAME STAR CEO! Score: ${this.ceoScore}/100`);
            
            // Special CEO title
            authManager.currentUser.title = 'Star CEO';
            authManager.updateAuthUI();
        }
        
        this.showNotification(`👑 STAR CEO ACHIEVED! ${rewardTickets} tickets earned`, 'success');
        this.exit();
    }

    failMatrix() {
        // Failed to meet CEO standards
        const feedback = this.getFailureFeedback();
        
        if (window.authManager) {
            authManager.addXP(50); // Small consolation XP
            authManager.addActivity('💼', `CEO Test Failed: ${this.ceoScore}/100`);
        }
        
        this.showNotification(`💼 CEO Potential: ${this.ceoScore}/100. ${feedback}`, 'error');
        this.exit();
    }

    getFailureFeedback() {
        if (this.ceoScore >= 70) return "Strong executive material - refine long-term thinking";
        if (this.ceoScore >= 60) return "Good operational leader - develop strategic vision";
        if (this.ceoScore >= 50) return "Solid manager - build CEO mindset";
        return "Focus on foundational leadership skills";
    }

    exit() {
        this.isActive = false;
        this.matrixContainer.style.display = 'none';
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
        }, 5000);
    }
}

// Create global instance
const ceoMatrix = new CEOMatrix();