// static/js/matrix-engine.js
class MatrixEngine {
    constructor() {
        this.activeProjects = [];
        this.currentSelection = null;
        this.currentMatrix = null;
        this.currentPuzzle = null;
        this.apiBase = '/matrix/api';
        
        this.init();
    }

    async init() {
        console.log('🌌 Initializing Eternal Matrix Engine...');
        await this.loadDashboard();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard shortcuts for matrix navigation
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
            if (!response.ok) throw new Error('Network error');
            return await response.json();
        } catch (error) {
            console.error('Matrix API request failed:', error);
            throw error;
        }
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    async loadDashboard() {
        try {
            const response = await this.makeRequest('/dashboard/');
            if (response.success) {
                this.activeProjects = response.projects;
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Load demo data
            this.loadDemoData();
        }
    }

    loadDemoData() {
        this.activeProjects = [
            {
                id: 1,
                name: 'Quantum Neural Interface Corporation',
                domain: 'AI',
                vision: 'Pioneering human-AI symbiosis through advanced neural interfaces',
                complexity: 'Executive Level (8+ years experience)',
                compensation: {
                    equity_shares: 1500000,
                    base_salary: 450000,
                    performance_bonus: 'up to 200% of base'
                },
                status: 'approved',
                user_application_status: 'not_applied',
                can_apply: true
            },
            {
                id: 2,
                name: 'Decentralized Autonomous Energy Grid',
                domain: 'Blockchain', 
                vision: 'Democratizing energy distribution through blockchain microgrids',
                complexity: 'Senior Level (5-8 years experience)',
                compensation: {
                    equity_shares: 1200000,
                    base_salary: 380000,
                    performance_bonus: 'up to 150% of base'
                },
                status: 'approved',
                user_application_status: 'not_applied',
                can_apply: true
            }
        ];
        this.updateDashboard();
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
                        <button class="matrix-btn success" onclick="matrixEngine.showInterviewStatus(${project.id})">
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
            'AI': '🧠',
            'Blockchain': '⛓️',
            'Biotech': '🧬',
            'Fintech': '💳',
            'CleanTech': '☀️'
        };
        return icons[domain] || '🚀';
    }

    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    updateStats() {
        const activeCount = this.activeProjects.filter(p => p.status === 'approved').length;
        const applicationsCount = this.activeProjects.filter(p => p.user_application_status !== 'not_applied').length;
        const inProgressCount = this.activeProjects.filter(p => p.user_application_status === 'matrix_challenge').length;

        document.getElementById('activeProjectsCount').textContent = activeCount;
        document.getElementById('ceoApplicationsCount').textContent = applicationsCount;
        document.getElementById('matrixChallengesCount').textContent = inProgressCount;
    }

