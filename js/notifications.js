/**
 * Modern notification system to replace alert() boxes
 * Provides toast notifications and confirmation modals
 */

class NotificationSystem {
    constructor() {
        this.createContainer();
    }

    createContainer() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (0 = permanent until clicked)
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${this.getTypeColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            min-width: 300px;
            max-width: 500px;
            pointer-events: all;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            line-height: 1.4;
        `;

        const icon = this.getIcon(type);
        toast.innerHTML = `
            <span style="font-size: 20px;">${icon}</span>
            <span style="flex: 1;">${message}</span>
            <span style="opacity: 0.7; font-size: 20px;">×</span>
        `;

        // Click to dismiss
        toast.addEventListener('click', () => {
            this.dismissToast(toast);
        });

        container.appendChild(toast);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismissToast(toast);
            }, duration);
        }

        return toast;
    }

    dismissToast(toast) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    getTypeColor(type) {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show a confirmation modal (replaces window.confirm)
     * @param {string} message - The message to display
     * @param {string} confirmText - Text for confirm button
     * @param {string} cancelText - Text for cancel button
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    confirm(message, confirmText = 'Confirmer', cancelText = 'Annuler') {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            `;

            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #2c3e50;
                color: #ecf0f1;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                max-width: 500px;
                min-width: 300px;
                animation: scaleIn 0.2s ease;
            `;

            modal.innerHTML = `
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="confirm-cancel" style="
                        padding: 10px 20px;
                        border: 1px solid rgba(255,255,255,0.2);
                        background: transparent;
                        color: #ecf0f1;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    ">${cancelText}</button>
                    <button id="confirm-ok" style="
                        padding: 10px 20px;
                        border: none;
                        background: #3498db;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">${confirmText}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Add hover effects
            const cancelBtn = modal.querySelector('#confirm-cancel');
            const okBtn = modal.querySelector('#confirm-ok');

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = 'rgba(255,255,255,0.1)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'transparent';
            });

            okBtn.addEventListener('mouseenter', () => {
                okBtn.style.background = '#2980b9';
            });
            okBtn.addEventListener('mouseleave', () => {
                okBtn.style.background = '#3498db';
            });

            // Handle clicks
            const closeModal = (result) => {
                overlay.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(result);
                }, 200);
            };

            cancelBtn.addEventListener('click', () => closeModal(false));
            okBtn.addEventListener('click', () => closeModal(true));

            // ESC to cancel
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            // Click overlay to cancel
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(false);
                }
            });
        });
    }

    /**
     * Show a prompt modal (replaces window.prompt)
     * @param {string} message - The message to display
     * @param {string} defaultValue - Default input value
     * @param {string} placeholder - Input placeholder
     * @returns {Promise<string|null>} - Resolves to input value or null if cancelled
     */
    prompt(message, defaultValue = '', placeholder = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #2c3e50;
                color: #ecf0f1;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                max-width: 500px;
                min-width: 300px;
                animation: scaleIn 0.2s ease;
            `;

            modal.innerHTML = `
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">${message}</p>
                <input type="text" id="prompt-input" value="${defaultValue}" placeholder="${placeholder}" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(0,0,0,0.2);
                    color: #ecf0f1;
                    border-radius: 6px;
                    font-size: 14px;
                    margin-bottom: 20px;
                    box-sizing: border-box;
                ">
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="prompt-cancel" style="
                        padding: 10px 20px;
                        border: 1px solid rgba(255,255,255,0.2);
                        background: transparent;
                        color: #ecf0f1;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    ">Annuler</button>
                    <button id="prompt-ok" style="
                        padding: 10px 20px;
                        border: none;
                        background: #3498db;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">OK</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const input = modal.querySelector('#prompt-input');
            const cancelBtn = modal.querySelector('#prompt-cancel');
            const okBtn = modal.querySelector('#prompt-ok');

            // Focus and select input
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);

            // Handle clicks
            const closeModal = (result) => {
                overlay.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(result);
                }, 200);
            };

            cancelBtn.addEventListener('click', () => {
                closeModal(null);
            });
            okBtn.addEventListener('click', () => {
                const value = input.value.trim();
                closeModal(value || null);
            });

            // Enter to confirm
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    closeModal(value || null);
                }
                if (e.key === 'Escape') {
                    closeModal(null);
                }
            });

            // Click overlay to cancel
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(null);
                }
            });
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes scaleIn {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    .toast:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }
`;
document.head.appendChild(style);

// Create global instance
window.notifications = new NotificationSystem();

// Export helper functions for easy use
window.showToast = (message, type, duration) => window.notifications.showToast(message, type, duration);
window.showSuccess = (message, duration) => window.notifications.showToast(message, 'success', duration);
window.showError = (message, duration) => window.notifications.showToast(message, 'error', duration);
window.showWarning = (message, duration) => window.notifications.showToast(message, 'warning', duration);
window.showInfo = (message, duration) => window.notifications.showToast(message, 'info', duration);
window.confirmAction = (message, confirmText, cancelText) => window.notifications.confirm(message, confirmText, cancelText);
window.promptUser = (message, defaultValue, placeholder) => window.notifications.prompt(message, defaultValue, placeholder);
