// Enhanced Window Management System
class WindowManager {
    constructor() {
        this.openWindows = new Set();
        this.backdrop = null;
        this.init();
    }

    init() {
        this.createBackdrop();
        
        // Close windows when clicking backdrop
        this.backdrop.addEventListener('click', () => {
            this.closeAllWindows();
        });

        // Close window with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllWindows();
            }
        });

        // Make windows draggable
        this.makeWindowsDraggable();
    }

    createBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'window-backdrop';
        document.getElementById('gameContainer').appendChild(this.backdrop);
    }

    openWindow(windowId) {
        const window = document.getElementById(windowId);
        if (window) {
            // Show backdrop
            this.backdrop.style.display = 'block';
            
            // Reset window position to center
            window.style.left = '50%';
            window.style.top = '50%';
            window.style.transform = 'translate(-50%, -50%)';
            
            // Show window
            window.style.display = 'block';
            this.openWindows.add(windowId);
            
            // Bring to front
            this.bringToFront(window);
            
            // Add open animation
            gsap.fromTo(window, 
                { scale: 0.7, opacity: 0, y: -50 },
                { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
            );

            // Animate backdrop
            gsap.fromTo(this.backdrop,
                { opacity: 0 },
                { opacity: 1, duration: 0.3 }
            );
        }
    }

    closeWindow(windowId) {
        const window = document.getElementById(windowId);
        if (window) {
            gsap.to(window, {
                scale: 0.7,
                opacity: 0,
                y: 50,
                duration: 0.3,
                ease: 'back.in(1.7)',
                onComplete: () => {
                    window.style.display = 'none';
                    this.openWindows.delete(windowId);
                    
                    // Hide backdrop if no windows open
                    if (this.openWindows.size === 0) {
                        this.backdrop.style.display = 'none';
                    }
                }
            });

            // Animate backdrop if last window
            if (this.openWindows.size === 1) { // This is the last window
                gsap.to(this.backdrop, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => {
                        this.backdrop.style.display = 'none';
                    }
                });
            }
        }
    }

    closeAllWindows() {
        this.openWindows.forEach(windowId => {
            this.closeWindow(windowId);
        });
        this.openWindows.clear();
        
        // Hide backdrop
        gsap.to(this.backdrop, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                this.backdrop.style.display = 'none';
            }
        });
    }

    bringToFront(window) {
        const allWindows = document.querySelectorAll('.game-window');
        allWindows.forEach(w => {
            w.style.zIndex = '1000';
        });
        window.style.zIndex = '1001';
    }

    makeWindowsDraggable() {
        document.querySelectorAll('.window-header').forEach(header => {
            header.addEventListener('mousedown', this.dragStart.bind(this));
        });
    }

    dragStart(e) {
        if (e.target.classList.contains('window-close')) return;
        
        const window = e.target.closest('.game-window');
        if (!window) return;

        this.bringToFront(window);
        window.classList.add('dragging');

        const rect = window.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const dragMove = (e) => {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Calculate new position relative to viewport center
            const centerX = window.offsetWidth / 2;
            const centerY = window.offsetHeight / 2;
            
            window.style.left = `${x}px`;
            window.style.top = `${y}px`;
            window.style.transform = 'none'; // Remove centering transform during drag
        };

        const dragEnd = () => {
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            window.classList.remove('dragging');
        };

        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);

        e.preventDefault();
    }
}

// Global functions for HTML onclick
function openWindow(windowId) {
    windowManager.openWindow(windowId);
}

function closeWindow(windowId) {
    windowManager.closeWindow(windowId);
}

function buyTickets(count) {
    gameEngine.buyTickets(count);
    closeWindow('shopWindow');
}

// Initialize window manager
let windowManager;
document.addEventListener('DOMContentLoaded', () => {
    windowManager = new WindowManager();
});