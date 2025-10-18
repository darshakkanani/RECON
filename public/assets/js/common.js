// ADIYOGI Common JavaScript - Shared functionality across all pages

// Common API endpoints
const API_BASE = '/api/v2';
const ENDPOINTS = {
    stats: `${API_BASE}/stats`,
    health: '/health',
    tools: `${API_BASE}/tools`
};

// Common utility functions
const Utils = {
    // Format bytes to human readable format
    formatBytes: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    // Format uptime to human readable format
    formatUptime: (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    },

    // Show notification
    showNotification: (message, type = 'info') => {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Could be extended to show actual UI notifications
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Common API functions
const API = {
    // Fetch system stats
    getStats: async () => {
        try {
            const response = await fetch(ENDPOINTS.stats);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            return null;
        }
    },

    // Check system health
    getHealth: async () => {
        try {
            const response = await fetch(ENDPOINTS.health);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to fetch health:', error);
            return null;
        }
    },

    // Get available tools
    getTools: async () => {
        try {
            const response = await fetch(ENDPOINTS.tools);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to fetch tools:', error);
            return null;
        }
    }
};

// Common navigation functions
const Navigation = {
    // Navigate to a page
    goTo: (path) => {
        window.location.href = path;
    },

    // Common navigation routes
    routes: {
        dashboard: '/',
        recon: '/recon',
        subdomainDiscovery: '/subdomain-discovery',
        activeDiscovery: '/active-discovery',
        dns: '/dns',
        osint: '/osint',
        javascript: '/javascript-mining',
        code: '/code-repository',
        parameters: '/parameters',
        webapp: '/webapp',
        cloud: '/cloud',
        mobile: '/mobile',
        health: '/health'
    }
};

// Common event handlers
const EventHandlers = {
    // Handle card clicks with navigation
    setupCardNavigation: () => {
        document.querySelectorAll('[data-navigate]').forEach(card => {
            card.addEventListener('click', function() {
                const route = this.getAttribute('data-navigate');
                if (Navigation.routes[route]) {
                    Navigation.goTo(Navigation.routes[route]);
                }
            });
        });
    },

    // Handle button hover effects
    setupButtonEffects: () => {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-1px)';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    },

    // Prevent event bubbling for nested clickable elements
    preventBubbling: () => {
        document.querySelectorAll('.prevent-bubble').forEach(element => {
            element.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
    }
};

// Common initialization
const Common = {
    init: () => {
        console.log('ADIYOGI Common JavaScript initialized');
        EventHandlers.setupCardNavigation();
        EventHandlers.setupButtonEffects();
        EventHandlers.preventBubbling();
    }
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', Common.init);

// Export for use in other scripts
window.ADIYOGI = {
    Utils,
    API,
    Navigation,
    EventHandlers,
    Common
};
