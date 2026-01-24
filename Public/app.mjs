/**
 * Public/app.mjs (The Main Board Component)
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
    this.activeCells = new Set(); 
  }

  // --- 1. LIFECYCLE MANAGEMENT ---
  connectedCallback() {
    this.render();
    this.loadData();

    // Listener: Add Task
    this.shadow.addEventListener('task-added', (e) => {
        const swimId = e.target.getAttribute('data-swim-id') ? parseInt(e.target.getAttribute('data-swim-id')) : this.data.swimlanes[0].id;
        this.handleAddTask(e.detail.colId, swimId, e.detail.text); 
    });

    // Listener: Rename Task (Optimistic UI)
    this.shadow.addEventListener('task-renamed', async (e) => {
        const { taskId, newText } = e.detail;
        const task = this.data.tasks.find(t => t.id === taskId);
        if (task) {
            task.text = newText;
            this.updateComponents(); // Instant UI update
            // await api.updateTaskText(taskId, newText); // TODO: Add to API
        }
    });

    // Listener: Rename List (Optimistic UI)
    this.shadow.addEventListener('list-renamed', async (e) => {
        const { colId, newTitle } = e.detail;
        const column = this.data.columns.find(c => c.id === colId);
        if (column) {
            column.title = newTitle;
            this.updateComponents(); // Instant UI update
            // await api.updateColumnTitle(colId, newTitle); // TODO: Add to API
        }
    });

    // Physics Engine: 60fps Drag & Drop with Optimistic UI
    this.dragController = new DragController(this.shadow, {
        onDrop: async (taskId, newColId, newSwimId) => {
            const task = this.data.tasks.find(t => t.id === taskId);
            if (!task) return;

            const oldColId = task.colId;
            const oldSwimId = task.swimId;

            // 1. Instant UI Update
            task.colId = newColId;
            task.swimId = newSwimId;
            this.updateComponents();

            // 2. Background Sync
            try {
                await api.moveTask(taskId, newColId, newSwimId);
            } catch (error) {
                console.error("Network Error: Rolling back UI...", error);
                task.colId = oldColId;
                task.swimId = oldSwimId;
                this.updateComponents(); 
            }
        }
    });
  }

  // Memory Leak Prevention: Cleans up when user leaves the page
  disconnectedCallback() {
    if (this.dragController) this.dragController.destroy();
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  // --- 2. DATA SYNCHRONIZATION ---
  async loadData() {
    try {
        this.data = await api.getBoard();
        this.isLoading = false;

        const previousCellCount = this.activeCells.size;

        if (this.data.columns.length > 0 && this.data.swimlanes.length > 0) {
            this.activeCells.add(`${this.data.columns[0].id}-${this.data.swimlanes[0].id}`);
        }
        this.data.tasks.forEach(t => this.activeCells.add(`${t.colId}-${t.swimId}`));

        // Diffing Algorithm: Only redraw the whole DOM if the grid size changed.
        if (this.activeCells.size !== previousCellCount || !this.shadow.querySelector('.board-container')) {
            this.render(); 
        } else {
            this.updateComponents(); // Ultra-fast sub-component update
        }

    } catch (error) { console.error("Failed to load:", error); }
  }

  // Fast-Path Hydration
  updateComponents() {
    const listElements = this.shadow.querySelectorAll('kanban-list');
    listElements.forEach(listEl => {
        const colId = parseInt(listEl.getAttribute('data-col-id'));
        const swimId = parseInt(listEl.getAttribute('data-swim-id'));
        listEl.data = {
            column: this.data.columns.find(c => c.id === colId),
            tasks: this.data.tasks.filter(t => t.colId === colId && t.swimId === swimId)
        };
    });
  }

  // --- 3. API ACTIONS ---
  async handleAddList(colIndex, swimIndex) {
    let colId, swimId;

    if (colIndex >= this.data.columns.length) {
        const newCol = await api.createColumn('New List');
        colId = newCol.id;
    } else {
        colId = this.data.columns[colIndex].id;
    }

    if (swimIndex >= this.data.swimlanes.length) {
        const newSwim = await api.createSwimlane('Main Lane');
        swimId = newSwim.id;
    } else {
        swimId = this.data.swimlanes[swimIndex].id;
    }

    this.data = await api.getBoard(); 
    this.activeCells.add(`${colId}-${swimId}`);
    this.render(); 
  }

  async handleAddTask(colId, swimId, text) {
    await api.createTask(colId, swimId, text);
    this.loadData();
  }

  // --- 4. STYLES (Clean UI & Grid) ---
  getStyles() {
    const totalCols = this.data.columns.length + 1; 
    const totalSwims = Math.max(1, this.data.swimlanes.length) + 1; 

    return `
      <style>
        :host { 
            display: block; font-family: sans-serif; height: 100%; box-sizing: border-box; 
            user-select: none; -webkit-user-select: none; /* Prevents blue text highlight during drag */
        }
        
        .board-container { 
            width: 100%; height: 100%; overflow: auto;
            background-color: #f4f5f7; padding: 24px; 
            display: grid; 
            grid-template-columns: repeat(${totalCols}, 272px); 
            grid-template-rows: repeat(${totalSwims}, max-content); 
            gap: 16px; align-items: start;
        }

        .invisible-zone {
            display: flex; align-items: center; justify-content: center; 
            font-weight: bold; color: #6b778c; cursor: pointer;
            min-height: 80px; align-self: stretch;
            opacity: 0; transition: opacity 0.2s, background-color 0.2s; border-radius: 6px;
        }

        .invisible-zone:hover { opacity: 1; background-color: rgba(9,30,66,.08); color: #172b4d; }
        .dead-zone { pointer-events: none; } 
      </style>
    `;
  }

  // --- 5. RENDERER (Adjacency Matrix) ---
  render() {
    const style = this.getStyles();
    if (this.isLoading) { this.shadow.innerHTML = `${style}<div>Loading...</div>`; return; }

    const colCount = this.data.columns.length;
    const swimCount = this.data.swimlanes.length;

    // STATE 1: Empty Board (Auto-creates 1st Col and Swim)
    if (colCount === 0) {
        this.shadow.innerHTML = `${style}<div class="board-container"><div class="invisible-zone" id="first-col-btn" style="grid-column: 1; grid-row: 1; opacity: 1;">+ Create List</div></div>`;
        this.shadow.getElementById('first-col-btn').addEventListener('click', async () => {
            await api.createSwimlane('Main Lane');
            await this.handleAddColumn('New List');
        });
        return;
    }

    // STATE 2: Populated 2D Grid
    let gridHtml = '';
    const totalCols = colCount + 1;
    const totalSwims = swimCount + 1;

    // Map active coordinates for adjacency logic
    const activeIndices = new Set();
    for (let y = 0; y < swimCount; y++) {
        for (let x = 0; x < colCount; x++) {
            const col = this.data.columns[x];
            const swim = this.data.swimlanes[y];
            if (col && swim && this.activeCells.has(`${col.id}-${swim.id}`)) {
                activeIndices.add(`${x}-${y}`);
            }
        }
    }

    // Generate the DOM
    for (let y = 0; y < totalSwims; y++) {
        for (let x = 0; x < totalCols; x++) {
            const isPopulated = activeIndices.has(`${x}-${y}`);
            const gridCoords = `grid-column: ${x + 1}; grid-row: ${y + 1};`;

            if (isPopulated) {
                const col = this.data.columns[x];
                const swim = this.data.swimlanes[y];
                gridHtml += `
                    <kanban-list 
                        class="list-component"
                        data-col-index="${x + 1}"
                        data-col-id="${col.id}"
                        data-swim-id="${swim.id}" 
                        style="${gridCoords}"
                    ></kanban-list>
                `;
            } else {
                // Adjacency Check: Only allow spawning directly next to/below an existing list
                const isAdjacent = activeIndices.has(`${x - 1}-${y}`) || activeIndices.has(`${x + 1}-${y}`) || activeIndices.has(`${x}-${y - 1}`) || activeIndices.has(`${x}-${y + 1}`);

                if (isAdjacent) {
                    gridHtml += `<div class="invisible-zone add-list-btn" data-x="${x}" data-y="${y}" style="${gridCoords}">+ Add List</div>`;
                } else {
                    gridHtml += `<div class="dead-zone" style="${gridCoords}"></div>`;
                }
            }
        }
    }

    this.shadow.innerHTML = `${style}<div class="board-container">${gridHtml}</div>`;
    
    this.updateComponents(); // Hydrate the newly created lists

    // Attach Event Listeners to the Invisible Buttons
    const ghostZones = this.shadow.querySelectorAll('.add-list-btn');
    ghostZones.forEach(zone => {
        zone.addEventListener('click', (e) => {
            const x = parseInt(e.target.getAttribute('data-x'));
            const y = parseInt(e.target.getAttribute('data-y'));
            this.handleAddList(x, y);
        });
    });

    this.attachSizingPhysics();
  }

  // --- 6. SIZING PHYSICS ---
  attachSizingPhysics() {
    if (this.resizeObserver) this.resizeObserver.disconnect();

    this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const listHeight = entry.contentRect.height;
            const listWidth = entry.contentRect.width;
            const colIndex = parseInt(entry.target.getAttribute('data-col-index'));

            // The exact neighbor logic depends on the specific grid layout rendered
            // This ensures invisible zones stretch to match their neighbors
            const nextRight = entry.target.nextElementSibling;
            if (nextRight && nextRight.classList.contains('invisible-zone') && !nextRight.classList.contains('dead-zone')) {
                nextRight.style.height = `${listHeight}px`;
            }
        }
    });

    this.shadow.querySelectorAll('kanban-list').forEach(list => this.resizeObserver.observe(list));
  }
}

customElements.define('kanban-board', KanbanBoard);