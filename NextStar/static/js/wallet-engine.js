// static/js/wallet-engine.js
class WalletEngine {
    constructor() {
        this.currentTab = 'overview';
        this.currentPaymentMethod = 'card';
        this.selectedCrypto = null;
        this.staPrice = 0.10; // $0.10 per STA
        this.apiBase = '/wallet/api';
    }

    async init() {
        console.log('💰 Initializing Wallet Engine...');
        await this.loadWalletData();
        this.setupEventListeners();
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
            console.error('Wallet API request failed:', error);
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

    async loadWalletData() {
        try {
            const response = await this.makeRequest('/overview/');
            if (response.success) {
                this.updateWalletUI(response.wallet_data);
                this.updateTransactionList(response.recent_transactions);
            } else {
                this.showNotification('Failed to load wallet data', 'error');
            }
        } catch (error) {
            console.error('Error loading wallet data:', error);
        }
    }

    async loadHederaData() {
        try {
            const response = await this.makeRequest('/hedera/');
            if (response.success) {
                this.updateHederaUI(response.hedera_data);
                this.updateHederaTransactionList(response.transactions);
            } else {
                this.showNotification('Failed to load Hedera data', 'error');
            }
        } catch (error) {
            console.error('Error loading Hedera data:', error);
        }
    }

    async loadTransactionHistory(filter = 'all') {
        try {
            const response = await this.makeRequest(`/transactions/?filter=${filter}`);
            if (response.success) {
                this.updateTransactionList(response.transactions);
            } else {
                this.showNotification('Failed to load transactions', 'error');
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    updateWalletUI(walletData) {
        if (!walletData) return;

        const elements = {
            'walletStars': walletData.starpoints,
            'walletTickets': walletData.tickets,
            'walletCoins': walletData.coins.toLocaleString(),
            'starsValue': (walletData.starpoints * this.staPrice).toFixed(2),
            'ticketsValue': `Active: ${walletData.tickets}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updateHederaUI(hederaData) {
        if (!hederaData) return;

        const elements = {
            'hederaAccountId': hederaData.account_id,
            'hederaRecipientId': hederaData.recipient_id,
            'hederaBalance': hederaData.balance
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updateTransactionList(transactions) {
        const container = document.getElementById('transactionList');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions">No transactions found</div>';
            return;
        }

        container.innerHTML = transactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-icon">${tx.icon || '💰'}</div>
                <div class="transaction-details">
                    <div class="transaction-title">${tx.type}</div>
                    <div class="transaction-date">${tx.date}</div>
                    ${tx.transaction_hash ? `
                        <div class="transaction-hash" title="${tx.transaction_hash}">
                            ${tx.transaction_hash.slice(0, 16)}...
                        </div>
                    ` : ''}
                </div>
                <div class="transaction-amount ${tx.amount.startsWith('+') ? 'positive' : 'negative'}">
                    ${tx.amount}<br>
                    <small>${tx.value}</small>
                </div>
            </div>
        `).join('');
    }

    updateHederaTransactionList(transactions) {
        const container = document.getElementById('hederaTransactionList');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions">No Hedera transactions</div>';
            return;
        }

        container.innerHTML = transactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-icon">⚡</div>
                <div class="transaction-details">
                    <div class="transaction-title">${tx.type}</div>
                    <div class="transaction-date">${tx.date}</div>
                </div>
                <div class="transaction-amount ${tx.amount.startsWith('+') ? 'positive' : 'negative'}">
                    ${tx.amount}
                </div>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.wallet-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.wallet-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const targetTab = document.getElementById(`wallet${this.capitalizeFirst(tabName)}Tab`);
        if (targetTab) targetTab.classList.add('active');
        
        // Activate selected tab button
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        switch(tabName) {
            case 'hedera':
                this.loadHederaData();
                break;
            case 'transactions':
                this.loadTransactionHistory();
                break;
        }
    }

    switchPaymentMethod(method) {
        // Hide all payment methods
        document.querySelectorAll('.payment-method').forEach(method => {
            method.style.display = 'none';
        });
        
        // Remove active class from all payment tabs
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected payment method
        const targetMethod = document.getElementById(`${method}Payment`);
        if (targetMethod) targetMethod.style.display = 'block';
        
        // Activate selected payment tab
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        this.currentPaymentMethod = method;
    }

    // STA Purchase Functions
    calculateTotal() {
        const staAmount = parseFloat(document.getElementById('staAmount')?.value) || 0;
        const totalCost = staAmount * this.staPrice;
        
        this.updateElement('previewSTA', staAmount);
        this.updateElement('totalCost', totalCost.toFixed(2));
        this.updateElement('finalAmount', totalCost.toFixed(2));
    }

    calculateBankTotal() {
        const staAmount = parseFloat(document.getElementById('bankSTA')?.value) || 0;
        const totalCost = staAmount * this.staPrice;
        this.updateElement('bankTotal', totalCost.toFixed(2));
    }

    async processSTAPurchase(method) {
        const staAmount = parseFloat(document.getElementById('staAmount')?.value) || 0;
        
        if (staAmount < 10) {
            this.showNotification('Minimum purchase is 10 STA', 'error');
            return;
        }

        try {
            const response = await this.makeRequest('/buy-sta/', {
                method: 'POST',
                body: JSON.stringify({ amount: staAmount })
            });

            if (response.success) {
                this.showNotification(response.message, 'success');
                await this.loadWalletData(); // Refresh wallet data
                
                // Reset form
                const staAmountInput = document.getElementById('staAmount');
                if (staAmountInput) staAmountInput.value = '';
                this.calculateTotal();
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('STA purchase failed:', error);
        }
    }

    // Crypto Functions
    selectCrypto(crypto) {
        this.selectedCrypto = crypto;
        
        // Update UI
        document.querySelectorAll('.crypto-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        if (event && event.target) {
            event.target.classList.add('selected');
        }
        
        // Show payment details
        const paymentDetails = document.getElementById('cryptoPaymentDetails');
        if (paymentDetails) paymentDetails.style.display = 'block';
        
        // Set crypto-specific details
        const addresses = {
            'BTC': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            'ETH': '0x742d35Cc6634C0532925a3b8Df59C5C85C2b1a1c',
            'HBAR': '0.0.1234567',
            'USDC': '0x742d35Cc6634C0532925a3b8Df59C5C85C2b1a1c'
        };
        
        this.updateElement('cryptoAddress', addresses[crypto] || '');
        
        // Calculate crypto amount
        const staAmount = parseFloat(document.getElementById('staAmount')?.value) || 0;
        const totalUSD = staAmount * this.staPrice;
        this.updateCryptoAmount(totalUSD, crypto);
    }

    copyCryptoAddress() {
        this.copyToClipboard('cryptoAddress');
    }

    updateCryptoAmount(usdAmount, crypto) {
        // Example exchange rates (in production, fetch from API)
        const rates = {
            'BTC': 0.000023,
            'ETH': 0.00032,
            'HBAR': 25,
            'USDC': 1
        };
        
        const cryptoAmount = usdAmount * (rates[crypto] || 1);
        this.updateElement('cryptoAmount', `${cryptoAmount.toFixed(8)} ${crypto}`);
    }

    // Send/Receive Functions
    async confirmSend() {
        const recipient = document.getElementById('sendTo')?.value;
        const amount = parseFloat(document.getElementById('sendAmount')?.value);
        const memo = document.getElementById('sendMemo')?.value;

        if (!recipient || !amount || amount <= 0) {
            this.showNotification('Please fill in all required fields with valid amounts', 'error');
            return;
        }

        if (!this.isValidHederaAccountId(recipient)) {
            this.showNotification('Invalid Hedera account ID format (should be 0.0.1234567)', 'error');
            return;
        }

        try {
            const response = await this.makeRequest('/send-sta/', {
                method: 'POST',
                body: JSON.stringify({
                    recipient_id: recipient,
                    amount: amount,
                    memo: memo || ''
                })
            });

            if (response.success) {
                this.showNotification(response.message, 'success');
                this.closeSendModal();
                await this.loadWalletData(); // Refresh balances
            } else {
                this.showNotification(response.error, 'error');
            }
        } catch (error) {
            console.error('Send failed:', error);
        }
    }

    // Modal Functions
    showSendModal() {
        this.showModal('sendModal');
        // Clear previous inputs
        this.clearInput('sendTo');
        this.clearInput('sendAmount');
        this.clearInput('sendMemo');
    }

    closeSendModal() {
        this.hideModal('sendModal');
    }

    showReceiveModal() {
        this.showModal('receiveModal');
    }

    closeReceiveModal() {
        this.hideModal('receiveModal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    // Utility Functions
    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.showNotification('Failed to copy to clipboard', 'error');
        });
    }

    copyReceiveAddress() {
        this.copyToClipboard('receiveAddress');
    }

    openExplorer(type) {
        const accountId = document.getElementById('hederaAccountId')?.textContent;
        if (!accountId) return;

        const baseUrl = 'https://hashscan.io/mainnet';
        let url = '';
        
        switch(type) {
            case 'account':
                url = `${baseUrl}/account/${accountId}`;
                break;
            case 'transactions':
                url = `${baseUrl}/account/${accountId}?transactionType=CRYPTOTRANSFER`;
                break;
            case 'tokens':
                url = `${baseUrl}/token/0.0.123456`; // Replace with actual STA token ID
                break;
        }
        
        if (url) window.open(url, '_blank');
    }

    filterTransactions() {
        const filter = document.getElementById('transactionFilter')?.value || 'all';
        this.loadTransactionHistory(filter);
    }

    confirmBankTransfer() {
        const staAmount = parseFloat(document.getElementById('bankSTA')?.value) || 0;
        
        if (staAmount < 10) {
            this.showNotification('Minimum purchase is 10 STA', 'error');
            return;
        }

        this.showNotification('Bank transfer instructions sent! Please allow 1-3 business days for processing.', 'info');
        
        // Reset form
        const bankInput = document.getElementById('bankSTA');
        if (bankInput) bankInput.value = '';
        this.calculateBankTotal();
    }

    // Validation
    isValidHederaAccountId(accountId) {
        return /^\d+\.\d+\.\d+$/.test(accountId);
    }

    // Helper Methods
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    clearInput(id) {
        const element = document.getElementById(id);
        if (element) element.value = '';
    }

    setupEventListeners() {
        // STA amount input listeners
        const staAmountInput = document.getElementById('staAmount');
        if (staAmountInput) {
            staAmountInput.addEventListener('input', () => this.calculateTotal());
        }

        // Bank STA input listener
        const bankSTAInput = document.getElementById('bankSTA');
        if (bankSTAInput) {
            bankSTAInput.addEventListener('input', () => this.calculateBankTotal());
        }

        // Transaction filter
        const transactionFilter = document.getElementById('transactionFilter');
        if (transactionFilter) {
            transactionFilter.addEventListener('change', () => this.filterTransactions());
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSendModal();
                this.closeReceiveModal();
            }
        });
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
                max-width: 300px;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        }
    }