    async applyForCEO(projectId) {
        const project = this.activeProjects.find(p => p.id === projectId);
        if (!project) return;

        try {
            const response = await this.makeRequest(`/projects/${projectId}/apply/`, {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification(`✅ Applied for ${project.name}! Matrix challenge started.`, 'success');
                
                // Update project status
                project.user_application_status = 'matrix_challenge';
                this.updateDashboard();
                
                // Auto-enter matrix
                setTimeout(() => {
                    this.enterMatrix(projectId, response.selection_id);
                }, 2000);
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Apply failed:', error);
            // Demo mode
            this.showNotification('Using demo mode - application submitted', 'info');
            project.user_application_status = 'matrix_challenge';
            this.updateDashboard();
            
            setTimeout(() => {
                this.enterMatrix(projectId, 'demo-' + Date.now());
            }, 2000);
        }
    }

    async enterMatrix(projectId, selectionId = null) {
        const project = this.activeProjects.find(p => p.id === projectId);
        if (!project) return;

        try {
            if (!selectionId) {
                // Find existing selection
                const response = await this.makeRequest('/dashboard/');
                const selection = response.user_selections.find(s => s.project_name === project.name);
                if (selection) {
                    selectionId = this.getSelectionIdFromStatus(selection);
                }
            }

            if (selectionId) {
                const matrixResponse = await this.makeRequest(`/selections/${selectionId}/matrix/`);
                
                if (matrixResponse.success) {
                    this.openMatrixGame(project, matrixResponse);
                } else {
                    this.showNotification(matrixResponse.error, 'error');
                }
            }
        } catch (error) {
            console.error('Enter matrix failed:', error);
            // Demo mode
            this.showNotification('Using demo mode - matrix session loaded', 'info');
            this.openMatrixGame(project, this.createDemoMatrixState(project));
        }
    }

    getSelectionIdFromStatus(selection) {
        // In a real app, this would extract the selection ID
        return 'demo-selection';
    }

    createDemoMatrixState(project) {
        return {
            selection_status: 'matrix_challenge',
            matrix_progress: {
                current_node: 15,
                total_nodes: 50,
                strategic_depth: 2,
                paradox_level: 3,
                cycles_completed: 0,
                total_decisions: 27
            },
            current_puzzle: {
                node_id: 15,
                strategic_depth: 2,
                puzzle_data: {
                    type: 'quantum_entanglement',
                    title: 'Quantum Executive Decision Matrix #16',
                    scenario: "You're facing 5 simultaneous strategic opportunities in quantum superposition. Each observation collapses possibilities and creates new realities.",
                    quantum_states: [
                        { state_id: "q15_0", potential: 85, entanglement: ["q15_1", "q15_2"], observation_cost: "Loses 18% of other states", strategic_implication: "Creates 4 new decision branches" },
                        { state_id: "q15_1", potential: 120, entanglement: ["q15_0", "q15_3"], observation_cost: "Loses 22% of other states", strategic_implication: "Creates 3 new decision branches" },
                        { state_id: "q15_2", potential: 65, entanglement: ["q15_0", "q15_4"], observation_cost: "Loses 15% of other states", strategic_implication: "Creates 5 new decision branches" },
                        { state_id: "q15_3", potential: 95, entanglement: ["q15_1", "q15_4"], observation_cost: "Loses 20% of other states", strategic_implication: "Creates 2 new decision branches" },
                        { state_id: "q15_4", potential: 110, entanglement: ["q15_2", "q15_3"], observation_cost: "Loses 25% of other states", strategic_implication: "Creates 4 new decision branches" }
                    ],
                    constraints: [
                        "Observation order affects outcome probabilities",
                        "Each choice creates quantum debt in other dimensions",
                        "Node 16 is entangled with nodes 17, 18, 19",
                        "The optimal path requires non-sequential thinking"
                    ],
                    strategic_question: "What's your quantum observation sequence to maximize preserved strategic potential?",
                    hidden_complexity: "Linear sequences create maximum entropy loss",
                    paradox_trigger: "Chronological observation creates temporal interference"
                },
                available_approaches: [
                    {
                        id: 'linear_sequential',
                        name: 'Linear Sequential Observation',
                        description: 'Observe quantum states in numerical order',
                        apparent_simplicity: 'Very High',
                        true_complexity: 'Creates maximum quantum decoherence',
                        success_rate: '20%',
                        paradox_risk: 'Extreme',
                        trap_warning: 'This approach seems obvious but will trap you in lower dimensions'
                    },
                    {
                        id: 'parallel_sampling', 
                        name: 'Parallel State Sampling',
                        description: 'Sample multiple states simultaneously using quantum computing principles',
                        apparent_simplicity: 'Medium',
                        true_complexity: 'Requires maintaining quantum coherence',
                        success_rate: '44%',
                        paradox_risk: 'High',
                        trap_warning: 'Parallel processing creates interference patterns'
                    },
                    {
                        id: 'entangled_strategy',
                        name: 'Entangled Strategic Positioning',
                        description: 'Use quantum entanglement as strategic advantage rather than obstacle',
                        apparent_simplicity: 'Very Low', 
                        true_complexity: 'Creates stable quantum solutions through superposition',
                        success_rate: '81%',
                        paradox_risk: 'Low',
                        trap_warning: 'Requires non-linear thinking patterns'
                    }
                ],
                paradox_warnings: [
                    "Direct solutions create recursive complexity",
                    "Linear thinking increases entropy in non-linear systems", 
                    "Each decision affects multiple node dimensions simultaneously"
                ],
                matrix_context: {
                    total_nodes: 50,
                    current_progress: "16/50",
                    strategic_depth: 2,
                    paradox_level: 3,
                    cycles_completed: 0,
                    eternal_nature: "Solutions create new complexity - the matrix is infinite"
                }
            },
            project_info: {
                name: project.name,
                domain: project.domain,
                vision: project.vision
            }
        };
    }

    openMatrixGame(project, matrixState) {
        this.currentProject = project;
        this.currentMatrix = matrixState;
        this.currentPuzzle = matrixState.current_puzzle;
        
        const gameContainer = document.querySelector('#matrixGameWindow .window-content .matrix-game-container');
        const title = document.getElementById('matrixGameTitle');
        
        if (title) title.textContent = `🌌 ${project.name} - Eternal Matrix Challenge`;
        
        if (gameContainer) {
            gameContainer.innerHTML = this.generateMatrixHTML(matrixState);
        }
        
        openWindow('matrixGameWindow');
        this.attachMatrixEventListeners();
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
                            <textarea id="solutionReasoning" placeholder="Explain your multi-dimensional reasoning..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="solutionConsiderations">Key Considerations:</label>
                            <textarea id="solutionConsiderations" placeholder="What dimensions did you consider?"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="solutionContingencies">Contingency Plans:</label>
                            <textarea id="solutionContingencies" placeholder="How do you handle unexpected outcomes?"></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="matrix-btn secondary" onclick="matrixEngine.cancelSolution()">Cancel</button>
                            <button class="matrix-btn primary" onclick="matrixEngine.submitSolution()">Execute Strategic Decision</button>
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
                        <div class="pattern-item">
                            <span class="pattern-icon">🔍</span>
                            <span class="pattern-name">Quantum Thinking Required</span>
                        </div>
                        <div class="pattern-item">
                            <span class="pattern-icon">🔍</span>
                            <span class="pattern-name">Multi-dimensional Optimization</span>
                        </div>
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
            case 'quantum_entanglement':
                return `
                    <div class="quantum-states">
                        <h5>Quantum Strategic States</h5>
                        ${puzzleData.quantum_states.map(state => `
                            <div class="quantum-state">
                                <div class="state-header">
                                    <span class="state-id">${state.state_id}</span>
                                    <span class="state-potential">Potential: ${state.potential}</span>
                                </div>
                                <div class="state-details">
                                    <div>Entangled with: ${state.entanglement.join(', ')}</div>
                                    <div>Observation Cost: ${state.observation_cost}</div>
                                    <div>Strategic Impact: ${state.strategic_implication}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'temporal_paradox':
                return `
                    <div class="timeline-data">
                        <h5>Temporal Intelligence</h5>
                        ${puzzleData.timeline_data.map(timeline => `
                            <div class="timeline-period">
                                <div class="period-header">
                                    <span class="period-name">${timeline.period}</span>
                                    <span class="period-risk">Risk: ${timeline.causality_risk}</span>
                                </div>
                                <div class="period-details">
                                    <div>Known Outcomes: ${timeline.known_outcomes}</div>
                                    <div>Strategic Value: ${timeline.strategic_value}</div>
                                    <div>Paradox Conditions: ${timeline.paradox_conditions.join('; ')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            default:
                return `<div class="puzzle-constraints">
                    <h5>Strategic Constraints</h5>
                    ${puzzleData.constraints.map(constraint => `
                        <div class="constraint-item">• ${constraint}</div>
                    `).join('')}
                </div>`;
        }
    }

    generateApproachesHTML(approaches) {
        return approaches.map(approach => `
            <div class="strategic-approach" data-approach-id="${approach.id}">
                <div class="approach-header">
                    <h5>${approach.name}</h5>
                    <div class="approach-meta">
                        <span class="success-rate ${approach.success_rate.includes('8') ? 'high' : 'low'}">
                            ${approach.success_rate} success
                        </span>
                        <span class="paradox-risk ${approach.paradox_risk === 'Extreme' ? 'extreme' : 'moderate'}">
                            ${approach.paradox_risk} paradox risk
                        </span>
                    </div>
                </div>
                <div class="approach-description">
                    ${approach.description}
                </div>
                <div class="approach-complexity">
                    <div class="apparent-simplicity">
                        <label>Apparent Simplicity:</label>
                        <span>${approach.apparent_simplicity}</span>
                    </div>
                    <div class="true-complexity">
                        <label>True Complexity:</label>
                        <span>${approach.true_complexity}</span>
                    </div>
                </div>
                <div class="approach-warning">
                    ⚠️ ${approach.trap_warning}
                </div>
                <button class="matrix-btn approach-select" onclick="matrixEngine.selectApproach('${approach.id}')">
                    Select This Approach
                </button>
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
        document.getElementById('solutionInterface').style.display = 'block';
        document.getElementById('solutionReasoning').focus();
        
        this.showNotification(`Selected: ${approachId} - Prepare your strategic solution`, 'info');
    }

    cancelSolution() {
        this.selectedApproach = null;
        document.getElementById('solutionInterface').style.display = 'none';
        
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
            reasoning: document.getElementById('solutionReasoning').value,
            considerations: document.getElementById('solutionConsiderations').value,
            contingencies: document.getElementById('solutionContingencies').value,
            dimensions_considered: this.estimateDimensionsConsidered()
        };

        if (!solutionData.reasoning || !solutionData.considerations) {
            this.showNotification('Please provide strategic reasoning and considerations', 'error');
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
            // Demo mode response
            this.simulateSolutionResponse(solutionData);
        }
    }

    estimateDimensionsConsidered() {
        const considerations = document.getElementById('solutionConsiderations').value.toLowerCase();
        const dimensions = [];
        
        if (considerations.includes('quantum') || considerations.includes('superposition')) dimensions.push('quantum');
        if (considerations.includes('time') || considerations.includes('temporal')) dimensions.push('temporal');
        if (considerations.includes('resource') || considerations.includes('allocation')) dimensions.push('resource');
        if (considerations.includes('stakeholder') || considerations.includes('political')) dimensions.push('stakeholder');
        if (considerations.includes('ethical') || considerations.includes('moral')) dimensions.push('ethical');
        
        return dimensions.length > 0 ? dimensions : ['strategic'];
    }

    simulateSolutionResponse(solutionData) {
        // Simulate different outcomes based on approach
        const approach = this.selectedApproach;
        let success = false;
        let message = '';
        
        if (approach.includes('entangled') || approach.includes('branching')) {
            success = true;
            message = '🌌 STRATEGIC BREAKTHROUGH! Advanced to next node with enhanced capabilities';
        } else if (approach.includes('parallel')) {
            success = true;
            message = '📈 Advancement with complications - paradox level increased';
        } else {
            success = false;
            message = '🚫 STRATEGIC TRAP ACTIVATED! Matrix complexity increased';
        }
        
        this.showNotification(message, success ? 'success' : 'error');
        
        if (success) {
            setTimeout(() => {
                this.closeMatrixGame();
                this.loadDashboard();
            }, 3000);
        } else {
            // Reload with higher complexity
            setTimeout(() => {
                this.currentMatrix.matrix_progress.strategic_depth += 1;
                this.currentMatrix.matrix_progress.paradox_level += 2;
                this.openMatrixGame(this.currentProject, this.currentMatrix);
            }, 2000);
        }
    }

    showStrategicInsights() {
        this.showNotification('Strategic Insights feature coming soon!', 'info');
    }

    showLeaderboard() {
        this.showNotification('Leaderboard feature coming soon!', 'info');
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
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    attachMatrixEventListeners() {
        // Add any matrix-specific event listeners
        console.log('Matrix event listeners attached');
    }
}

// Initialize the engine
document.addEventListener('DOMContentLoaded', () => {
    window.matrixEngine = new MatrixEngine();
});