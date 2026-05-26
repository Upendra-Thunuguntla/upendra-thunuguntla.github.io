/* ══════════════════════════════════════════════
   Layout Customizer — Drag & Drop Engine
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Restore Custom Layout Orders
    restoreLayout('dev-tools-grid', 'dev_tools_order');
    restoreLayout('fun-tools-grid', 'fun_tools_order');
    
    // 2. Initialize Layout Customizer listeners
    initLayoutCustomizer();
});

let dragSourceElement = null;

function restoreLayout(gridId, storageKey) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const orderString = localStorage.getItem(storageKey);
    if (!orderString) return;
    
    try {
        const order = JSON.parse(orderString);
        if (!Array.isArray(order)) return;
        
        const cards = Array.from(grid.querySelectorAll('.tool-card'));
        
        // Sort cards based on stored order
        cards.sort((a, b) => {
            const idA = a.getAttribute('data-id');
            const idB = b.getAttribute('data-id');
            const indexA = order.indexOf(idA);
            const indexB = order.indexOf(idB);
            
            // If card ID not found in stored order, push it to the end
            const posA = indexA === -1 ? 999 : indexA;
            const posB = indexB === -1 ? 999 : indexB;
            
            return posA - posB;
        });
        
        // Re-append sorted cards in order
        cards.forEach(card => grid.appendChild(card));
    } catch (e) {
        console.error('Failed to restore layout for ' + gridId, e);
    }
}

function initLayoutCustomizer() {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
        // Drag events
        card.addEventListener('dragstart', handleDragStart, false);
        card.addEventListener('dragover', handleDragOver, false);
        card.addEventListener('dragenter', handleDragEnter, false);
        card.addEventListener('dragleave', handleDragLeave, false);
        card.addEventListener('drop', handleDrop, false);
        card.addEventListener('dragend', handleDragEnd, false);
    });
}

function handleDragStart(e) {
    if (!document.body.classList.contains('layout-edit-mode')) {
        e.preventDefault();
        return;
    }
    dragSourceElement = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (!document.body.classList.contains('layout-edit-mode')) return;
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (!document.body.classList.contains('layout-edit-mode')) return false;
    
    // Ensure we are dropping within the same grid container
    if (dragSourceElement && dragSourceElement !== this && dragSourceElement.parentNode === this.parentNode) {
        const grid = this.parentNode;
        const cards = Array.from(grid.querySelectorAll('.tool-card'));
        const dragIndex = cards.indexOf(dragSourceElement);
        const dropIndex = cards.indexOf(this);
        
        if (dragIndex < dropIndex) {
            grid.insertBefore(dragSourceElement, this.nextSibling);
        } else {
            grid.insertBefore(dragSourceElement, this);
        }
        
        saveCurrentOrder(grid);
    }
    return false;
}

function handleDragEnd(e) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
        card.classList.remove('dragging');
        card.classList.remove('drag-over');
    });
}

function saveCurrentOrder(grid) {
    const cards = Array.from(grid.querySelectorAll('.tool-card'));
    const order = cards.map(card => card.getAttribute('data-id')).filter(id => id);
    const storageKey = grid.id === 'dev-tools-grid' ? 'dev_tools_order' : 'fun_tools_order';
    localStorage.setItem(storageKey, JSON.stringify(order));
}

function toggleLayoutEdit() {
    const isEdit = document.body.classList.toggle('layout-edit-mode');
    const btn = document.getElementById('btn-edit-layout');
    const resetBtn = document.getElementById('btn-reset-layout');
    
    if (isEdit) {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Save Layout';
        btn.classList.replace('btn-outline', 'btn-primary');
        if (resetBtn) resetBtn.style.display = 'inline-flex';
        
        // Enable Draggable on all cards and intercept click navigation
        document.querySelectorAll('.tool-card').forEach(card => {
            card.setAttribute('draggable', 'true');
            card.addEventListener('click', preventCardClick, true); // true = capture phase
        });
        
        if (typeof showToast === 'function') {
            showToast('Edit mode active! Drag & drop cards to reorder.', 'info');
        }
    } else {
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Customize Layout';
        btn.classList.replace('btn-primary', 'btn-outline');
        if (resetBtn) resetBtn.style.display = 'none';
        
        // Disable Draggable on all cards and restore clicks
        document.querySelectorAll('.tool-card').forEach(card => {
            card.removeAttribute('draggable');
            card.removeEventListener('click', preventCardClick, true);
        });
        
        if (typeof showToast === 'function') {
            showToast('Layout order saved successfully!');
        }
    }
}

function preventCardClick(e) {
    e.preventDefault();
    e.stopPropagation();
}

function resetLayout() {
    localStorage.removeItem('dev_tools_order');
    localStorage.removeItem('fun_tools_order');
    if (typeof showToast === 'function') {
        showToast('Layout reset to default. Reloading...', 'info');
    }
    setTimeout(() => {
        location.reload();
    }, 1000);
}