    // Public methods for HTML onclick handlers
    async refreshWallet() {
        await this.loadWalletData();
        this.showNotification('Wallet data refreshed', 'success');
    }
}

// Initialize the wallet engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletEngine = new WalletEngine();
    window.walletEngine.init();
});

// Make methods available for HTML onclick handlers
window.switchWalletTab = (tabName) => window.walletEngine.switchTab(tabName);
window.switchPaymentMethod = (method) => window.walletEngine.switchPaymentMethod(method);
window.selectCrypto = (crypto) => window.walletEngine.selectCrypto(crypto);
window.processSTAPurchase = (method) => window.walletEngine.processSTAPurchase(method);
window.confirmBankTransfer = () => window.walletEngine.confirmBankTransfer();
window.showSendModal = () => window.walletEngine.showSendModal();
window.closeSendModal = () => window.walletEngine.closeSendModal();
window.showReceiveModal = () => window.walletEngine.showReceiveModal();
window.closeReceiveModal = () => window.walletEngine.closeReceiveModal();
window.copyToClipboard = (elementId) => window.walletEngine.copyToClipboard(elementId);
window.copyCryptoAddress = () => window.walletEngine.copyCryptoAddress();
window.copyReceiveAddress = () => window.walletEngine.copyReceiveAddress();
window.openExplorer = (type) => window.walletEngine.openExplorer(type);
window.confirmSend = () => window.walletEngine.confirmSend();
window.refreshWallet = () => window.walletEngine.refreshWallet();