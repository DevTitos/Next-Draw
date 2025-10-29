// NFT Generator System
class NFTGenerator {
    constructor() {
        this.currentNFT = null;
        this.init();
    }

    init() {
        // Set up event listeners for NFT controls
        document.getElementById('nftChallenge').addEventListener('change', this.updateNFTPreview.bind(this));
        document.getElementById('nftTheme').addEventListener('change', this.updateNFTPreview.bind(this));
        document.getElementById('nftRarity').addEventListener('change', this.updateNFTPreview.bind(this));
        
        this.updateNFTPreview();
    }

    updateNFTPreview() {
        const challenge = document.getElementById('nftChallenge').value;
        const theme = document.getElementById('nftTheme').value;
        const rarity = document.getElementById('nftRarity').value;

        // Update NFT display
        document.getElementById('nftTitle').textContent = this.getChallengeTitle(challenge);
        document.getElementById('nftDescription').textContent = this.getRarityDescription(rarity);
        document.getElementById('attrChallenge').textContent = this.formatChallenge(challenge);
        document.getElementById('attrRarity').textContent = this.formatRarity(rarity);
        document.getElementById('attrOwnership').textContent = this.calculateOwnership(rarity);

        // Update visual styles based on selections
        this.updateVisualStyle(theme, rarity);
    }

    getChallengeTitle(challenge) {
        const titles = {
            business: 'BUSINESS INNOVATOR',
            technology: 'TECH PIONEER', 
            science: 'SCIENCE VISIONARY',
            social: 'SOCIAL CHANGEMAKER'
        };
        return titles[challenge] || 'STAR TOKEN';
    }

    getRarityDescription(rarity) {
        const descriptions = {
            common: 'Basic Innovation Certificate',
            rare: 'Advanced Solution Token',
            epic: 'Elite Venture NFT',
            legendary: 'Founder Legacy Token'
        };
        return descriptions[rarity] || 'African Innovation Certificate';
    }

    formatChallenge(challenge) {
        return challenge.charAt(0).toUpperCase() + challenge.slice(1);
    }

    formatRarity(rarity) {
        return rarity.charAt(0).toUpperCase() + rarity.slice(1);
    }

    calculateOwnership(rarity) {
        const ownership = {
            common: '0.1%',
            rare: '0.25%', 
            epic: '0.5%',
            legendary: '1.0%'
        };
        return ownership[rarity] || '0.1%';
    }

    updateVisualStyle(theme, rarity) {
        const nftBackground = document.querySelector('.nft-background');
        const nftBase = document.querySelector('.nft-base');

        // Reset classes
        nftBackground.className = 'nft-background';
        nftBase.className = 'nft-base';

        // Apply theme
        nftBackground.classList.add(`theme-${theme}`);
        
        // Apply rarity
        nftBase.classList.add(`rarity-${rarity}`);
    }

    async generateNFT() {
        const challenge = document.getElementById('nftChallenge').value;
        const theme = document.getElementById('nftTheme').value;
        const rarity = document.getElementById('nftRarity').value;

        try {
            // Capture the NFT as an image
            const nftElement = document.getElementById('nftCanvas');
            const canvas = await html2canvas(nftElement, {
                backgroundColor: null,
                scale: 2 // Higher quality
            });

            // Convert to blob and create download link
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `nextstar-nft-${challenge}-${rarity}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            });

            window.modalManager.showNotification('NFT image generated successfully!', 'success');
            updateTerminal(`NFT generated: ${challenge} - ${rarity}`);

        } catch (error) {
            console.error('Error generating NFT:', error);
            window.modalManager.showNotification('Error generating NFT image', 'error');
        }
    }

    async mintNFT() {
        const challenge = document.getElementById('nftChallenge').value;
        const rarity = document.getElementById('nftRarity').value;

        // Simulate Hedera minting process
        window.modalManager.showNotification('Minting NFT on Hedera...', 'success');
        
        try {
            // In a real implementation, this would call your Django backend
            // which would then interact with Hedera
            const response = await this.simulateHederaMint(challenge, rarity);
            
            window.modalManager.showNotification('NFT minted successfully on Hedera!', 'success');
            updateTerminal(`NFT minted: Token ID ${response.tokenId}`);
            
        } catch (error) {
            window.modalManager.showNotification('Error minting NFT on Hedera', 'error');
        }
    }

    async simulateHederaMint(challenge, rarity) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    tokenId: `0.0.${Math.floor(Math.random() * 1000000)}`,
                    transactionId: `0.0.${Math.floor(Math.random() * 1000000000)}`,
                    challenge: challenge,
                    rarity: rarity
                });
            }, 3000);
        });
    }
}

// Global functions for HTML onclick
function generateNFT() {
    window.nftGenerator.generateNFT();
}

function mintNFT() {
    window.nftGenerator.mintNFT();
}

// Add CSS for NFT themes and rarities
const style = document.createElement('style');
style.textContent = `
    .theme-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; }
    .theme-pattern { 
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4) !important;
        background-size: 400% 400% !important;
        animation: gradientShift 10s ease infinite !important;
    }
    .theme-solid { background: #2c3e50 !important; }

    .rarity-common .nft-glow { opacity: 0.3; }
    .rarity-rare .nft-glow { opacity: 0.5; background: radial-gradient(circle, #4ecdc4 0%, transparent 70%); }
    .rarity-epic .nft-glow { opacity: 0.7; background: radial-gradient(circle, #9b59b6 0%, transparent 70%); }
    .rarity-legendary .nft-glow { opacity: 0.9; background: radial-gradient(circle, #f1c40f 0%, transparent 70%); }

    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
`;
document.head.appendChild(style);

// Initialize NFT generator
let nftGenerator;
document.addEventListener('DOMContentLoaded', () => {
    nftGenerator = new NFTGenerator();
    window.nftGenerator = nftGenerator;
});