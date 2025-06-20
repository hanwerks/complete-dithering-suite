/**
 * Collapsible Sections Manager
 * Handles toggling of parameter panel sections
 */
class CollapsibleSections {
    constructor() {
        this.init();
        
        if (window.devLogger) {
            this.logger = window.devLogger;
            this.logger.logInfo('CollapsibleSections', 'Collapsible sections initialized');
        }
    }

    init() {
        // Find all section headers and add click listeners
        const sectionHeaders = document.querySelectorAll('.section-header');
        
        sectionHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                this.toggleSection(header);
            });
        });

        // Set initial state - start with all sections expanded
        this.expandAllSections();
    }

    toggleSection(header) {
        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);
        const toggleIcon = header.querySelector('.toggle-icon');

        if (!content || !toggleIcon) return;

        // Toggle collapsed state
        const isCollapsed = header.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand section
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
            toggleIcon.textContent = '▼';
        } else {
            // Collapse section
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            toggleIcon.textContent = '▶';
        }

        if (this.logger) {
            this.logger.logInfo('CollapsibleSections', 
                `Section "${targetId}" ${isCollapsed ? 'expanded' : 'collapsed'}`);
        }
    }

    expandAllSections() {
        const sectionHeaders = document.querySelectorAll('.section-header');
        
        sectionHeaders.forEach(header => {
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const toggleIcon = header.querySelector('.toggle-icon');

            if (content && toggleIcon) {
                header.classList.remove('collapsed');
                content.classList.remove('collapsed');
                toggleIcon.textContent = '▼';
            }
        });
    }

    collapseAllSections() {
        const sectionHeaders = document.querySelectorAll('.section-header');
        
        sectionHeaders.forEach(header => {
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const toggleIcon = header.querySelector('.toggle-icon');

            if (content && toggleIcon) {
                header.classList.add('collapsed');
                content.classList.add('collapsed');
                toggleIcon.textContent = '▶';
            }
        });
    }

    expandSection(targetId) {
        const header = document.querySelector(`[data-target="${targetId}"]`);
        if (header && header.classList.contains('collapsed')) {
            this.toggleSection(header);
        }
    }

    collapseSection(targetId) {
        const header = document.querySelector(`[data-target="${targetId}"]`);
        if (header && !header.classList.contains('collapsed')) {
            this.toggleSection(header);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.collapsibleSections = new CollapsibleSections();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollapsibleSections;
}