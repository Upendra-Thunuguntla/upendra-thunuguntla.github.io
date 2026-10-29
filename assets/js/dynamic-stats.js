/**
 * dynamic-stats.js
 * Handles dynamic calculation of experience years and tool counts.
 */
(function() {
    'use strict';

    function updateExperience() {
        const today = new Date();
        const experience = [
            { start: new Date(2018, 8, 1), selector: '#exp-years, .exp-years-dyn, [data-experience="career"]' },
            { start: new Date(2021, 8, 1), selector: '[data-experience="mulesoft"]' }
        ];

        experience.forEach(({ start, selector }) => {
            let years = today.getFullYear() - start.getFullYear();
            const months = today.getMonth() - start.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < start.getDate())) {
                years--;
            }
            document.querySelectorAll(selector).forEach(el => {
                el.textContent = Math.max(0, years) + '+';
            });
        });
    }

    /** Count the number of tool cards on the page */
    function updateToolCount() {
        const toolCards = document.querySelectorAll('.tool-card');
        const toolCountEl = document.getElementById('tool-count');
        
        if (toolCountEl && toolCards.length > 0) {
            toolCountEl.textContent = toolCards.length;
        }
    }

    // Initialize updates when DOM is ready
    function init() {
        updateExperience();
        updateToolCount();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
