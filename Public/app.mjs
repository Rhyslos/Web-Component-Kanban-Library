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

  // 1. GET: Fetch initial data
  async fetchBoardData() {
    try {
        const response = await fetch('/api/board');
        this.data = await response.json();
        this.isLoading = false;
        this.render(); 
    } catch (error) {
        console.error("Failed to load board:", error);
    }
  }

  // 2. POST: Add a new column to the backend
  async addColumn(title) {
    try {
        const response = await fetch('/api/columns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ title: title })
        });
        
        const newColumn = await response.json();
        
        // Add the new column to our local data and re-render
        this.data.columns.push(newColumn);
        this.render();
    } catch (error) {
        console.error("Failed to add column:", error);
    }
  }

  getStyles() {
    return `
      <style>
        :host {
          display: block;
          font-family: sans-serif;
          background-color: #f4f5f7;
          padding: 20px;
          border-radius: 8px;
        }
        .board {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          align-items: flex-start; /* Keeps columns from stretching vertically */
        }
        .column {
          background-color: #ebecf0;
          border-radius: 3px;
          width: 272px;
          min-width: 272px;
          display: flex;
          flex-direction: column;
          padding: 8px;
        }
        .column-header {
          font-weight: bold;
          padding-bottom: 8px;
          text-transform: uppercase;
          font-size: 0.85rem;
          color: #5e6c84;
        }
        .task-card {
          background-color: #fff;
          border-radius: 3px;
          box-shadow: 0 1px 0 rgba(9,30,66,.25);
          padding: 8px;
          margin-bottom: 8px;
          cursor: pointer;
        }
        /* New Styles for Adding Columns */
        .add-column-wrapper {
          background-color: rgba(9, 30, 66, 0.08);
          border-radius: 3px;
          width: 272px;
          min-width: 272px;
          padding: 8px;
          display: flex;
          gap: 8px;
        }
        input {
          flex-grow: 1;
          padding: 6px;
          border: 2px solid #0079bf;
          border-radius: 3px;
          outline: none;
        }
        button {
          background-color: #0079bf;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 3px;
          cursor: pointer;
          font-weight: bold;
        }
        button:hover {
          background-color: #026aa7;
        }
        .loading {
            text-align: center;
            color: #5e6c84;
            font-style: italic;
        }
      </style>
    `;
  }

  render() {
    const style = this.getStyles();

    if (this.isLoading) {
        this.shadow.innerHTML = `${style}<div class="loading">Loading board...</div>`;
        return;
    }
    
    // Build the existing columns
    const boardHtml = this.data.columns.map(col => `
      <div class="column" data-id="${col.id}">
        <div class="column-header">${col.title}</div>
        <div class="task-list">
          ${col.tasks.map(task => `
            <div class="task-card" data-task-id="${task.id}">${task.text}</div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // 3. Inject HTML including the new "Add Column" section at the end
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

    // 4. Attach Event Listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    const btn = this.shadow.getElementById('add-column-btn');
    const input = this.shadow.getElementById('new-column-input');

    // Handle Button Click
    btn.addEventListener('click', () => {
        const title = input.value.trim();
        if (title !== "") {
            this.addColumn(title);
        }
    });

    // Handle "Enter" key press
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btn.click(); 
        }
    });
  }
}

customElements.define('kanban-board', KanbanBoard);