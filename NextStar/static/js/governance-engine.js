// Community Governance Engine
class GovernanceEngine {
    constructor() {
        this.proposals = [];
        this.events = [];
        this.stats = null;
        this.currentTab = 'proposals';
    }

    async init() {
        console.log('🏛️ Initializing Community Governance...');
        await this.loadGovernanceData();
        this.setupEventListeners();
    }

    async loadGovernanceData() {
        try {
            await Promise.all([
                this.loadProposals(),
                this.loadEvents(),
                this.loadStats()
            ]);
            this.updateUI();
        } catch (error) {
            console.error('Error loading governance data:', error);
        }
    }

    async loadProposals() {
        try {
            const response = await fetch('/api/community/proposals/');
            if (response.ok) {
                this.proposals = await response.json();
                this.renderProposals();
            }
        } catch (error) {
            console.error('Error loading proposals:', error);
        }
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/community/events/');
            if (response.ok) {
                this.events = await response.json();
                this.renderEvents();
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/community/stats/');
            if (response.ok) {
                this.stats = await response.json();
                this.updateStatsUI();
            }
        } catch (error) {
            console.error('Error loading governance stats:', error);
        }
    }

    renderProposals() {
        const container = document.getElementById('proposalsList');
        if (!container) return;

        if (this.proposals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Active Proposals</h3>
                    <p>Be the first to create a proposal and shape the future of Next Star!</p>
                    <button class="join-btn" onclick="switchGovTab('create')">Create First Proposal</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.proposals.map(proposal => `
            <div class="proposal-card ${proposal.status}">
                <div class="proposal-header">
                    <div class="proposal-type-badge ${proposal.proposal_type}">
                        ${this.getProposalTypeIcon(proposal.proposal_type)} ${proposal.proposal_type}
                    </div>
                    <div class="proposal-status ${proposal.status}">
                        ${proposal.status}
                    </div>
                </div>
                <h3 class="proposal-title">${proposal.title}</h3>
                <p class="proposal-description">${proposal.description}</p>
                
                <div class="proposal-meta">
                    <div class="proposal-author">
                        <span class="author-avatar">${proposal.created_by.avatar}</span>
                        <span class="author-name">${proposal.created_by.username}</span>
                    </div>
                    <div class="proposal-date">
                        ${new Date(proposal.created_at).toLocaleDateString()}
                    </div>
                </div>

                ${proposal.status === 'active' ? `
                <div class="proposal-voting">
                    <div class="voting-stats">
                        <div class="vote-count">
                            <span class="vote-yes">👍 ${proposal.yes_votes}</span>
                            <span class="vote-no">👎 ${proposal.no_votes}</span>
                            <span class="vote-abstain">🤔 ${proposal.abstain_votes}</span>
                        </div>
                        <div class="approval-rate">
                            ${proposal.approval_rate.toFixed(1)}% approval
                        </div>
                    </div>
                    
                    <div class="voting-actions">
                        ${proposal.user_vote ? `
                            <div class="user-vote-indicator">
                                You voted: <strong>${proposal.user_vote}</strong>
                            </div>
                        ` : `
                            <button class="vote-btn yes" onclick="governanceEngine.voteProposal(${proposal.id}, 'yes')">
                                👍 Yes
                            </button>
                            <button class="vote-btn no" onclick="governanceEngine.voteProposal(${proposal.id}, 'no')">
                                👎 No
                            </button>
                            <button class="vote-btn abstain" onclick="governanceEngine.voteProposal(${proposal.id}, 'abstain')">
                                🤔 Abstain
                            </button>
                        `}
                    </div>
                    
                    ${proposal.days_remaining > 0 ? `
                        <div class="voting-deadline">
                            ${proposal.days_remaining} days remaining
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                ${proposal.status !== 'active' ? `
                <div class="proposal-result">
                    <div class="result-bar">
                        <div class="yes-bar" style="width: ${proposal.approval_rate}%"></div>
                    </div>
                    <div class="result-text">
                        ${proposal.status === 'passed' ? '✅ Proposal Passed' : 
                          proposal.status === 'rejected' ? '❌ Proposal Rejected' :
                          '📝 ' + proposal.status}
                    </div>
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderEvents() {
        const container = document.getElementById('eventsList');
        if (!container) return;

        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h3>No Upcoming Events</h3>
                    <p>Check back later for community events and town halls!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.events.map(event => `
            <div class="event-card">
                <div class="event-header">
                    <div class="event-type ${event.event_type}">
                        ${this.getEventTypeIcon(event.event_type)} ${event.event_type.replace('_', ' ')}
                    </div>
                    <div class="event-date">
                        ${new Date(event.scheduled_for).toLocaleString()}
                    </div>
                </div>
                
                <h3 class="event-title">${event.title}</h3>
                <p class="event-description">${event.description}</p>
                
                <div class="event-details">
                    <div class="event-host">
                        <span class="host-avatar">${event.host.avatar}</span>
                        <span class="host-name">Hosted by ${event.host.username}</span>
                    </div>
                    <div class="event-participants">
                        👥 ${event.current_participants}/${event.max_participants}
                    </div>
                </div>

                <div class="event-actions">
                    ${event.is_registered ? `
                        <button class="join-btn registered" disabled>
                            ✅ Registered
                        </button>
                    ` : `
                        <button class="join-btn" onclick="governanceEngine.joinEvent(${event.id})">
                            Join Event
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }

    updateStatsUI() {
        if (!this.stats) return;

        document.getElementById('govProposalsCreated').textContent = this.stats.proposals_created;
        document.getElementById('govVotesCast').textContent = this.stats.votes_cast;
        document.getElementById('govEventsAttended').textContent = this.stats.events_attended;
        
        const successRate = this.stats.proposals_created > 0 ? 
            (this.stats.successful_proposals / this.stats.proposals_created * 100).toFixed(0) : 0;
        document.getElementById('govSuccessRate').textContent = successRate + '%';
    }

    updateUI() {
        this.updateStatsUI();
        this.renderProposals();
        this.renderEvents();
    }

    async voteProposal(proposalId, voteType) {
        try {
            const response = await fetch(`/api/community/proposals/${proposalId}/vote/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                },
                body: JSON.stringify({ vote: voteType })
            });

            const data = await response.json();

            if (data.success) {
                if (window.gameEngine) {
                    gameEngine.showNotification(`Vote recorded! +${data.xp_earned} XP`, 'success');
                }
                await this.loadProposals();
                await this.loadStats();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error voting:', error);
            if (window.gameEngine) {
                gameEngine.showNotification(error.message, 'error');
            }
        }
    }

    async joinEvent(eventId) {
        try {
            const response = await fetch(`/api/community/events/${eventId}/join/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                }
            });

            const data = await response.json();

            if (data.success) {
                if (window.gameEngine) {
                    gameEngine.showNotification(`Event joined! +${data.xp_earned} XP`, 'success');
                }
                await this.loadEvents();
                await this.loadStats();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error joining event:', error);
            if (window.gameEngine) {
                gameEngine.showNotification(error.message, 'error');
            }
        }
    }

    async createProposal() {
        const title = document.getElementById('proposalTitle').value;
        const description = document.getElementById('proposalDescription').value;
        const type = document.getElementById('proposalType').value;

        if (!title || !description) {
            if (window.gameEngine) {
                gameEngine.showNotification('Please fill in all fields', 'error');
            }
            return;
        }

        try {
            const response = await fetch('/api/community/proposals/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    proposal_type: type
                })
            });

            const data = await response.json();

            if (data.success) {
                if (window.gameEngine) {
                    gameEngine.showNotification('Proposal created successfully!', 'success');
                }
                
                // Clear form
                document.getElementById('proposalTitle').value = '';
                document.getElementById('proposalDescription').value = '';
                
                // Reload data
                await this.loadProposals();
                await this.loadStats();
                
                // Switch to proposals tab
                switchGovTab('proposals');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error creating proposal:', error);
            if (window.gameEngine) {
                gameEngine.showNotification(error.message, 'error');
            }
        }
    }

    getProposalTypeIcon(type) {
        const icons = {
            'feature': '✨',
            'venture': '⚔️',
            'governance': '🏛️',
            'funding': '💰',
            'partnership': '🤝'
        };
        return icons[type] || '📋';
    }

    getEventTypeIcon(type) {
        const icons = {
            'town_hall': '🏛️',
            'proposal_review': '📋',
            'governance_update': '🔄',
            'community_vote': '🗳️'
        };
        return icons[type] || '📅';
    }

    getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }
}

// Global functions
function switchGovTab(tabName) {
    // Update tabs
    document.querySelectorAll('.gov-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.gov-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Activate selected tab
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    governanceEngine.currentTab = tabName;
}

function createProposal() {
    governanceEngine.createProposal();
}

// Initialize governance engine
const governanceEngine = new GovernanceEngine();

// Make functions global
window.switchGovTab = switchGovTab;
window.createProposal = createProposal;