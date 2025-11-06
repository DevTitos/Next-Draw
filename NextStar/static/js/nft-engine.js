// static/matrix_ceo/js/nft-engine.js
class NFTTicketEngine {
    constructor() {
        this.currentSelectionId = null;
        this.selectedTicketType = null;
        this.currentProjectData = null;
        this.csrfToken = this.getCSRFToken();
        this.baseUrl = '/matrix-ceo';
        this.isProcessing = false;
    }

    getCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfToken ? csrfToken.value : '';
    }

    // Initialize the engine
    init() {
        console.log('NFT Ticket Engine initialized');
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Ticket selection cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ticket-card')) {
                const card = e.target.closest('.ticket-card');
                const ticketType = card.dataset.type;
                this.selectTicket(ticketType);
            }

            if (e.target.closest('.ticket-select-btn')) {
                const card = e.target.closest('.ticket-card');
                const ticketType = card.dataset.type;
                this.selectTicket(ticketType);
            }
        });

        // Purchase button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nftPurchaseBtn' || e.target.closest('#nftPurchaseBtn')) {
                this.purchaseTicket();
            }
        });

        // Back buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nftBackToSelection' || e.target.closest('#nftBackToSelection')) {
                this.backToSelection();
            }
        });

        // Success button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nftSuccessBtn' || e.target.closest('#nftSuccessBtn')) {
                this.handlePurchaseSuccess();
            }
        });

        // Retry button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nftRetryBtn' || e.target.closest('#nftRetryBtn')) {
                this.retryPurchase();
            }
        });
    }

    // Open NFT ticket window for a specific CEO selection
    openTicketWindow(selectionId, projectData = null) {
        this.currentSelectionId = selectionId;
        this.currentProjectData = projectData;
        
        // Reset state
        this.selectedTicketType = null;
        this.isProcessing = false;
        
        // Open the window
        openWindow('nftTicketWindow');
        
        // Load ticket info
        this.loadTicketInfo(selectionId, projectData);
    }

    async loadTicketInfo(selectionId, projectData = null) {
        try {
            this.showLoadingState();
            
            const response = await fetch(`${this.baseUrl}/selection/${selectionId}/ticket-info/`);
            const data = await response.json();

            if (data.success) {
                this.renderTicketInfo(data, projectData);
            } else {
                this.showError('Failed to load ticket information: ' + data.error);
                this.showTicketSelection(); // Fallback to showing ticket selection
            }
        } catch (error) {
            console.error('Error loading ticket info:', error);
            this.showError('Network error loading ticket information');
            this.showTicketSelection(); // Fallback to showing ticket selection
        } finally {
            this.hideLoadingState();
        }
    }

    renderTicketInfo(data, projectData = null) {
        // Show project info if available
        if (projectData || data.project_name) {
            this.showProjectInfo(projectData || data);
        }

        // Show appropriate section based on user's ticket status
        if (data.user_has_ticket && data.user_ticket) {
            this.showUserTickets(data.user_ticket);
        } else {
            this.showTicketSelection();
        }
    }

    showProjectInfo(projectData) {
        const projectInfoSection = document.getElementById('projectInfoSection');
        projectInfoSection.style.display = 'block';
        
        document.getElementById('projectName').textContent = projectData.name || projectData.project_name || 'Unknown Project';
        document.getElementById('projectVision').textContent = projectData.vision || projectData.vision_statement || 'No vision statement available';
        document.getElementById('projectDomain').textContent = projectData.domain || 'Unknown Domain';
        document.getElementById('projectStatus').textContent = 'Active';
    }

    showTicketSelection() {
        this.hideAllSections();
        document.getElementById('ticketSelectionSection').style.display = 'block';
        this.resetTicketSelection();
    }

    showPurchaseSection() {
        this.hideAllSections();
        document.getElementById('purchaseSection').style.display = 'block';
        
        // Update purchase details
        if (this.selectedTicketType) {
            const ticketInfo = this.getTicketInfo(this.selectedTicketType);
            document.getElementById('selectedTicketType').textContent = ticketInfo.name;
            document.getElementById('selectedTicketPrice').textContent = `${ticketInfo.price} HBAR`;
            document.getElementById('selectedProjectName').textContent = 
                document.getElementById('projectName').textContent;
        }
    }

    showPurchaseStatus() {
        this.hideAllSections();
        document.getElementById('purchaseStatusSection').style.display = 'block';
        this.resetProgressSteps();
    }

    showUserTickets(ticket) {
        this.hideAllSections();
        document.getElementById('userTicketsSection').style.display = 'block';
        
        const ticketsList = document.getElementById('ticketsList');
        if (ticket) {
            const ticketInfo = this.getTicketInfo(ticket.ticket_type);
            ticketsList.innerHTML = `
                <div class="ticket-item">
                    <div class="ticket-item-header">
                        <span class="ticket-type">${ticketInfo.name}</span>
                        <span class="ticket-date">${new Date(ticket.purchase_date).toLocaleDateString()}</span>
                    </div>
                    <div class="ticket-details">
                        <div><strong>Project:</strong> ${document.getElementById('projectName').textContent}</div>
                        <div><strong>NFT Token:</strong> ${ticket.nft_token_id || 'Processing...'}</div>
                        <div><strong>Serial Number:</strong> ${ticket.nft_serial || 'N/A'}</div>
                        <div><strong>Status:</strong> <span class="status-${ticket.status}">${ticket.status}</span></div>
                        <div><strong>Purchase Date:</strong> ${new Date(ticket.purchase_date).toLocaleString()}</div>
                    </div>
                    <div class="ticket-actions">
                        <button class="btn-primary" onclick="nftEngine.accessMatrixWithTicket(${this.currentSelectionId})">
                            Access Matrix Challenge
                        </button>
                    </div>
                </div>
            `;
        } else {
            ticketsList.innerHTML = '<div class="no-tickets">No active tickets found for this selection.</div>';
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
            const element = document.getElementById(section);
            if (element) element.style.display = 'none';
        });
    }

    resetTicketSelection() {
        document.querySelectorAll('.ticket-card').forEach(card => {
            card.classList.remove('selected');
        });
        this.selectedTicketType = null;
    }

    selectTicket(ticketType) {
        if (this.isProcessing) return;
        
        this.selectedTicketType = ticketType;
        
        // Update UI
        document.querySelectorAll('.ticket-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-type="${ticketType}"]`).classList.add('selected');
        
        this.showPurchaseSection();
    }

    getTicketInfo(ticketType) {
        const tickets = {
            standard: { 
                name: 'Standard Ticket', 
                price: 10,
                benefits: [
                    'Access to CEO Matrix Challenge',
                    'Basic voting rights',
                    'Progress tracking',
                    'Standard support'
                ]
            },
            premium: { 
                name: 'Premium Ticket', 
                price: 25,
                benefits: [
                    'All Standard benefits',
                    'Enhanced voting power',
                    'Priority support',
                    'Advanced analytics',
                    'Early feature access'
                ]
            },
            vip: { 
                name: 'VIP Ticket', 
                price: 100,
                benefits: [
                    'All Premium benefits',
                    'Maximum voting power',
                    'Exclusive insights',
                    'Direct CEO support',
                    'Early access to features',
                    'Priority queue position',
                    'Custom analytics dashboard'
                ]
            }
        };
        return tickets[ticketType] || tickets.standard;
    }

    async purchaseTicket() {
        if (this.isProcessing) return;
        
        if (!this.selectedTicketType) {
            this.showError('Please select a ticket type');
            return;
        }

        this.isProcessing = true;
        this.showPurchaseStatus();
        this.resetProgressSteps();
        this.updatePurchaseButton(true);

        try {
            // Step 1: Creating NFT
            this.updateProgressStep(1, true);
            this.updateStatusMessage('Creating NFT token on Hedera...');
            await this.delay(1500);

            // Step 2: Minting Ticket
            this.updateProgressStep(2, true);
            this.updateStatusMessage('Minting your NFT ticket...');
            await this.delay(1500);

            // Make actual API call
            const response = await fetch(`${this.baseUrl}/selection/${this.currentSelectionId}/purchase-ticket/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken
                },
                body: JSON.stringify({
                    ticket_type: this.selectedTicketType,
                    project_data: this.currentProjectData
                })
            });

            const data = await response.json();

            if (data.success) {
                // Step 3: Setting up Account
                this.updateProgressStep(3, true);
                this.updateStatusMessage('Setting up your Hedera account...');
                await this.delay(1000);

                // Step 4: Transferring NFT
                this.updateProgressStep(4, true);
                this.updateStatusMessage('Transferring NFT to your account...');
                await this.delay(1000);

                await this.handlePurchaseSuccess(data);
            } else {
                this.handlePurchaseError(data.error || 'Purchase failed');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            this.handlePurchaseError('Network error: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.updatePurchaseButton(false);
        }
    }

    resetProgressSteps() {
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.classList.remove('completed', 'active');
                if (i === 1) step.classList.add('active');
            }
        }
    }

    updateProgressStep(stepNumber, completed = false) {
        const step = document.getElementById(`step${stepNumber}`);
        if (step) {
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
    }

    updateStatusMessage(message) {
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }

    updatePurchaseButton(processing) {
        const purchaseBtn = document.getElementById('nftPurchaseBtn');
        if (purchaseBtn) {
            if (processing) {
                purchaseBtn.disabled = true;
                purchaseBtn.innerHTML = '<div class="loading-spinner-small"></div> Processing...';
            } else {
                purchaseBtn.disabled = false;
                purchaseBtn.textContent = 'Purchase Ticket';
            }
        }
    }

    async handlePurchaseSuccess(data) {
        // Final success update
        document.getElementById('statusIcon').textContent = '✅';
        document.getElementById('statusTitle').textContent = 'Purchase Successful!';
        document.getElementById('statusMessage').textContent = data.message || 'Your NFT ticket has been created and transferred to your account.';
        
        // Show transaction details
        const transactionDetails = document.getElementById('transactionDetails');
        transactionDetails.style.display = 'block';
        
        document.getElementById('nftTokenId').textContent = data.nft_token_id || 'N/A';
        document.getElementById('nftSerial').textContent = data.nft_serial || 'N/A';
        document.getElementById('userAccountId').textContent = data.user_account_id || 'N/A';
        
        // Show success button
        document.getElementById('nftSuccessBtn').style.display = 'inline-block';
        
        // Update user's local ticket count if available
        this.updateUserTicketCount();
        
        // Show success notification
        this.showSuccess('NFT ticket purchased successfully!');
    }

    handlePurchaseError(error) {
        document.getElementById('statusIcon').textContent = '❌';
        document.getElementById('statusTitle').textContent = 'Purchase Failed';
        document.getElementById('statusMessage').textContent = error;
        document.getElementById('nftRetryBtn').style.display = 'inline-block';
        
        this.showError('Ticket purchase failed: ' + error);
    }

    backToSelection() {
        if (this.isProcessing) return;
        this.showTicketSelection();
    }

    async handlePurchaseSuccess() {
        // Close the ticket window
        closeWindow('nftTicketWindow');
        
        // Show success notification
        this.showSuccess('NFT ticket purchased successfully! Accessing Matrix Challenge...');
        
        // Start the matrix challenge
        await this.accessMatrixWithTicket(this.currentSelectionId);
    }

    retryPurchase() {
        if (this.isProcessing) return;
        this.showPurchaseSection();
        document.getElementById('nftRetryBtn').style.display = 'none';
    }

    async accessMatrixWithTicket(selectionId) {
        try {
            // Start matrix challenge
            if (typeof matrixEngine !== 'undefined') {
                await matrixEngine.startMatrixChallenge(selectionId);
            } else {
                this.showError('Matrix engine not available');
            }
        } catch (error) {
            console.error('Error accessing matrix:', error);
            this.showError('Failed to access Matrix Challenge');
        }
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showLoadingState() {
        const loadingElement = document.getElementById('nftLoadingState');
        if (loadingElement) loadingElement.style.display = 'block';
    }

    hideLoadingState() {
        const loadingElement = document.getElementById('nftLoadingState');
        if (loadingElement) loadingElement.style.display = 'none';
    }

    showError(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            console.error('NFT Error:', message);
            alert('Error: ' + message);
        }
    }

    showSuccess(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            console.log('NFT Success:', message);
            alert('Success: ' + message);
        }
    }

    updateUserTicketCount() {
        // Update the ticket count in start menu if available
        const ticketCountElement = document.getElementById('startMenuTickets');
        if (ticketCountElement) {
            const currentCount = parseInt(ticketCountElement.textContent) || 0;
            ticketCountElement.textContent = currentCount + 1;
        }
    }

    // Public method to check if user has ticket for a selection
    async hasTicketForSelection(selectionId) {
        try {
            const response = await fetch(`${this.baseUrl}/selection/${selectionId}/ticket-info/`);
            const data = await response.json();
            return data.success && data.user_has_ticket;
        } catch (error) {
            console.error('Error checking ticket status:', error);
            return false;
        }
    }

    // Public method to get user's tickets
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

// Global functions for easy access
function openNFTTicketWindow(selectionId, projectData = null) {
    if (typeof nftEngine !== 'undefined') {
        nftEngine.openTicketWindow(selectionId, projectData);
    } else {
        console.error('NFT Engine not initialized');
    }
}

function purchaseNFTTicket(selectionId, ticketType) {
    if (typeof nftEngine !== 'undefined') {
        nftEngine.openTicketWindow(selectionId);
        // Auto-select ticket type if provided
        setTimeout(() => {
            nftEngine.selectTicket(ticketType);
        }, 100);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance
    window.nftEngine = new NFTTicketEngine();
    window.nftEngine.init();
    
    // Make NFT ticket window draggable
    if (typeof makeDraggable === 'function') {
        makeDraggable('nftTicketWindow');
    }
    
    console.log('NFT Ticket Engine loaded successfully');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NFTTicketEngine };
}