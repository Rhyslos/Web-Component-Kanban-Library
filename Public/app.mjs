export class KanbanBoard extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.data = { columns: [] };
    this.isLoading = true;
  }

  connectedCallback() {
    this.render();
    this.fetchBoardData();
  }

  // --- 1. EXISTING API CALLS ---
  async fetchBoardData() {
    try {
        const response = await fetch('/api/board');
        this.data = await response.json();
        this.isLoading = false;
        this.render(); 
    } catch (error) { console.error("Failed to load board:", error); }
  }

  async addColumn(title) {
    try {
        const response = await fetch('/api/columns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title }) });
        const newColumn = await response.json();
        this.data.columns.push(newColumn);
        this.render();
    } catch (error) { console.error("Failed to add column:", error); }
  }

  async addTask(columnId, text) {
    try {
        const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ columnId: columnId, taskText: text }) });
        const newTask = await response.json();
        const column = this.data.columns.find(col => col.id === columnId);
        column.tasks.push(newTask);
        this.render();
    } catch (error) { console.error("Failed to add task:", error); }
  }

  async moveTask(taskId, newColumnId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newColumnId: newColumnId }) });
        if (response.ok) this.fetchBoardData(); 
    } catch (error) { console.error("Failed to move task:", error); }
  }

  // --- 2. RENDERING ---
  getStyles() {
    return `
      <style>
        :host { display: block; font-family: sans-serif; background-color: #f4f5f7; padding: 20px; border-radius: 8px; user-select: none; }
        .board { display: flex; gap: 16px; overflow-x: auto; align-items: flex-start; }
        .column { background-color: #ebecf0; border-radius: 3px; width: 272px; min-width: 272px; display: flex; flex-direction: column; padding: 8px; transition: background-color 0.2s; }
        .column-header { font-weight: bold; padding-bottom: 8px; text-transform: uppercase; font-size: 0.85rem; color: #5e6c84; pointer-events: none; }
        .task-card { background-color: #fff; border-radius: 3px; box-shadow: 0 1px 0 rgba(9,30,66,.25); padding: 8px; margin-bottom: 8px; cursor: grab; }
        .task-card:hover { background-color: #f4f5f7; }
        
        /* UPDATED GHOST CARD CSS */
        .dragging-clone {
            position: fixed;
            top: 0; /* Anchor to top left */
            left: 0;
            pointer-events: none;
            z-index: 9999;
            background-color: #fff;
            border-radius: 3px;
            box-shadow: 0 12px 24px rgba(9,30,66,.25);
            padding: 8px;
            cursor: grabbing;
            will-change: transform; /* Tells the browser to use the GPU */
        }

        .placeholder { opacity: 0.2; }
        .column-hover { background-color: rgba(9, 30, 66, 0.08); }
        .task-list { min-height: 10px; }
        .add-card-btn { color: #5e6c84; padding: 8px; cursor: pointer; border-radius: 3px; background: none; border: none; text-align: left; font-size: 1rem; }
        .add-card-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }
        .add-card-form { display: none; flex-direction: column; gap: 8px; }
        .add-card-input { padding: 8px; border: none; border-radius: 3px; box-shadow: 0 1px 0 rgba(9,30,66,.25); resize: none; font-family: sans-serif; }
        .add-card-actions { display: flex; gap: 8px; }
        .save-card-btn { background-color: #0079bf; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; }
        .cancel-btn { background: none; border: none; font-size: 1.5rem; color: #6b778c; cursor: pointer; line-height: 1; }
        .add-column-wrapper { background-color: rgba(9, 30, 66, 0.08); border-radius: 3px; min-width: 272px; padding: 8px; display: flex; gap: 8px; }
        .add-column-wrapper input { flex-grow: 1; padding: 6px; border: 2px solid #0079bf; border-radius: 3px; }
        .add-column-wrapper button { background-color: #0079bf; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; }
      </style>
    `;
  }

  render() {
    const style = this.getStyles();
    if (this.isLoading) { this.shadow.innerHTML = `${style}<div>Loading...</div>`; return; }
    
    // Notice: Removed draggable="true", we will handle it with custom JS pointers
    const boardHtml = this.data.columns.map(col => `
      <div class="column" data-id="${col.id}">
        <div class="column-header">${col.title}</div>
        <div class="task-list">
          ${col.tasks.map(task => `
            <div class="task-card" data-task-id="${task.id}">${task.text}</div>
          `).join('')}
        </div>
        <button class="add-card-btn">+ Add a card</button>
        <div class="add-card-form">
            <textarea class="add-card-input" placeholder="Enter a title for this card..."></textarea>
            <div class="add-card-actions">
                <button class="save-card-btn">Add Card</button>
                <button class="cancel-btn">×</button>
            </div>
        </div>
      </div>
    `).join('');

    this.shadow.innerHTML = `${style}<div class="board">${boardHtml}<div class="add-column-wrapper"><input type="text" id="new-column-input" placeholder="Enter list title..." /><button id="add-column-btn">Add</button></div></div>`;
    this.attachEventListeners();
  }

  // --- 3. CUSTOM PHYSICS DRAG & DROP ---
  // --- 3. CUSTOM PHYSICS DRAG & DROP (OPTIMIZED) ---
  attachEventListeners() {
    const addColBtn = this.shadow.getElementById('add-column-btn');
    const addColInput = this.shadow.getElementById('new-column-input');
    addColBtn.addEventListener('click', () => { if (addColInput.value.trim()) this.addColumn(addColInput.value.trim()); });

    let isDragging = false;
    let draggedCard = null;
    let ghostCard = null;
    let animationFrameId = null; 

    // Physics State
    let offset = { x: 0, y: 0 }; 
    let targetX = 0, targetY = 0;   // Where the mouse is
    let currentX = 0, currentY = 0; // Where the card is
    let targetTilt = 0, currentTilt = 0;
    let lastX = 0;

    const columns = this.shadow.querySelectorAll('.column');
    const allCards = this.shadow.querySelectorAll('.task-card');

    // --- RENDER LOOP (Handles Visuals & Smoothing) ---
    const updatePhysics = () => {
        if (!isDragging || !ghostCard) return;

        // 1. Linear Interpolation (Lerp) for buttery smooth movement
        currentX += (targetX - currentX) * 0.35; // 0.35 is the speed (1 = instant, 0 = no movement)
        currentY += (targetY - currentY) * 0.35;
        currentTilt += (targetTilt - currentTilt) * 0.15; // Slower lerp for the tilt rotation
        
        // 2. Apply GPU-accelerated transform
        ghostCard.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${currentTilt}deg)`;
        
        // 3. Debounced Collision Detection (Only check 1 out of 3 frames to save CPU)
        if (Math.abs(targetX - currentX) < 1) { 
            columns.forEach(col => col.classList.remove('column-hover'));
            const elementsUnderCursor = this.shadow.elementsFromPoint(targetX + offset.x, targetY + offset.y);
            const hoveredColumn = elementsUnderCursor.find(el => el.classList && el.classList.contains('column'));
            if (hoveredColumn) hoveredColumn.classList.add('column-hover');
        }

        animationFrameId = requestAnimationFrame(updatePhysics);
    };

    allCards.forEach(card => {
        card.addEventListener('pointerdown', (e) => {
            isDragging = true;
            draggedCard = card;

            const rect = card.getBoundingClientRect();
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;

            ghostCard = card.cloneNode(true);
            ghostCard.classList.add('dragging-clone');
            ghostCard.style.width = `${rect.width}px`;
            ghostCard.style.transition = 'none'; 

            // Initialize positions
            targetX = currentX = e.clientX - offset.x;
            targetY = currentY = e.clientY - offset.y;
            targetTilt = currentTilt = 0;
            lastX = e.clientX;

            ghostCard.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(0deg)`;

            this.shadow.appendChild(ghostCard);
            draggedCard.classList.add('placeholder');

            animationFrameId = requestAnimationFrame(updatePhysics);
        });
    });

    // --- MOUSE MOVE (Only updates targets, zero DOM manipulation) ---
    window.addEventListener('pointermove', (e) => {
        if (!isDragging || !ghostCard) return;

        targetX = e.clientX - offset.x;
        targetY = e.clientY - offset.y;

        // Calculate velocity for the dynamic tilt effect
        const speedX = e.clientX - lastX;
        lastX = e.clientX; 
        targetTilt = Math.max(-10, Math.min(10, speedX * 0.5)); 
    });

    // --- MOUSE UP ---
    window.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        cancelAnimationFrame(animationFrameId); 

        const elementsUnderCursor = this.shadow.elementsFromPoint(e.clientX, e.clientY);
        const hoveredColumn = elementsUnderCursor.find(el => el.classList && el.classList.contains('column'));

        if (hoveredColumn) {
            const newColumnId = parseInt(hoveredColumn.getAttribute('data-id'));
            const taskId = parseInt(draggedCard.getAttribute('data-task-id'));

            if (draggedCard.closest('.column').getAttribute('data-id') != newColumnId) {
                this.moveTask(taskId, newColumnId);
            }
        }

        ghostCard.remove();
        draggedCard.classList.remove('placeholder');
        columns.forEach(col => col.classList.remove('column-hover'));
        
        isDragging = false;
        draggedCard = null;
        ghostCard = null;
    });

    // --- Add Card Logic ---
    columns.forEach(column => {
        const colId = parseInt(column.getAttribute('data-id'));
        const addBtn = column.querySelector('.add-card-btn');
        const form = column.querySelector('.add-card-form');
        const input = column.querySelector('.add-card-input');
        const saveBtn = column.querySelector('.save-card-btn');
        const cancelBtn = column.querySelector('.cancel-btn');

        addBtn.addEventListener('click', () => { addBtn.style.display = 'none'; form.style.display = 'flex'; input.focus(); });
        cancelBtn.addEventListener('click', () => { addBtn.style.display = 'block'; form.style.display = 'none'; input.value = ''; });
        saveBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (text !== "") this.addTask(colId, text);
        });
    });
  }
}

customElements.define('kanban-board', KanbanBoard);