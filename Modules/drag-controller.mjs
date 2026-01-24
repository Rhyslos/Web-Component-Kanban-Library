/**
 * Modules/drag-controller.mjs (Ghost-Aware Physics Engine)
 */

export class DragController {
    constructor(container, options = {}) {
        this.container = container;
        this.onDrop = options.onDrop || (() => {});
        
        this.state = {
            isDragging: false, draggedEl: null, ghostEl: null, animFrameId: null,
            currentX: 0, currentY: 0, targetX: 0, targetY: 0,
            currentTilt: 0, targetTilt: 0, lastX: 0, offsetX: 0, offsetY: 0,
            width: 0, height: 0, dropZones: []
        };

        this._boundOnPointerDown = this._onPointerDown.bind(this);
        this._boundOnPointerMove = this._onPointerMove.bind(this);
        this._boundOnPointerUp = this._onPointerUp.bind(this);

        this._bindEvents();
    }

    _bindEvents() {
        this.container.addEventListener('pointerdown', this._boundOnPointerDown);
        window.addEventListener('pointermove', this._boundOnPointerMove);
        window.addEventListener('pointerup', this._boundOnPointerUp);
    }

    _onPointerDown(e) {
        const path = e.composedPath();
        const card = path.find(el => el.tagName === 'KANBAN-CARD');
        if (!card || ['BUTTON', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const { state } = this;
        state.isDragging = true;
        state.draggedEl = card;

        const rect = card.getBoundingClientRect();
        state.width = rect.width;
        state.height = rect.height;
        state.offsetX = e.clientX - rect.left;
        state.offsetY = e.clientY - rect.top;

        // THE UPGRADE: Map existing lists AND the invisible Ghost Zones
        state.dropZones = Array.from(this.container.querySelectorAll('kanban-list, .add-list-btn')).map(zone => {
            const zoneRect = zone.getBoundingClientRect();
            return {
                element: zone,
                isGhost: zone.classList.contains('add-list-btn'), // Flag it as a ghost
                left: zoneRect.left, right: zoneRect.right,
                top: zoneRect.top, bottom: zoneRect.bottom
            };
        });

        state.ghostEl = card.cloneNode(true);
        state.ghostEl.style.cssText = `
            position: fixed; top: 0; left: 0; margin: 0;
            pointer-events: none; z-index: 9999;
            width: ${rect.width}px; height: ${rect.height}px;
            will-change: transform; box-sizing: border-box;
            transform: rotate(3deg) scale(1.02);
        `;
        
        state.ghostEl.data = card.data;

        state.targetX = state.currentX = e.clientX - state.offsetX;
        state.targetY = state.currentY = e.clientY - state.offsetY;
        state.targetTilt = state.currentTilt = 0;
        state.lastX = e.clientX;

        this.container.appendChild(state.ghostEl);
        state.draggedEl.style.opacity = '0.2'; 
        
        state.animFrameId = requestAnimationFrame(this._updatePhysics.bind(this));
    }

    _onPointerMove(e) {
        const { state } = this;
        if (!state.isDragging || !state.ghostEl) return;

        state.targetX = e.clientX - state.offsetX;
        state.targetY = e.clientY - state.offsetY;
        
        const speedX = e.clientX - state.lastX;
        state.lastX = e.clientX; 
        state.targetTilt = Math.max(-10, Math.min(10, speedX * 0.5)); 
    }

    _updatePhysics() {
        const { state } = this;
        if (!state.isDragging) return;

        state.currentX += (state.targetX - state.currentX) * 0.35; 
        state.currentY += (state.targetY - state.currentY) * 0.35;
        state.currentTilt += (state.targetTilt - state.currentTilt) * 0.15; 
        
        state.ghostEl.style.transform = `translate3d(${state.currentX}px, ${state.currentY}px, 0) rotate(${state.currentTilt}deg)`;
        
        this._detectCollisions();

        state.animFrameId = requestAnimationFrame(this._updatePhysics.bind(this));
    }

    _detectCollisions() {
        const { state } = this;
        const cardArea = state.width * state.height;
        let bestMatch = null;
        let maxOverlapPct = 0;

        state.dropZones.forEach(zone => {
            const overlapWidth = Math.max(0, Math.min(state.currentX + state.width, zone.right) - Math.max(state.currentX, zone.left));
            const overlapHeight = Math.max(0, Math.min(state.currentY + state.height, zone.bottom) - Math.max(state.currentY, zone.top));
            const overlapPct = (overlapWidth * overlapHeight) / cardArea;

            if (overlapPct >= 0.08 && overlapPct > maxOverlapPct) {
                maxOverlapPct = overlapPct;
                bestMatch = zone;
            }
        });

        // Reset Styles
        state.dropZones.forEach(z => {
            z.element.style.boxShadow = 'none';
            if (z.isGhost) { z.element.style.opacity = '0'; z.element.style.backgroundColor = 'transparent'; }
        });

        // Highlight Active Drop Zone
        if (bestMatch) {
            if (bestMatch.isGhost) {
                // Style the ghost to look active
                bestMatch.element.style.opacity = '1';
                bestMatch.element.style.backgroundColor = 'rgba(9,30,66,.08)';
                bestMatch.element.style.boxShadow = '0 0 0 2px #0079bf inset';
            } else {
                bestMatch.element.style.boxShadow = '0 0 0 2px #0079bf inset';
            }
        }
    }

    _onPointerUp(e) {
        const { state } = this;
        if (!state.isDragging) return;

        cancelAnimationFrame(state.animFrameId); 

        const activeZone = state.dropZones.find(z => z.element.style.boxShadow !== 'none');

        if (activeZone) {
            const taskId = parseInt(state.draggedEl.data.id);

            // THE UPGRADE: Handle Ghost Drops vs Normal Drops
            if (activeZone.isGhost) {
                const x = parseInt(activeZone.element.getAttribute('data-x'));
                const y = parseInt(activeZone.element.getAttribute('data-y'));
                this.onDrop(taskId, { isGhost: true, x, y });
            } else {
                const newColId = parseInt(activeZone.element.getAttribute('data-col-id'));
                const newSwimId = parseInt(activeZone.element.getAttribute('data-swim-id'));
                this.onDrop(taskId, { isGhost: false, colId: newColId, swimId: newSwimId });
            }
        }

        // Cleanup
        state.ghostEl.remove();
        state.draggedEl.style.opacity = '1';
        state.dropZones.forEach(z => {
            z.element.style.boxShadow = 'none';
            if (z.isGhost) { z.element.style.opacity = '0'; z.element.style.backgroundColor = 'transparent'; }
        });
        
        state.isDragging = false;
        state.draggedEl = null;
        state.ghostEl = null;
    }

    destroy() {
        this.container.removeEventListener('pointerdown', this._boundOnPointerDown);
        window.removeEventListener('pointermove', this._boundOnPointerMove);
        window.removeEventListener('pointerup', this._boundOnPointerUp);
        if (this.state.animFrameId) cancelAnimationFrame(this.state.animFrameId);
        if (this.state.ghostEl) this.state.ghostEl.remove();
    }
}