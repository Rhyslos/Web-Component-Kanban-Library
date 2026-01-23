/**
 * Public/app.mjs (The Strict Adjacency Grid)
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
    this.activeCells = new Set(); 
  }

  connectedCallback() {
    this.render();
    this.loadData();

    this.shadow.addEventListener('task-added', (e) => {
        const swimId = e.target.getAttribute('data-swim-id') ? parseInt(e.target.getAttribute('data-swim-id')) : this.data.swimlanes[0].id;
        this.handleAddTask(e.detail.colId, swimId, e.detail.text); 
    });

    this.dragController = new DragController(this.shadow, {
        onDrop: (taskId, newColId, newSwimId) => {
            api.moveTask(taskId, newColId, newSwimId);
            this.loadData();
        }
    });
  }

  disconnectedCallback() {
    // 1. Kill the Physics Engine and Window Listeners
    if (this.dragController) {
        this.dragController.destroy();
    }

    // 2. Kill the ResizeObserver
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
    }
  }

  async loadData() {
    try {
        this.data = await api.getBoard();
        this.isLoading = false;

        // Count previous active cells to detect grid structural changes
        const previousCellCount = this.activeCells.size;

        // Update grid memory
        if (this.data.columns.length > 0 && this.data.swimlanes.length > 0) {
            this.activeCells.add(`${this.data.columns[0].id}-${this.data.swimlanes[0].id}`);
        }
        this.data.tasks.forEach(t => this.activeCells.add(`${t.colId}-${t.swimId}`));

        // THE DIFFING LOGIC:
        // If the number of lists changed, we MUST redraw the grid.
        // If the number is the same (meaning only tasks moved), just update data.
        if (this.activeCells.size !== previousCellCount || !this.shadow.querySelector('.board-container')) {
            this.render(); // Heavy DOM operation
        } else {
            this.updateComponents(); // Ultra-fast data injection
        }

    } catch (error) { console.error("Failed to load:", error); }
  }

  // Fast-Path: Pass new data to existing DOM elements
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

    // THE FIX: Fetch the updated database first
    this.data = await api.getBoard(); 

    // Then, lock the new cell into memory
    this.activeCells.add(`${colId}-${swimId}`);

    // Finally, render the UI directly
    this.render(); 
  }

  async handleAddTask(colId, swimId, text) {
    await api.createTask(colId, swimId, text);
    this.loadData();
  }

  // --- STYLES (Unchanged) ---
  getStyles() {
    const totalCols = this.data.columns.length + 1; 
    const totalSwims = Math.max(1, this.data.swimlanes.length) + 1; 

    return `
      <style>
  :host { 
      display: block; 
      font-family: sans-serif; 
      height: 100%; 
      box-sizing: border-box; 
      
      /* Prevents highlight on the board background */
      user-select: none; 
      -webkit-user-select: none; 
  }
        
        .board-container { 
            width: 100%; height: 100%; overflow: auto;
            background-color: #f4f5f7; padding: 24px; 
            display: grid; 
            grid-template-columns: repeat(${totalCols}, 272px); 
            grid-template-rows: repeat(${totalSwims}, max-content); 
            gap: 16px; 
            align-items: start;
        }

        .invisible-zone {
            display: flex; align-items: center; justify-content: center; 
            font-weight: bold; color: #6b778c; cursor: pointer;
            min-height: 80px; align-self: stretch;
            opacity: 0; transition: opacity 0.2s, background-color 0.2s; border-radius: 6px;
        }

        .invisible-zone:hover { opacity: 1; background-color: rgba(9,30,66,.08); color: #172b4d; }
        
        /* Dead zones have no pointer events so they cannot be clicked or hovered */
        .dead-zone { pointer-events: none; } 
      </style>
    `;
  }

  // --- RENDERING WITH ADJACENCY MATRIX ---
  render() {
    const style = this.getStyles();
    if (this.isLoading) { this.shadow.innerHTML = `${style}<div>Loading...</div>`; return; }

    const colCount = this.data.columns.length;
    const swimCount = this.data.swimlanes.length;

    if (colCount === 0) {
        this.shadow.innerHTML = `${style}<div class="board-container"><div class="invisible-zone" id="first-col-btn" style="grid-column: 1; grid-row: 1; opacity: 1;">+ Create List</div></div>`;
        this.shadow.getElementById('first-col-btn').addEventListener('click', () => this.handleAddList(0, 0));
        return;
    }

    let gridHtml = '';
    const totalCols = colCount + 1;
    const totalSwims = swimCount + 1;

    // 1. Map existing lists by their X/Y indices so we can easily check neighbors
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

    // 2. Loop the entire grid
    for (let y = 0; y < totalSwims; y++) {
        for (let x = 0; x < totalCols; x++) {
            const isPopulated = activeIndices.has(`${x}-${y}`);
            const gridCoords = `grid-column: ${x + 1}; grid-row: ${y + 1};`;

            if (isPopulated) {
                // Render the real list
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
                // 3. THE FIX: Check if this empty space touches an active list (Top, Bottom, Left, or Right)
                const isAdjacent = 
                    activeIndices.has(`${x - 1}-${y}`) || // Left
                    activeIndices.has(`${x + 1}-${y}`) || // Right
                    activeIndices.has(`${x}-${y - 1}`) || // Top
                    activeIndices.has(`${x}-${y + 1}`);   // Bottom

                if (isAdjacent) {
                    // Valid drop zone (directly next to or below a list)
                    gridHtml += `
                        <div class="invisible-zone add-list-btn" data-x="${x}" data-y="${y}" style="${gridCoords}">
                            + Add List
                        </div>
                    `;
                } else {
                    // Invalid zone (diagonal). Render an empty, unclickable spacer.
                    gridHtml += `<div class="dead-zone" style="${gridCoords}"></div>`;
                }
            }
        }
    }

    this.shadow.innerHTML = `${style}<div class="board-container">${gridHtml}</div>`;
    
    // Hydrate
    const listElements = this.shadow.querySelectorAll('kanban-list');
    listElements.forEach(listEl => {
        const colId = parseInt(listEl.getAttribute('data-col-id'));
        const swimId = parseInt(listEl.getAttribute('data-swim-id'));
        listEl.data = {
            column: this.data.columns.find(c => c.id === colId),
            tasks: this.data.tasks.filter(t => t.colId === colId && t.swimId === swimId)
        };
    });

    // Attach Listeners
    const ghostZones = this.shadow.querySelectorAll('.add-list-btn');
    ghostZones.forEach(zone => {
        zone.addEventListener('click', (e) => {
            const x = parseInt(e.target.getAttribute('data-x'));
            const y = parseInt(e.target.getAttribute('data-y'));
            this.handleAddList(x, y);
        });
    });
  }
}

customElements.define('kanban-board', KanbanBoard);