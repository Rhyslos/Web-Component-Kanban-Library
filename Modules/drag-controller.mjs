/**
 * Modules/drag-controller.mjs
 * Restored 60fps LERP physics adapted for nested Web Components.
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

        this.container.addEventListener('pointerdown', this._onPointerDown.bind(this));
        window.addEventListener('pointermove', this._onPointerMove.bind(this));
        window.addEventListener('pointerup', this._onPointerUp.bind(this));
    }

    _onPointerDown(e) {
        // THE FIX: e.composedPath() pierces the shadow DOM to find the specific card
        const path = e.composedPath();
        const card = path.find(el => el.tagName === 'KANBAN-CARD');
        
        if (!card || ['BUTTON', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const { state } = this;
        state.isDragging = true;
        state.draggedEl = card;

        // 1. Measure the original card
        const rect = card.getBoundingClientRect();
        state.width = rect.width;
        state.height = rect.height;
        state.offsetX = e.clientX - rect.left;
        state.offsetY = e.clientY - rect.top;

        // 2. Map all potential Drop Zones (The Lists)
        state.dropZones = Array.from(this.container.querySelectorAll('kanban-list')).map(list => {
            const listRect = list.getBoundingClientRect();
            return {
                element: list,
                left: listRect.left, right: listRect.right,
                top: listRect.top, bottom: listRect.bottom
            };
        });

        // 3. Create the Ghost Clone
        state.ghostEl = card.cloneNode(true);
    
    // THE FIX: Added "top: 0; left: 0; margin: 0;" to anchor the physics grid
    state.ghostEl.style.cssText = `
        position: fixed; top: 0; left: 0; margin: 0;
        pointer-events: none; z-index: 9999;
        background-color: #fff; border-radius: 3px; 
        box-shadow: 0 12px 24px rgba(9,30,66,.25); padding: 8px;
        width: ${rect.width}px; height: ${rect.height}px;
        will-change: transform; font-family: sans-serif;
        box-sizing: border-box;
    `;
    
    // Pass the card's data to the clone so it renders the text
    state.ghostEl.data = card.data;

        state.targetX = state.currentX = e.clientX - state.offsetX;
        state.targetY = state.currentY = e.clientY - state.offsetY;
        state.targetTilt = state.currentTilt = 0;
        state.lastX = e.clientX;

        // 4. Mount the Ghost to the Main Board and hide the original
        this.container.appendChild(state.ghostEl);
        state.draggedEl.style.opacity = '0.2'; // The "Placeholder" effect
        
        state.animFrameId = requestAnimationFrame(this._updatePhysics.bind(this));
    }

    _onPointerMove(e) {
        const { state } = this;
        if (!state.isDragging || !state.ghostEl) return;

        state.targetX = e.clientX - state.offsetX;
        state.targetY = e.clientY - state.offsetY;
        
        // YOUR ORIGINAL TILT MATH: Tilt based on mouse speed
        const speedX = e.clientX - state.lastX;
        state.lastX = e.clientX; 
        state.targetTilt = Math.max(-10, Math.min(10, speedX * 0.5)); 
    }

    _updatePhysics() {
        const { state } = this;
        if (!state.isDragging) return;

        // YOUR ORIGINAL LERP MATH: 35% lag for movement, 15% lag for tilt
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

        // YOUR ORIGINAL COLLISION MATH: 8% overlap required
        state.dropZones.forEach(zone => {
            const overlapWidth = Math.max(0, Math.min(state.currentX + state.width, zone.right) - Math.max(state.currentX, zone.left));
            const overlapHeight = Math.max(0, Math.min(state.currentY + state.height, zone.bottom) - Math.max(state.currentY, zone.top));
            const overlapPct = (overlapWidth * overlapHeight) / cardArea;

            if (overlapPct >= 0.08 && overlapPct > maxOverlapPct) {
                maxOverlapPct = overlapPct;
                bestMatch = zone;
            }
        });

        // Reset all, then highlight best match
        state.dropZones.forEach(z => z.element.style.boxShadow = 'none');
        if (bestMatch) {
            bestMatch.element.style.boxShadow = '0 0 0 2px #0079bf inset';
        }
    }

    _onPointerUp(e) {
        const { state } = this;
        if (!state.isDragging) return;

        cancelAnimationFrame(state.animFrameId); 

        // Find the active drop zone
        const activeZone = state.dropZones.find(z => z.element.style.boxShadow !== 'none');

        if (activeZone) {
            const newColId = parseInt(activeZone.element.getAttribute('data-col-id'));
            const newSwimId = parseInt(activeZone.element.getAttribute('data-swim-id'));
            const taskId = parseInt(state.draggedEl.data.id);
            const oldColId = parseInt(state.draggedEl.data.colId);
            const oldSwimId = parseInt(state.draggedEl.data.swimId);

            // Only fire API if the coordinates actually changed
            if (newColId !== oldColId || newSwimId !== oldSwimId) {
                this.onDrop(taskId, newColId, newSwimId);
            }
        }

        // Cleanup
        state.ghostEl.remove();
        state.draggedEl.style.opacity = '1';
        state.dropZones.forEach(z => z.element.style.boxShadow = 'none');
        
        state.isDragging = false;
        state.draggedEl = null;
        state.ghostEl = null;
    }
}