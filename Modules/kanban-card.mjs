/**
 * kanban-card.mjs
 */
export class KanbanCard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
    }

    // Pass data into the component
    set data(taskObj) {
        this.task = taskObj;
        this.render();
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host { display: block; }
                .task-card { 
                    background-color: #fff; 
                    border-radius: 3px; 
                    box-shadow: 0 1px 0 rgba(9,30,66,.25); 
                    padding: 8px; 
                    margin-bottom: 8px; 
                    cursor: grab; 
                    word-wrap: break-word;
                }
                .task-card:hover { background-color: #f4f5f7; }
            </style>
            <div class="task-card" data-task-id="${this.task.id}">
                ${this.task.text}
            </div>
        `;
    }
}
customElements.define('kanban-card', KanbanCard);