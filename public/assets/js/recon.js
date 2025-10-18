// ADIYOGI Recon Hub JavaScript

// Tab functionality with navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabText = this.textContent.trim();
        
        // Navigate to different pages based on tab
        switch(tabText) {
            case 'Dashboard':
                window.location.href = '/';
                break;
            case 'Recon':
                // Already on recon, just update active state
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                break;
            case 'CVE Testing':
                window.location.href = '/webapp';
                break;
            case 'Enumeration':
                window.location.href = '/subdomain';
                break;
            case 'Ops Testing':
                window.location.href = '/active';
                break;
            case 'Input Testing':
                window.location.href = '/parameters';
                break;
            case 'Bypass Testing':
                window.location.href = '/dns';
                break;
            case 'Feature Testing':
                window.location.href = '/javascript';
                break;
            case 'Creative Testing':
                window.location.href = '/osint';
                break;
            case 'Chaining':
                window.location.href = '/code';
                break;
            case 'Report':
                window.location.href = '/cloud';
                break;
            case 'Delete':
                window.location.href = '/mobile';
                break;
            default:
                // For unknown tabs, just update active state
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
        }
    });
});

// Scroll to category function
function scrollToCategory(categoryId) {
    const element = document.getElementById(categoryId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the card temporarily
        element.classList.add('highlight');
        element.style.borderColor = '#3182ce';
        element.style.boxShadow = '0 8px 25px rgba(49, 130, 206, 0.3)';
        
        setTimeout(() => {
            element.classList.remove('highlight');
            element.style.borderColor = '#4a5568';
            element.style.boxShadow = 'none';
        }, 2000);
    }
}

// Enhanced card hover effects
document.querySelectorAll('.recon-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-4px)';
        // Add subtle glow effect
        this.style.boxShadow = '0 12px 30px rgba(49, 130, 206, 0.1)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
    });
});

// Prevent action buttons from triggering card click
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});

// Recon-specific functionality
const ReconHub = {
    // Initialize recon hub
    init: function() {
        this.setupCategoryFiltering();
        this.setupSearchFunctionality();
        this.loadToolStats();
        console.log('Recon Hub initialized successfully');
    },

    // Setup category filtering
    setupCategoryFiltering: function() {
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                const categoryName = this.querySelector('.category-name').textContent.trim();
                ReconHub.filterByCategory(categoryName);
            });
        });
    },

    // Filter cards by category
    filterByCategory: function(categoryName) {
        const cards = document.querySelectorAll('.recon-card');
        cards.forEach(card => {
            const cardTitle = card.querySelector('.card-info h3').textContent.toLowerCase();
            const shouldShow = categoryName.toLowerCase().includes(cardTitle.split(' ')[0]) || 
                              cardTitle.includes(categoryName.toLowerCase().split(' ')[1]);
            
            if (shouldShow) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease-in';
            } else {
                card.style.opacity = '0.3';
                card.style.transform = 'scale(0.95)';
            }
        });

        // Reset after 3 seconds
        setTimeout(() => {
            cards.forEach(card => {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        }, 3000);
    },

    // Setup search functionality
    setupSearchFunctionality: function() {
        // Add search input if it doesn't exist
        const sidebar = document.querySelector('.left-sidebar');
        const searchSection = document.createElement('div');
        searchSection.className = 'sidebar-section';
        searchSection.innerHTML = `
            <div class="sidebar-section-title">🔍 Quick Search</div>
            <input type="text" id="recon-search" placeholder="Search tools..." 
                   style="width: 100%; padding: 8px; background: #1a202c; border: 1px solid #4a5568; 
                          border-radius: 6px; color: #e0e0e0; font-size: 12px;">
        `;
        sidebar.insertBefore(searchSection, sidebar.firstChild);

        // Add search functionality
        const searchInput = document.getElementById('recon-search');
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            ReconHub.searchTools(searchTerm);
        });
    },

    // Search tools functionality
    searchTools: function(searchTerm) {
        const cards = document.querySelectorAll('.recon-card');
        cards.forEach(card => {
            const title = card.querySelector('.card-info h3').textContent.toLowerCase();
            const description = card.querySelector('.card-description').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.tool-tag')).map(tag => tag.textContent.toLowerCase());
            
            const matches = title.includes(searchTerm) || 
                           description.includes(searchTerm) || 
                           tags.some(tag => tag.includes(searchTerm));
            
            if (searchTerm === '' || matches) {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            } else {
                card.style.opacity = '0.2';
                card.style.transform = 'scale(0.95)';
            }
        });
    },

    // Load tool statistics
    loadToolStats: function() {
        // Update stats with real data if API is available
        if (window.ADIYOGI && window.ADIYOGI.API) {
            window.ADIYOGI.API.getStats().then(stats => {
                if (stats && stats.toolExecutor) {
                    const activeScans = document.querySelector('[data-stat="active-scans"]');
                    const totalTools = document.querySelector('[data-stat="total-tools"]');
                    
                    if (activeScans) {
                        activeScans.textContent = stats.toolExecutor.activeProcesses || 0;
                    }
                    if (totalTools) {
                        // Calculate total tools from cards
                        const toolCounts = Array.from(document.querySelectorAll('.tool-count-badge'))
                            .map(badge => parseInt(badge.textContent.match(/\d+/)[0]))
                            .reduce((sum, count) => sum + count, 0);
                        totalTools.textContent = toolCounts + '+';
                    }
                }
            });
        }
    },

    // Animate card entrance
    animateCards: function() {
        const cards = document.querySelectorAll('.recon-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    ReconHub.init();
    // Add a small delay for card animations
    setTimeout(() => {
        ReconHub.animateCards();
    }, 500);
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .recon-card {
        transition: all 0.3s ease;
    }
    
    #recon-search:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
    }
`;
document.head.appendChild(style);

console.log('ADIYOGI Recon Hub loaded successfully');
