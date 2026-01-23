/**
 * app.mjs (The Main Board Component)
 */
import { api } from '/modules/kanban-service.mjs';
import { DragController } from '/modules/drag-controller.mjs';
import '/modules/kanban-list.mjs';

export class KanbanBoard extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.data = { columns: [], swimlanes: [], tasks: [] };
    this.isLoading = true;
    this.resizeObserver = null; 
  }

  connectedCallback() {
    this.render();
    this.loadData();

    // 1. Listen for data creation from child components
    this.shadow.addEventListener('task-added', (e) => {
        // Defaulting to swimlane 1 for now, until Y-axis UI is fully mapped
        this.handleAddTask(e.detail.colId, 1, e.detail.text); 
    });

    // 2. Initialize the 60fps Physics Engine
    this.dragController = new DragController(this.shadow, {
        onDrop: (taskId, newColId) => {
            api.moveTask(taskId, newColId, 1);
            this.loadData();
        }
    });
  }

  // --- API STATE MANAGEMENT ---
  async loadData() {
    try {
        this.data = await api.getBoard();
        this.isLoading = false;
        this.render(); 
    } catch (error) { console.error("Failed to load:", error); }
  }

  async handleAddColumn(title) {
    await api.createColumn(title);
    this.loadData(); 
  }

  async handleAddSwimlane(title) {
    await api.createSwimlane(title);
    this.loadData();
  }

  async handleAddTask(colId, swimId, text) {
    await api.createTask(colId, swimId, text);
    this.loadData();
  }

  // --- GRID STYLES ---
  getStyles() {
    const colCount = this.data.columns.length;
    const swimCount = Math.max(1, this.data.swimlanes.length); 

    return `
      <style>
        :host { display: block; font-family: sans-serif; height: 100%; box-sizing: border-box; }
        
        .board-container { 
            width: 100%; height: 100%; overflow: auto;
            background-color: #f4f5f7; padding: 24px; 
            display: grid; 
            /* Grid defines exact space for existing columns + 1 space for the ghost column */
            grid-template-columns: repeat(${colCount}, 272px) 272px; 
            grid-template-rows: repeat(${swimCount}, max-content) max-content; 
            gap: 16px; 
            align-items: start;
        }

        /* The Ghost Boxes */
        .add-zone {
            border: 2px dashed #b3bac5; border-radius: 4px; color: #6b778c; box-sizing: border-box;
            display: flex; align-items: center; justify-content: center; font-weight: bold; 
            opacity: 0.5; transition: opacity 0.2s, background-color 0.2s; cursor: pointer;
            min-height: 80px; /* Base size before ResizeObserver kicks in */
        }
        .add-zone:hover { opacity: 1; background-color: rgba(9,30,66,.08); color: #172b4d; border-color: #172b4d; }
      </style>
    `;
  }

  // --- RENDERING ---
  render() {
    const style = this.getStyles();
    if (this.isLoading) { this.shadow.innerHTML = `${style}<div>Loading...</div>`; return; }

    const colCount = this.data.columns.length;

    // STATE 1: Empty Board
    if (colCount === 0) {
        this.shadow.innerHTML = `
            ${style}
            <div class="board-container">
                <div class="add-zone" id="first-col-btn" style="grid-column: 1; grid-row: 1;">+ Create First List</div>
            </div>
        `;
        this.shadow.getElementById('first-col-btn').addEventListener('click', () => this.handleAddColumn('New Column'));
        return;
    }

    // STATE 2: Populated Grid
    // 1. Generate the Lists
    let gridHtml = this.data.columns.map((col, xIndex) => `
        <kanban-list 
            class="list-component"
            data-col-index="${xIndex + 1}"
            style="grid-column: ${xIndex + 1}; grid-row: 1;"
        ></kanban-list>
    `).join('');

    // 2. Generate the Right-Side Ghost Boxes (One for each row)
    // We put it in the (colCount + 1) column. 
    gridHtml += `
        <div class="add-zone right-ghost" id="add-col-btn" style="grid-column: ${colCount + 1}; grid-row: 1;">
            + Add List
        </div>
    `;

    // 3. Generate the Bottom-Side Ghost Boxes (Underneath each column)
    this.data.columns.forEach((col, xIndex) => {
        gridHtml += `
            <div class="add-zone bottom-ghost" data-target-col="${xIndex + 1}" style="grid-column: ${xIndex + 1}; grid-row: 2;">
                + Add Swimlane
            </div>
        `;
    });

    this.shadow.innerHTML = `${style}<div class="board-container">${gridHtml}</div>`;
    
    // Hydrate Sub-Components with Data
    const listElements = this.shadow.querySelectorAll('kanban-list');
    listElements.forEach((el, index) => {
        const colData = this.data.columns[index];
        el.data = {
            column: colData,
            tasks: this.data.tasks.filter(t => t.colId === colData.id)
        };
    });

    // Attach Event Listeners to Ghosts
    const addColBtn = this.shadow.getElementById('add-col-btn');
    if (addColBtn) addColBtn.addEventListener('click', () => this.handleAddColumn('New Column'));

    const bottomGhosts = this.shadow.querySelectorAll('.bottom-ghost');
    bottomGhosts.forEach(ghost => ghost.addEventListener('click', () => this.handleAddSwimlane('New Swimlane')));

    // Boot up the Sizing Physics
    this.attachSizingPhysics();
  }

  // --- SIZING PHYSICS (The Magic Ghost Sizer) ---
  attachSizingPhysics() {
    // Disconnect old observer to prevent memory leaks
    if (this.resizeObserver) this.resizeObserver.disconnect();

    this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            // Get the exact dimensions of the list that just changed size
            const listHeight = entry.contentRect.height;
            const colIndex = parseInt(entry.target.getAttribute('data-col-index'));

            // Find the bottom ghost directly underneath this specific list and match its width
            const bottomGhost = this.shadow.querySelector(`.bottom-ghost[data-target-col="${colIndex}"]`);
            if (bottomGhost) {
                bottomGhost.style.width = `${entry.contentRect.width}px`;
            }

            // If this is the LAST list in the row, match the Right-Ghost height to this list
            if (colIndex === this.data.columns.length) {
                const rightGhost = this.shadow.querySelector('.right-ghost');
                if (rightGhost) {
                    rightGhost.style.height = `${listHeight}px`;
                }
            }
        }
    });

    // Start observing every list
    this.shadow.querySelectorAll('kanban-list').forEach(list => {
        this.resizeObserver.observe(list);
    });
  }
}

customElements.define('kanban-board', KanbanBoard);