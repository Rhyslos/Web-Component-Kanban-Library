export class KanbanBoard extends HTMLElement {
  constructor() {
    super();
    // 1. Attach Shadow DOM: This ensures styles are isolated (encapsulated)
    this.shadow = this.attachShadow({ mode: "open" });
    
    // Default state
    this.data = {
      columns: [
        { id: 1, title: "To Do", tasks: ["Task A", "Task B"] },
        { id: 2, title: "Doing", tasks: ["Task C"] },
        { id: 3, title: "Done", tasks: ["Task D"] }
      ]
    };
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    this.render();
  }

  // 2. Define internal styles (scoped only to this component)
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
        }
        .column {
          background-color: #ebecf0;
          border-radius: 3px;
          width: 272px;
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
        .task-card:hover {
          background-color: #f4f5f7;
        }
      </style>
    `;
  }

  // 3. Render the HTML structure
  render() {
    const style = this.getStyles();
    
    // Map through data to build HTML strings
    const boardHtml = this.data.columns.map(col => `
      <div class="column">
        <div class="column-header">${col.title}</div>
        <div class="task-list">
          ${col.tasks.map(task => `
            <div class="task-card">${task}</div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Inject into Shadow DOM
    this.shadow.innerHTML = `
      ${style}
      <div class="board">
        ${boardHtml}
      </div>
    `;
  }
}

// Define the custom element tag
customElements.define('kanban-board', KanbanBoard);

// Using AI to kickstart because i am completely unsure how to begin, and keeps comments intentionally to read through and understand later