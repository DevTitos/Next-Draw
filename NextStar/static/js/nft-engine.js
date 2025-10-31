// static/matrix_ceo/js/nft-engine.js
class NFTTicketEngine {
    constructor() {
        this.currentSelectionId = null;
        this.selectedTicketType = null;
        this.csrfToken = this.getCSRFToken();
        this.baseUrl = '/matrix-ceo'; // Adjust based on your URL structure
    }

    getCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfToken ? csrfToken.value : '';
    }

    // Open NFT ticket window for a specific CEO selection
    openTicketWindow(selectionId, projectData = null) {
        this.currentSelectionId = selectionId;
        openWindow('nftTicketWindow');
        
        // Load ticket info
        this.loadTicketInfo(selectionId, projectData);
    }

    async loadTicketInfo(selectionId, projectData = null) {
        try {
            const response = await fetch(`${this.baseUrl}/selection/${selectionId}/ticket-info/`);
            const data = await response.json();

            if (data.success) {
                this.renderTicketInfo(data, projectData);
            } else {
                this.showError('Failed to load ticket information: ' + data.error);
            }
        } catch (error) {
            this.showError('Network error loading ticket information: ' + error.message);
        }
    }

    renderTicketInfo(data, projectData = null) {
        // Show project info if available
        if (projectData || data.project_name) {
            document.getElementById('projectInfoSection').style.display = 'block';
            document.getElementById('projectName').textContent = projectData?.name || data.project_name;
            document.getElementById('projectVision').textContent = projectData?.vision || '';
            document.getElementById('projectDomain').textContent = projectData?.domain || data.project_domain || 'Unknown';
            document.getElementById('projectStatus').textContent = 'Active';
        }

        // Show appropriate section based on user's ticket status
        if (data.user_has_ticket) {
            this.showUserTickets(data.user_ticket);
        } else {
            this.showTicketSelection();
        }
    }

    showTicketSelection() {
        this.hideAllSections();
        document.getElementById('ticketSelectionSection').style.display = 'block';
    }

    showPurchaseSection() {
        this.hideAllSections();
        document.getElementById('purchaseSection').style.display = 'block';
    }

    showPurchaseStatus() {
        this.hideAllSections();
        document.getElementById('purchaseStatusSection').style.display = 'block';
    }

    showUserTickets(ticket) {
        this.hideAllSections();
        document.getElementById('userTicketsSection').style.display = 'block';
        
        const ticketsList = document.getElementById('ticketsList');
        if (ticket) {
            ticketsList.innerHTML = `
                <div class="ticket-item">
                    <div class="ticket-item-header">
                        <span class="ticket-type">${this.getTicketInfo(ticket.ticket_type).name}</span>
                        <span class="ticket-date">${new Date(ticket.purchase_date).toLocaleDateString()}</span>
                    </div>
                    <div class="ticket-details">
                        <div>Project: ${document.getElementById('projectName').textContent}</div>
                        <div>NFT Token: ${ticket.nft_token_id || 'Processing...'}</div>
                        <div>Status: ${ticket.status}</div>
                    </div>
                </div>
            `;
        } else {
            ticketsList.innerHTML = '<p>No active tickets found.</p>';
        }
    }

    hideAllSections() {
        const sections = [
            'projectInfoSection',
            'ticketSelectionSection',
            'purchaseSection',
            'purchaseStatusSection',
            'userTicketsSection'
        ];
        
        sections.forEach(section => {
            document.getElementById(section).style.display = 'none';
        });
    }

    selectTicket(ticketType) {
        this.selectedTicketType = ticketType;
        
        // Update UI
        document.querySelectorAll('.ticket-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-type="${ticketType}"]`).classList.add('selected');
        
        // Update purchase details
        const ticketInfo = this.getTicketInfo(ticketType);
        document.getElementById('selectedTicketType').textContent = ticketInfo.name;
        document.getElementById('selectedTicketPrice').textContent = `${ticketInfo.price} HBAR`;
        document.getElementById('selectedProjectName').textContent = 
            document.getElementById('projectName').textContent;
        
        this.showPurchaseSection();
    }

    getTicketInfo(ticketType) {
        const tickets = {
            standard: { name: 'Standard Ticket', price: 10 },
            premium: { name: 'Premium Ticket', price: 25 },
            vip: { name: 'VIP Ticket', price: 100 }
        };
        return tickets[ticketType] || tickets.standard;
    }

    async purchaseTicket() {
        if (!this.selectedTicketType) {
            this.showError('Please select a ticket type');
            return;
        }

        this.showPurchaseStatus();
        this.resetProgressSteps();
        
        try {
            const response = await fetch(`${this.baseUrl}/selection/${this.currentSelectionId}/purchase-ticket/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken
                },
                body: JSON.stringify({
                    ticket_type: this.selectedTicketType
                })
            });

            const data = await response.json();

            if (data.success) {
                await this.handlePurchaseSuccess(data);
            } else {
                this.handlePurchaseError(data.error);
            }
        } catch (error) {
            this.handlePurchaseError('Network error: ' + error.message);
        }
    }

    resetProgressSteps() {
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            step.classList.remove('completed', 'active');
            if (i === 1) step.classList.add('active');
        }
    }

    updateProgressStep(stepNumber, completed = false) {
        const step = document.getElementById(`step${stepNumber}`);
        if (completed) {
            step.classList.add('completed');
            step.classList.remove('active');
            
            // Activate next step if exists
            const nextStep = document.getElementById(`step${stepNumber + 1}`);
            if (nextStep) {
                nextStep.classList.add('active');
            }
        }
    }

    async handlePurchaseSuccess(data) {
        // Simulate progress updates
        this.updateProgressStep(1, true);
        await this.delay(1000);
        
        this.updateProgressStep(2, true);
        await this.delay(1000);
        
        this.updateProgressStep(3, true);
        await this.delay(1000);
        
        this.updateProgressStep(4, true);
        await this.delay(500);

        // Update status
        document.getElementById('statusIcon').textContent = '✅';
        document.getElementById('statusTitle').textContent = 'Purchase Successful!';
        document.getElementById('statusMessage').textContent = data.message;
        
        // Show transaction details
        document.getElementById('transactionDetails').style.display = 'block';
        document.getElementById('nftTokenId').textContent = data.nft_token_id || 'N/A';
        document.getElementById('nftSerial').textContent = data.nft_serial || 'N/A';
        document.getElementById('userAccountId').textContent = data.user_account_id || 'N/A';
        
        // Show success button
        document.getElementById('successBtn').style.display = 'inline-block';
    }

    handlePurchaseError(error) {
        document.getElementById('statusIcon').textContent = '❌';
        document.getElementById('statusTitle').textContent = 'Purchase Failed';
        document.getElementById('statusMessage').textContent = error;
        document.getElementById('retryBtn').style.display = 'inline-block';
    }

    backToSelection() {
        this.showTicketSelection();
    }

    async handlePurchaseSuccess() {
        // Close the ticket window and potentially start matrix challenge
        closeWindow('nftTicketWindow');
        
        // Show success notification
        showNotification('NFT ticket purchased successfully!', 'success');
        
        // Optionally start the matrix challenge automatically
        if (typeof matrixEngine !== 'undefined') {
            // You might want to start the matrix challenge here
            // matrixEngine.startMatrixChallenge(this.currentSelectionId);
        }
    }

    retryPurchase() {
        this.showPurchaseSection();
        document.getElementById('retryBtn').style.display = 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showError(message) {
        showNotification(message, 'error');
    }

    // Utility function to get user's tickets
    async getUserTickets() {
        try {
            const response = await fetch(`${this.baseUrl}/my-tickets/`);
            const data = await response.json();
            
            if (data.success) {
                return data.tickets;
            }
            return [];
        } catch (error) {
            console.error('Error fetching user tickets:', error);
            return [];
        }
    }
}

// Initialize the engine when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.nftEngine = new NFTTicketEngine();
    
    // Make NFT ticket window draggable
    makeDraggable('nftTicketWindow');
});

// Add to your dock items to open NFT window
function openNFTTicketWindow(selectionId, projectData) {
    if (typeof nftEngine !== 'undefined') {
        nftEngine.openTicketWindow(selectionId, projectData);
    }
}