/**
 * drag-controller.mjs
 * A reusable 60fps physics engine for drag-and-drop functionality.
 */

export class DragController {
    constructor(container, options = {}) {
        this.container = container;
        this.onDrop = options.onDrop || (() => {});
        
        // Physics State
        this.state = {
            isDragging: false,
            draggedEl: null,
            ghostEl: null,
            animFrameId: null,
            currentX: 0, currentY: 0,
            targetX: 0, targetY: 0,
            currentTilt: 0, targetTilt: 0,
            lastX: 0,
            offsetX: 0, offsetY: 0,
            width: 0, height: 0,
            dropZones: []
        };

        this._bindEvents();
    }

    _bindEvents() {
        // We use pointer events to support both mouse and touch
        this.container.addEventListener('pointerdown', this._onPointerDown.bind(this));
        window.addEventListener('pointermove', this._onPointerMove.bind(this));
        window.addEventListener('pointerup', this._onPointerUp.bind(this));
    }

    // 1. START: Setup the physics and create the ghost clone
    _onPointerDown(e) {
        const card = e.target.closest('.task-card');
        if (!card || ['BUTTON', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const { state } = this;
        state.isDragging = true;
        state.draggedEl = card;

        // Cache dimensions and offset from the original code
        const rect = card.getBoundingClientRect();
        state.width = rect.width;
        state.height = rect.height;
        state.offsetX = e.clientX - rect.left;
        state.offsetY = e.clientY - rect.top;

        // Cache all valid drop zones (the lists) for collision detection
        state.dropZones = Array.from(this.container.querySelectorAll('.list')).map(list => {
            const listRect = list.getBoundingClientRect();
            return {
                element: list,
                id: list.getAttribute('data-id'),
                left: listRect.left, right: listRect.right,
                top: listRect.top, bottom: listRect.bottom
            };
        });

        // Create the 60fps ghost clone
        state.ghostEl = card.cloneNode(true);
        state.ghostEl.classList.add('dragging-clone');
        state.ghostEl.style.width = `${rect.width}px`;
        state.ghostEl.style.transition = 'none'; 
        
        // Reset Physics
        state.targetX = state.currentX = e.clientX - state.offsetX;
        state.targetY = state.currentY = e.clientY - state.offsetY;
        state.targetTilt = state.currentTilt = 0;
        state.lastX = e.clientX;

        this.container.appendChild(state.ghostEl);
        state.draggedEl.classList.add('placeholder');
        
        // Start the animation loop
        state.animFrameId = requestAnimationFrame(this._updatePhysics.bind(this));
    }

    // 2. MOVE: Update targets based on user input
    _onPointerMove(e) {
        const { state } = this;
        if (!state.isDragging || !state.ghostEl) return;

        state.targetX = e.clientX - state.offsetX;
        state.targetY = e.clientY - state.offsetY;
        
        // Calculate tilt based on horizontal speed
        const speedX = e.clientX - state.lastX;
        state.lastX = e.clientX; 
        state.targetTilt = Math.max(-10, Math.min(10, speedX * 0.5)); 
    }

    // 3. THE LOOP: Apply LERP (Linear Interpolation) for smooth movement
    _updatePhysics() {
        const { state } = this;
        if (!state.isDragging) return;

        // Smooth physics math preserved from original
        state.currentX += (state.targetX - state.currentX) * 0.35; 
        state.currentY += (state.targetY - state.currentY) * 0.35;
        state.currentTilt += (state.targetTilt - state.currentTilt) * 0.15; 
        
        state.ghostEl.style.transform = `translate3d(${state.currentX}px, ${state.currentY}px, 0) rotate(${state.currentTilt}deg)`;
        
        this._detectCollisions();

        state.animFrameId = requestAnimationFrame(this._updatePhysics.bind(this));
    }

    // 4. COLLISION: Find the overlapping list
    _detectCollisions() {
        const { state } = this;
        const cardArea = state.width * state.height;
        let bestMatch = null;
        let maxOverlapPct = 0;

        // Math preserved from original code
        state.dropZones.forEach(zone => {
            const overlapWidth = Math.max(0, Math.min(state.currentX + state.width, zone.right) - Math.max(state.currentX, zone.left));
            const overlapHeight = Math.max(0, Math.min(state.currentY + state.height, zone.bottom) - Math.max(state.currentY, zone.top));
            const overlapPct = (overlapWidth * overlapHeight) / cardArea;

            // 8% threshold to trigger hover state
            if (overlapPct >= 0.08 && overlapPct > maxOverlapPct) {
                maxOverlapPct = overlapPct;
                bestMatch = zone;
            }
        });

        state.dropZones.forEach(z => z.element.classList.remove('list-hover'));
        if (bestMatch) bestMatch.element.classList.add('list-hover');
    }

    // 5. DROP: Clean up and fire callback
    _onPointerUp(e) {
        const { state } = this;
        if (!state.isDragging) return;

        cancelAnimationFrame(state.animFrameId); 

        const activeZone = state.dropZones.find(z => z.element.classList.contains('list-hover'));

        // Fire the drop callback if we landed on a new list
        if (activeZone) {
            const newColId = parseInt(activeZone.id);
            const taskId = parseInt(state.draggedEl.getAttribute('data-task-id'));
            const oldColId = parseInt(state.draggedEl.closest('.list').getAttribute('data-id'));

            if (newColId !== oldColId) {
                this.onDrop(taskId, newColId);
            }
        }

        // Cleanup DOM
        state.ghostEl.remove();
        state.draggedEl.classList.remove('placeholder');
        state.dropZones.forEach(z => z.element.classList.remove('list-hover'));
        
        // Reset State
        state.isDragging = false;
        state.draggedEl = null;
        state.ghostEl = null;
    }
}