// wallet-engine.js
class WalletEngine {
    constructor() {
        this.currentTab = 'overview';
        this.currentPaymentMethod = 'card';
        this.selectedCrypto = null;
        this.staPrice = 0.10; // $0.10 per STA
    }

    init() {
        this.loadWalletData();
        this.setupEventListeners();
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
        document.getElementById(`wallet${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
        
        // Activate selected tab button
        event.target.classList.add('active');
        
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
        document.getElementById(`${method}Payment`).style.display = 'block';
        
        // Activate selected payment tab
        event.target.classList.add('active');
        
        this.currentPaymentMethod = method;
    }

    // Hedera Functions
    loadHederaData() {
        // In a real implementation, this would fetch from your backend
        const hederaData = {
            accountId: '0.0.1234567',
            recipientId: '{{ user.hedera_recipient_id }}',
            balance: '125.75',
            recentTransactions: [
                { id: '1', type: 'STA Purchase', amount: '+100 STA', date: '2 hours ago' },
                { id: '2', type: 'Ticket Purchase', amount: '-5 STA', date: '1 day ago' },
                { id: '3', type: 'Reward', amount: '+25 STA', date: '2 days ago' }
            ]
        };

        document.getElementById('hederaAccountId').textContent = hederaData.accountId;
        document.getElementById('hederaRecipientId').textContent = hederaData.recipientId;
        document.getElementById('hederaBalance').textContent = hederaData.balance;

        this.updateHederaTransactionList(hederaData.recentTransactions);
    }

    copyToClipboard(elementId) {
        const text = document.getElementById(elementId).textContent;
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.showNotification('Failed to copy', 'error');
        });
    }

    openExplorer(type) {
        const accountId = document.getElementById('hederaAccountId').textContent;
        let url = '';
        
        switch(type) {
            case 'account':
                url = `https://hashscan.io/mainnet/account/${accountId}`;
                break;
            case 'transactions':
                url = `https://hashscan.io/mainnet/account/${accountId}?transactionType=CRYPTOTRANSFER`;
                break;
            case 'tokens':
                url = `https://hashscan.io/mainnet/token/0.0.123456`; // Replace with actual STA token ID
                break;
        }
        
        window.open(url, '_blank');
    }

    // STA Purchase Functions
    calculateTotal() {
        const staAmount = parseFloat(document.getElementById('staAmount').value) || 0;
        const totalCost = staAmount * this.staPrice;
        
        document.getElementById('previewSTA').textContent = staAmount;
        document.getElementById('totalCost').textContent = totalCost.toFixed(2);
        document.getElementById('finalAmount').textContent = totalCost.toFixed(2);
    }

    calculateBankTotal() {
        const staAmount = parseFloat(document.getElementById('bankSTA').value) || 0;
        const totalCost = staAmount * this.staPrice;
        document.getElementById('bankTotal').textContent = totalCost.toFixed(2);
    }

    processSTAPurchase(method) {
        const staAmount = parseFloat(document.getElementById('staAmount').value) || 0;
        
        if (staAmount < 10) {
            this.showNotification('Minimum purchase is 10 STA', 'error');
            return;
        }

        // Simulate purchase processing
        this.showNotification(`Processing ${staAmount} STA purchase...`, 'info');
        
        // In real implementation, integrate with payment processor
        setTimeout(() => {
            this.showNotification(`Successfully purchased ${staAmount} STA!`, 'success');
            this.loadWalletData(); // Refresh wallet data
        }, 2000);
    }

    selectCrypto(crypto) {
        this.selectedCrypto = crypto;
        
        // Update UI
        document.querySelectorAll('.crypto-option').forEach(option => {
            option.classList.remove('selected');
        });
        event.target.classList.add('selected');
        
        // Show payment details
        document.getElementById('cryptoPaymentDetails').style.display = 'block';
        
        // Set crypto-specific details (in real app, get from backend)
        const addresses = {
            'BTC': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            'ETH': '0x742d35Cc6634C0532925a3b8Df59C5C85C2b1a1c',
            'HBAR': '0.0.1234567',
            'USDC': '0x742d35Cc6634C0532925a3b8Df59C5C85C2b1a1c'
        };
        
        document.getElementById('cryptoAddress').textContent = addresses[crypto];
        
        // Calculate crypto amount
        const staAmount = parseFloat(document.getElementById('staAmount').value) || 0;
        const totalUSD = staAmount * this.staPrice;
        this.updateCryptoAmount(totalUSD, crypto);
    }

    copyCryptoAddress() {
        this.copyToClipboard('cryptoAddress');
    }

    updateCryptoAmount(usdAmount, crypto) {
        // This would use real exchange rates in production
        const rates = {
            'BTC': 0.000023, // Example rate
            'ETH': 0.00032,
            'HBAR': 25,
            'USDC': 1
        };
        
        const cryptoAmount = usdAmount * rates[crypto];
        document.getElementById('cryptoAmount').textContent = `${cryptoAmount.toFixed(8)} ${crypto}`;
    }

