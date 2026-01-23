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
        const response = await fetch('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title })
        });
        const newColumn = await response.json();
        this.data.columns.push(newColumn);
        this.render();
    } catch (error) { console.error("Failed to add column:", error); }
  }

  async addTask(columnId, text) {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId: columnId, taskText: text })
        });
        const newTask = await response.json();
        const column = this.data.columns.find(col => col.id === columnId);
        column.tasks.push(newTask);
        this.render();
    } catch (error) { console.error("Failed to add task:", error); }
  }

  // --- 2. NEW: API CALL TO MOVE TASK ---
  async moveTask(taskId, newColumnId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newColumnId: newColumnId })
        });
        
        // If successful, re-fetch the whole board to ensure perfect sync
        if (response.ok) {
            this.fetchBoardData(); 
        }
    } catch (error) { console.error("Failed to move task:", error); }
  }

  // --- 3. RENDERING ---
  getStyles() {
    return `
      <style>
        :host { display: block; font-family: sans-serif; background-color: #f4f5f7; padding: 20px; border-radius: 8px; }
        .board { display: flex; gap: 16px; overflow-x: auto; align-items: flex-start; }
        .column { background-color: #ebecf0; border-radius: 3px; width: 272px; min-width: 272px; display: flex; flex-direction: column; padding: 8px; }
        .column-header { font-weight: bold; padding-bottom: 8px; text-transform: uppercase; font-size: 0.85rem; color: #5e6c84; }
        
        /* Task Cards are now visually draggable */
        .task-card { background-color: #fff; border-radius: 3px; box-shadow: 0 1px 0 rgba(9,30,66,.25); padding: 8px; margin-bottom: 8px; cursor: grab; }
        .task-card:hover { background-color: #f4f5f7; }
        .task-card:active { cursor: grabbing; box-shadow: 0 4px 8px rgba(9,30,66,.25); }

        .task-list { min-height: 10px; } /* Ensures empty columns can still accept drops */
        
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
    
    // NEW: added draggable="true" to the task-card
    const boardHtml = this.data.columns.map(col => `
      <div class="column" data-id="${col.id}">
        <div class="column-header">${col.title}</div>
        <div class="task-list">
          ${col.tasks.map(task => `
            <div class="task-card" draggable="true" data-task-id="${task.id}">${task.text}</div>
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

    this.shadow.innerHTML = `
      ${style}
      <div class="board">
        ${boardHtml}
        <div class="add-column-wrapper">
            <input type="text" id="new-column-input" placeholder="Enter list title..." />
            <button id="add-column-btn">Add</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const addColBtn = this.shadow.getElementById('add-column-btn');
    const addColInput = this.shadow.getElementById('new-column-input');
    addColBtn.addEventListener('click', () => {
        if (addColInput.value.trim()) this.addColumn(addColInput.value.trim());
    });

    const columns = this.shadow.querySelectorAll('.column');
    columns.forEach(column => {
        const colId = parseInt(column.getAttribute('data-id'));
        const taskList = column.querySelector('.task-list');

        // --- 4. DRAG AND DROP LISTENERS ---
        
        // A. Handle Cards being dragged
        const cards = column.querySelectorAll('.task-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const taskId = card.getAttribute('data-task-id');
                // Store the task ID in the drag event data
                e.dataTransfer.setData('text/plain', taskId); 
            });
        });

        // B. Handle Columns accepting drops
        column.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            taskList.style.backgroundColor = 'rgba(9, 30, 66, 0.04)'; // Visual feedback
        });

        column.addEventListener('dragleave', () => {
            taskList.style.backgroundColor = 'transparent'; // Remove feedback
        });

        // C. Handle the actual Drop
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            taskList.style.backgroundColor = 'transparent';
            
            // Retrieve the task ID we saved in step A
            const taskId = parseInt(e.dataTransfer.getData('text/plain')); 
            
            // Send request to server to update the database
            this.moveTask(taskId, colId); 
        });

        // --- Existing Add Card Listeners ---
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