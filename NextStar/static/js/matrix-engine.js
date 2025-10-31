// static/js/matrix-engine.js
class MatrixEngine {
    constructor() {
        this.activeProjects = [];
        this.currentSelection = null;
        this.currentMatrix = null;
        this.currentPuzzle = null;
        this.selectedApproach = null;
        this.apiBase = '/matrix/api';
        
        this.init();
    }

    async init() {
        console.log('🌌 Initializing Eternal Matrix Engine...');
        await this.loadDashboard();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.currentMatrix && e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.showStrategicInsights();
            }
        });
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken(),
            },
            credentials: 'include',
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network error');
            }
            return await response.json();
        } catch (error) {
            console.error('Matrix API request failed:', error);
            this.showNotification(`API Error: ${error.message}`, 'error');
            throw error;
        }
    }

    getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    async loadDashboard() {
        try {
            const response = await this.makeRequest('/dashboard/');
            if (response.success) {
                this.activeProjects = response.projects;
                this.updateDashboard();
            } else {
                this.showNotification('Failed to load dashboard', 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showNotification('Cannot connect to server. Please refresh the page.', 'error');
        }
    }

    openDashboard() {
        openWindow('matrixDashboardWindow');
        this.updateDashboard();
    }

    updateDashboard() {
        const grid = document.getElementById('matrixProjectsGrid');
        if (!grid) return;

        grid.innerHTML = this.activeProjects.map(project => `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <div class="project-icon">${this.getDomainIcon(project.domain)}</div>
                    <div class="project-complexity ${project.complexity.toLowerCase().includes('executive') ? 'executive' : 'senior'}">
                        ${project.complexity.split('(')[0].trim()}
                    </div>
                </div>
                 
                <div class="project-body">
                    <h3>${project.name}</h3>
                    <div class="project-domain">${project.domain}</div>
                    <p class="project-vision">${project.vision}</p>
                    
                    <div class="compensation-preview">
                        <div class="compensation-item">
                            <span class="comp-label">Equity:</span>
                            <span class="comp-value">${this.formatNumber(project.compensation.equity_shares)} shares</span>
                        </div>
                        <div class="compensation-item">
                            <span class="comp-label">Salary:</span>
                            <span class="comp-value">$${this.formatNumber(project.compensation.base_salary)}</span>
                        </div>
                        <div class="compensation-item">
                            <span class="comp-label">Bonus:</span>
                            <span class="comp-value">${project.compensation.performance_bonus}</span>
                        </div>
                    </div>
                </div>
                
                <div class="project-actions">
                    ${project.user_application_status === 'not_applied' ? `
                        <button class="matrix-btn primary" onclick="matrixEngine.applyForCEO(${project.id})">
                            🚀 Apply for CEO Position
                        </button>
                    ` : project.user_application_status === 'matrix_challenge' ? `
                        <button class="matrix-btn secondary" onclick="matrixEngine.enterMatrix(${project.id})">
                            🌌 Continue Matrix Challenge
                        </button>
                    ` : project.user_application_status === 'board_interview' ? `
                        <button class="matrix-btn success">
                            📊 Board Review - Score: ${project.score || 'Pending'}
                        </button>
                    ` : `
                        <button class="matrix-btn disabled" disabled>
                            ${project.user_application_status.replace('_', ' ').toUpperCase()}
                        </button>
                    `}
                </div>
            </div>
        `).join('');

        this.updateStats();
    }

    getDomainIcon(domain) {
        const icons = {
            'Transportation': '🚗',
            'Agriculture': '🌱',
            'Healthcare': '🏥',
            'Retail': '🛍️',
            'Manufacturing': '🏭',
            'Logistics': '📦',
            'Technology': '💻',
            'Finance': '💰'
        };
        return icons[domain] || '🚀';
    }

    formatNumber(num) {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    updateStats() {
        const activeCount = this.activeProjects.filter(p => p.status === 'approved').length;
        const applicationsCount = this.activeProjects.filter(p => p.user_application_status !== 'not_applied').length;
        const inProgressCount = this.activeProjects.filter(p => p.user_application_status === 'matrix_challenge').length;

        const activeEl = document.getElementById('activeProjectsCount');
        const applicationsEl = document.getElementById('ceoApplicationsCount');
        const challengesEl = document.getElementById('matrixChallengesCount');

        if (activeEl) activeEl.textContent = activeCount;
        if (applicationsEl) applicationsEl.textContent = applicationsCount;
        if (challengesEl) challengesEl.textContent = inProgressCount;
    }

    async applyForCEO(projectId) {
        const project = this.activeProjects.find(p => p.id === projectId);
        if (!project) return;

        try {
            const response = await this.makeRequest(`/projects/${projectId}/apply/`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            if (response.success) {
                this.showNotification(`✅ Applied for ${project.name}! Matrix challenge started.`, 'success');
                
                // Update local state
                project.user_application_status = 'matrix_challenge';
                project.user_selection_id = response.selection_id;
                this.updateDashboard();
                
                // Enter matrix immediately
                setTimeout(() => {
                    this.enterMatrix(projectId, response.selection_id);
                }, 1500);
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Apply failed:', error);
            this.showNotification('Failed to apply. Please try again.', 'error');
        }
    }

    async enterMatrix(projectId, selectionId = null) {
        const project = this.activeProjects.find(p => p.id === projectId);
        if (!project) return;

        try {
            // If no selection ID provided, find from user selections
            if (!selectionId) {
                const dashboardResponse = await this.makeRequest('/dashboard/');
                const userSelection = dashboardResponse.user_selections?.find(
                    s => s.project_name === project.name
                );
                if (userSelection && userSelection.selection_id) {
                    selectionId = userSelection.selection_id;
                }
            }

            if (!selectionId) {
                this.showNotification('No active matrix session found. Please apply first.', 'error');
                return;
            }

            const matrixResponse = await this.makeRequest(`/selections/${selectionId}/matrix/`);
            
            if (matrixResponse.success) {
                this.openMatrixGame(project, matrixResponse);
            } else {
                this.showNotification(matrixResponse.error, 'error');
            }
        } catch (error) {
            console.error('Enter matrix failed:', error);
            this.showNotification('Failed to load matrix session.', 'error');
        }
    }

    openMatrixGame(project, matrixState) {
        this.currentProject = project;
        this.currentMatrix = matrixState;
        this.currentPuzzle = matrixState.current_puzzle;
        this.selectedApproach = null;
        
        const gameContainer = document.querySelector('#matrixGameWindow .window-content .matrix-game-container');
        const title = document.getElementById('matrixGameTitle');
        
        if (title) title.textContent = `🌌 ${project.name} - Eternal Matrix Challenge`;
        
        if (gameContainer) {
            gameContainer.innerHTML = this.generateMatrixHTML(matrixState);
            this.attachMatrixEventListeners();
        }
        
        openWindow('matrixGameWindow');
    }

    generateMatrixHTML(matrixState) {
        const progress = matrixState.matrix_progress;
        const puzzle = matrixState.current_puzzle;
        
        return `
            <div class="matrix-info-panel">
                <div class="game-stats-panel">
                    <div class="game-stat">
                        <label>Matrix Progress:</label>
                        <span id="matrixProgress">${progress.current_node + 1}/${progress.total_nodes}</span>
                    </div>
                    <div class="game-stat">
                        <label>Strategic Depth:</label>
                        <span id="strategicDepth">Level ${progress.strategic_depth}</span>
                    </div>
                    <div class="game-stat">
                        <label>Paradox Level:</label>
                        <span id="paradoxLevel" class="${progress.paradox_level > 5 ? 'warning' : ''}">${progress.paradox_level}</span>
                    </div>
                    <div class="game-stat">
                        <label>Eternal Cycles:</label>
                        <span id="eternalCycles">${progress.cycles_completed}</span>
                    </div>
                    <div class="game-stat">
                        <label>Total Decisions:</label>
                        <span id="totalDecisions">${progress.total_decisions}</span>
                    </div>
                </div>
                
                <div class="project-context">
                    <h4>CEO Mission</h4>
                    <div class="project-vision">${matrixState.project_info.vision}</div>
                    <div class="project-domain">Domain: ${matrixState.project_info.domain}</div>
                </div>
                
                <div class="matrix-warnings">
                    <h4>🌌 Eternal Matrix Warnings</h4>
                    ${puzzle.paradox_warnings.map(warning => `
                        <div class="warning-item">⚠️ ${warning}</div>
                    `).join('')}
                    <div class="eternal-note">${puzzle.matrix_context.eternal_nature}</div>
                </div>
            </div>
            
            <div class="matrix-game-area">
                <div class="current-puzzle">
                    <div class="puzzle-header">
                        <h3>${puzzle.puzzle_data.title}</h3>
                        <div class="puzzle-meta">
                            <span class="node-id">Node ${puzzle.node_id + 1}</span>
                            <span class="strategic-depth">Depth ${puzzle.strategic_depth}</span>
                        </div>
                    </div>
                    
                    <div class="puzzle-scenario">
                        <p>${puzzle.puzzle_data.scenario}</p>
                    </div>
                    
                    <div class="puzzle-details">
                        ${this.generatePuzzleDetails(puzzle.puzzle_data)}
                    </div>
                    
                    <div class="strategic-question">
                        <h4>🎯 Strategic Challenge</h4>
                        <p>${puzzle.puzzle_data.strategic_question}</p>
                        <div class="complexity-note">
                            <strong>Hidden Complexity:</strong> ${puzzle.puzzle_data.hidden_complexity}
                        </div>
                        <div class="paradox-warning">
                            <strong>Paradox Trigger:</strong> ${puzzle.puzzle_data.paradox_trigger}
                        </div>
                    </div>
                </div>
                
                <div class="strategic-approaches">
                    <h4>Available Strategic Approaches</h4>
                    <div class="approaches-grid" id="approachesGrid">
                        ${this.generateApproachesHTML(puzzle.available_approaches)}
                    </div>
                </div>
                
                <div class="solution-interface" id="solutionInterface" style="display: none;">
                    <h4>Your Strategic Solution</h4>
                    <div class="solution-form">
                        <div class="form-group">
                            <label for="solutionReasoning">Strategic Reasoning:</label>
                            <textarea id="solutionReasoning" placeholder="Explain your multi-dimensional reasoning..." rows="4"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="solutionConsiderations">Key Considerations:</label>
                            <textarea id="solutionConsiderations" placeholder="What business dimensions did you consider?" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="solutionContingencies">Contingency Plans:</label>
                            <textarea id="solutionContingencies" placeholder="How do you handle unexpected business outcomes?" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="matrix-btn secondary" onclick="matrixEngine.cancelSolution()">Cancel</button>
                            <button type="button" class="matrix-btn primary" onclick="matrixEngine.submitSolution()">Execute Strategic Decision</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="matrix-sidebar">
                <div class="eternal-context">
                    <h4>Eternal Matrix Context</h4>
                    <div class="context-item">
                        <label>Total Nodes:</label>
                        <span>${puzzle.matrix_context.total_nodes}</span>
                    </div>
                    <div class="context-item">
                        <label>Current Progress:</label>
                        <span>${puzzle.matrix_context.current_progress}</span>
                    </div>
                    <div class="context-item">
                        <label>Next Complexity:</label>
                        <span>Depth ${puzzle.matrix_context.strategic_depth + 1}</span>
                    </div>
                </div>
                
                <div class="strategic-insights">
                    <h4>Strategic Patterns</h4>
                    <div id="patternsList">
                        ${this.generatePatternsHTML(puzzle.puzzle_data.type)}
                    </div>
                </div>
                
                <div class="matrix-controls">
                    <button class="matrix-btn secondary" onclick="matrixEngine.showStrategicInsights()">
                        📊 Strategic Insights
                    </button>
                    <button class="matrix-btn secondary" onclick="matrixEngine.showLeaderboard()">
                        🏆 Leaderboard
                    </button>
                </div>
            </div>
        `;
    }

    generatePuzzleDetails(puzzleData) {
        switch(puzzleData.type) {
            case 'market_dominance':
                return `
                    <div class="market-data">
                        <h5>Market Landscape</h5>
                        ${Object.entries(puzzleData.market_data || {}).map(([key, data]) => `
                            <div class="market-player">
                                <div class="player-header">
                                    <span class="player-name">${key.replace('_', ' ').toUpperCase()}</span>
                                    ${data.market_share ? `<span class="player-share">${data.market_share}</span>` : ''}
                                </div>
                                <div class="player-details">
                                    ${data.strength ? `<div>Strength: ${data.strength}</div>` : ''}
                                    ${data.weakness ? `<div>Weakness: ${data.weakness}</div>` : ''}
                                    ${data.budget ? `<div>Budget: ${data.budget}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'financial_turnaround':
                return `
                    <div class="financial-snapshot">
                        <h5>Financial Situation</h5>
                        ${Object.entries(puzzleData.financial_snapshot || {}).map(([key, value]) => `
                            <div class="financial-item">
                                <span class="financial-label">${key.replace('_', ' ').toUpperCase()}:</span>
                                <span class="financial-value">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${puzzleData.crisis_points ? `
                    <div class="crisis-points">
                        <h5>Immediate Crises</h5>
                        ${puzzleData.crisis_points.map(point => `
                            <div class="crisis-item">• ${point}</div>
                        `).join('')}
                    </div>
                    ` : ''}
                `;
            case 'merger_acquisition':
                return `
                    <div class="merger-dynamics">
                        <h5>Merger Dynamics</h5>
                        ${Object.entries(puzzleData.merger_dynamics || {}).map(([key, value]) => `
                            <div class="merger-item">
                                <span class="merger-label">${key.replace('_', ' ').toUpperCase()}:</span>
                                <span class="merger-value">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            default:
                return `
                    <div class="puzzle-constraints">
                        <h5>Strategic Constraints</h5>
                        ${(puzzleData.constraints || []).map(constraint => `
                            <div class="constraint-item">• ${constraint}</div>
                        `).join('')}
                    </div>
                `;
        }
    }

    generateApproachesHTML(approaches) {
        if (!approaches || approaches.length === 0) {
            return '<div class="no-approaches">No strategic approaches available</div>';
        }

        return approaches.map(approach => `
            <div class="strategic-approach" data-approach-id="${approach.id}">
                <div class="approach-header">
                    <h5>${approach.name}</h5>
                    <div class="approach-meta">
                        <span class="success-rate ${approach.success_rate && approach.success_rate.includes('8') ? 'high' : 'low'}">
                            ${approach.success_rate || '0%'} success
                        </span>
                        <span class="paradox-risk ${approach.paradox_risk === 'Extreme' ? 'extreme' : 'moderate'}">
                            ${approach.paradox_risk || 'Unknown'} paradox risk
                        </span>
                    </div>
                </div>
                <div class="approach-description">
                    ${approach.description}
                </div>
                <div class="approach-complexity">
                    <div class="apparent-simplicity">
                        <label>Apparent Simplicity:</label>
                        <span>${approach.apparent_simplicity || 'Unknown'}</span>
                    </div>
                    <div class="true-complexity">
                        <label>True Complexity:</label>
                        <span>${approach.true_complexity || 'Unknown'}</span>
                    </div>
                </div>
                ${approach.trap_warning ? `
                <div class="approach-warning">
                    ⚠️ ${approach.trap_warning}
                </div>
                ` : ''}
                <button class="matrix-btn approach-select" onclick="matrixEngine.selectApproach('${approach.id}')">
                    Select This Approach
                </button>
            </div>
        `).join('');
    }

    generatePatternsHTML(puzzleType) {
        const patterns = {
            'market_dominance': ['Ecosystem Strategy', 'Competitive Positioning', 'Market Segmentation'],
            'financial_turnaround': ['Cost Optimization', 'Revenue Diversification', 'Strategic Pivoting'],
            'merger_acquisition': ['Cultural Integration', 'Synergy Realization', 'Stakeholder Alignment'],
            'innovation_paradox': ['Portfolio Balance', 'Risk Management', 'Resource Allocation'],
            'talent_management': ['Culture Building', 'Performance Management', 'Retention Strategy']
        };

        const patternList = patterns[puzzleType] || ['Strategic Thinking', 'Decision Making', 'Leadership'];
        
        return patternList.map(pattern => `
            <div class="pattern-item">
                <span class="pattern-icon">🔍</span>
                <span class="pattern-name">${pattern}</span>
            </div>
        `).join('');
    }

    selectApproach(approachId) {
        this.selectedApproach = approachId;
        
        // Visual feedback
        document.querySelectorAll('.strategic-approach').forEach(el => {
            el.style.borderColor = 'var(--parrot-border)';
            el.style.background = 'rgba(255, 255, 255, 0.05)';
        });
        
        const selectedEl = document.querySelector(`[data-approach-id="${approachId}"]`);
        if (selectedEl) {
            selectedEl.style.borderColor = 'var(--parrot-accent)';
            selectedEl.style.background = 'rgba(0, 255, 136, 0.1)';
        }
        
        // Show solution interface
        const solutionInterface = document.getElementById('solutionInterface');
        if (solutionInterface) {
            solutionInterface.style.display = 'block';
            document.getElementById('solutionReasoning')?.focus();
        }
        
        this.showNotification(`Selected approach: ${approachId}`, 'info');
    }

    cancelSolution() {
        this.selectedApproach = null;
        const solutionInterface = document.getElementById('solutionInterface');
        if (solutionInterface) {
            solutionInterface.style.display = 'none';
        }
        
        // Reset visual selection
        document.querySelectorAll('.strategic-approach').forEach(el => {
            el.style.borderColor = 'var(--parrot-border)';
            el.style.background = 'rgba(255, 255, 255, 0.05)';
        });
    }

    async submitSolution() {
        if (!this.selectedApproach) {
            this.showNotification('Please select a strategic approach first', 'error');
            return;
        }

        const solutionData = {
            reasoning: document.getElementById('solutionReasoning')?.value || '',
            considerations: document.getElementById('solutionConsiderations')?.value || '',
            contingencies: document.getElementById('solutionContingencies')?.value || '',
            stakeholders_considered: this.extractStakeholders(),
            planning_horizon: this.estimatePlanningHorizon(),
            risk_mitigations: this.extractRiskMitigations()
        };

        if (!solutionData.reasoning.trim()) {
            this.showNotification('Please provide your strategic reasoning', 'error');
            return;
        }

        try {
            const response = await this.makeRequest(`/selections/${this.currentMatrix.selection_id}/solve/`, {
                method: 'POST',
                body: JSON.stringify({
                    approach_id: this.selectedApproach,
                    solution_data: solutionData
                })
            });

            if (response.success) {
                this.showNotification(response.message, 'success');
                
                // Update matrix state
                this.currentMatrix.matrix_progress = response.matrix_progress;
                this.currentMatrix.selection_status = response.selection_status;
                
                if (response.next_challenge) {
                    this.currentMatrix.current_puzzle = response.next_challenge;
                    // Refresh the matrix game with new puzzle
                    this.openMatrixGame(this.currentProject, this.currentMatrix);
                } else {
                    // Matrix completed or advanced
                    setTimeout(() => {
                        this.closeMatrixGame();
                        this.loadDashboard(); // Refresh dashboard
                    }, 3000);
                }
            } else {
                this.showNotification(response.message || 'Strategic approach failed', 'error');
                if (response.trap_analysis) {
                    this.showNotification(`Trap Analysis: ${response.trap_analysis}`, 'warning');
                }
            }
        } catch (error) {
            console.error('Solution submission failed:', error);
            this.showNotification('Failed to submit solution. Please try again.', 'error');
        }
    }

    extractStakeholders() {
        const text = document.getElementById('solutionConsiderations')?.value.toLowerCase() || '';
        const stakeholders = [];
        if (text.includes('investor') || text.includes('shareholder')) stakeholders.push('investors');
        if (text.includes('employee') || text.includes('team')) stakeholders.push('employees');
        if (text.includes('customer') || text.includes('client')) stakeholders.push('customers');
        if (text.includes('board') || text.includes('director')) stakeholders.push('board');
        if (text.includes('regulator') || text.includes('government')) stakeholders.push('regulators');
        return stakeholders.length > 0 ? stakeholders : ['stakeholders'];
    }

    estimatePlanningHorizon() {
        const text = document.getElementById('solutionReasoning')?.value.toLowerCase() || '';
        if (text.includes('long-term') || text.includes('5 year') || text.includes('strategic')) return 60;
        if (text.includes('medium-term') || text.includes('2 year') || text.includes('tactical')) return 24;
        if (text.includes('short-term') || text.includes('90 day') || text.includes('immediate')) return 3;
        return 12; // Default 1 year
    }

    extractRiskMitigations() {
        const text = document.getElementById('solutionContingencies')?.value || '';
        return text.split('.').filter(mitigation => mitigation.trim().length > 10);
    }

    async showStrategicInsights() {
        if (!this.currentMatrix || !this.currentMatrix.selection_id) {
            this.showNotification('No active matrix session', 'error');
            return;
        }

        try {
            const response = await this.makeRequest(`/selections/${this.currentMatrix.selection_id}/insights/`);
            if (response.success) {
                // TODO: Implement insights display modal
                this.showNotification('Strategic insights loaded successfully', 'success');
                console.log('Insights:', response.insights);
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Failed to load insights:', error);
            this.showNotification('Failed to load strategic insights', 'error');
        }
    }

    async showLeaderboard() {
        try {
            const response = await this.makeRequest('/leaderboard/');
            if (response.success) {
                // TODO: Implement leaderboard display modal
                this.showNotification('Leaderboard loaded successfully', 'success');
                console.log('Leaderboard:', response.leaderboard);
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.showNotification('Failed to load leaderboard', 'error');
        }
    }

    closeMatrixGame() {
        this.currentSelection = null;
        this.currentMatrix = null;
        this.currentPuzzle = null;
        this.selectedApproach = null;
        
        closeWindow('matrixGameWindow');
        this.showNotification('Matrix session closed', 'info');
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`[${type.toUpperCase()}] ${message}`);
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#00ff88' : '#0099ff'};
                color: #000;
                border-radius: 5px;
                font-weight: bold;
                z-index: 10000;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }

    attachMatrixEventListeners() {
        // Add any matrix-specific event listeners here
        console.log('Matrix event listeners attached');
    }
}

// Initialize the engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.matrixEngine = new MatrixEngine();
});