    // Modal Functions
    showSendModal() {
        document.getElementById('sendModal').style.display = 'flex';
    }

    closeSendModal() {
        document.getElementById('sendModal').style.display = 'none';
    }

    showReceiveModal() {
        document.getElementById('receiveModal').style.display = 'flex';
    }

    closeReceiveModal() {
        document.getElementById('receiveModal').style.display = 'none';
    }

    copyReceiveAddress() {
        this.copyToClipboard('receiveAddress');
    }

    confirmSend() {
        const recipient = document.getElementById('sendTo').value;
        const amount = parseFloat(document.getElementById('sendAmount').value);
        const memo = document.getElementById('sendMemo').value;

        if (!recipient || !amount) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate Hedera account ID format
        if (!this.isValidHederaAccountId(recipient)) {
            this.showNotification('Invalid Hedera account ID format', 'error');
            return;
        }

        // Simulate transaction
        this.showNotification(`Sending ${amount} STA to ${recipient}...`, 'info');
        
        setTimeout(() => {
            this.showNotification('Transaction submitted successfully!', 'success');
            this.closeSendModal();
            this.loadWalletData();
        }, 2000);
    }

    isValidHederaAccountId(accountId) {
        return /^\d+\.\d+\.\d+$/.test(accountId);
    }

    // Data Loading Functions
    loadWalletData() {
        // Simulate API call to get wallet data
        const walletData = {
            stars: 100,
            tickets: 5,
            coins: 1000,
            starsValue: 10.00,
            activeTickets: 3
        };

        document.getElementById('walletStars').textContent = walletData.stars;
        document.getElementById('walletTickets').textContent = walletData.tickets;
        document.getElementById('walletCoins').textContent = walletData.coins.toLocaleString();
        document.getElementById('starsValue').textContent = walletData.starsValue.toFixed(2);
        document.getElementById('ticketsValue').textContent = `Active: ${walletData.activeTickets}`;
    }

    loadTransactionHistory() {
        // Simulate transaction data
        const transactions = [
            { id: 1, type: 'STA Purchase', icon: '⭐', amount: '+100 STA', value: '+$10.00', date: '2 hours ago', category: 'sta' },
            { id: 2, type: 'Ticket Purchase', icon: '🎫', amount: '-5 STA', value: '-$0.50', date: '1 day ago', category: 'tickets' },
            { id: 3, type: 'Hedera Reward', icon: '⚡', amount: '+25 STA', value: '+$2.50', date: '2 days ago', category: 'hedera' },
            { id: 4, type: 'Game Reward', icon: '🏆', amount: '+50 STA', value: '+$5.00', date: '3 days ago', category: 'rewards' }
        ];

        this.updateTransactionList(transactions);
    }

    updateTransactionList(transactions) {
        const container = document.getElementById('transactionList');
        container.innerHTML = '';

        transactions.forEach(transaction => {
            const transactionEl = document.createElement('div');
            transactionEl.className = 'transaction-item';
            transactionEl.innerHTML = `
                <div class="transaction-icon">${transaction.icon}</div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.type}</div>
                    <div class="transaction-date">${transaction.date}</div>
                </div>
                <div class="transaction-amount ${transaction.amount.startsWith('+') ? 'positive' : 'negative'}">
                    ${transaction.amount}<br>
                    <small>${transaction.value}</small>
                </div>
            `;
            container.appendChild(transactionEl);
        });
    }

    updateHederaTransactionList(transactions) {
        const container = document.getElementById('hederaTransactionList');
        container.innerHTML = '';

        transactions.forEach(transaction => {
            const transactionEl = document.createElement('div');
            transactionEl.className = 'transaction-item';
            transactionEl.innerHTML = `
                <div class="transaction-icon">⚡</div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.type}</div>
                    <div class="transaction-date">${transaction.date}</div>
                </div>
                <div class="transaction-amount ${transaction.amount.startsWith('+') ? 'positive' : 'negative'}">
                    ${transaction.amount}
                </div>
            `;
            container.appendChild(transactionEl);
        });
    }

    filterTransactions() {
        const filter = document.getElementById('transactionFilter').value;
        // In real implementation, this would filter the transaction list
        this.showNotification(`Filtering by: ${filter}`, 'info');
    }

    // Utility Functions
    showNotification(message, type = 'info') {
        // Use your existing notification system
        if (typeof showNotification !== 'undefined') {
            showNotification(message, type);
        } else {
            alert(message); // Fallback
        }
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
    }
}

// Initialize wallet engine
const walletEngine = new WalletEngine();

// Make available globally
window.walletEngine = walletEngine;