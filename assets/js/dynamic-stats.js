/**
 * dynamic-stats.js
 * Handles dynamic calculation of experience years and tool counts.
 */
(function() {
    'use strict';

    /** Calculate years since September 2018 */
    function updateExperience() {
        const startDate = new Date(2018, 8, 1); // September 1st, 2018
        const today = new Date();
        
        let years = today.getFullYear() - startDate.getFullYear();
        let months = today.getMonth() - startDate.getMonth();
        
        if (months < 0 || (months === 0 && today.getDate() < startDate.getDate())) {
            years--;
        }

        const expString = years + '+';
        
        // Update elements with the calculated experience
        const expYearsEl = document.getElementById('exp-years');
        if (expYearsEl) {
            expYearsEl.textContent = expString;
        }

        const dynEls = document.querySelectorAll('.exp-years-dyn');
        dynEls.forEach(el => {
            el.textContent = expString;
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
