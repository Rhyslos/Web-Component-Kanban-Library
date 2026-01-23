/**
 * kanban-list.mjs
 */
import './kanban-card.mjs'; // Import the child component

export class KanbanList extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
    }

    set data({ column, tasks }) {
        this.column = column;
        this.tasks = tasks || [];
        this.render();
    }

    render() {
        // We create <kanban-card> elements dynamically
        const cardsHtml = this.tasks.map(t => `<kanban-card></kanban-card>`).join('');

        this.shadow.innerHTML = `
            <style>
                :host { display: block; height: 100%; }
                .list { background-color: #ebecf0; border-radius: 6px; display: flex; flex-direction: column; max-height: 100%; }
                .list-header { font-weight: bold; padding: 12px; }
                .task-list { padding: 0 8px; overflow-y: auto; flex-grow: 1; min-height: 10px; }
                
                /* Inline Form Styles */
                .add-btn { padding: 8px; margin: 8px; cursor: pointer; border: none; background: none; text-align: left; color: #5e6c84;}
                .add-btn:hover { background-color: rgba(9,30,66,.08); }
                .form-container { display: none; padding: 8px; flex-direction: column; gap: 8px; }
            </style>
            <div class="list" data-id="${this.column.id}">
                <div class="list-header">${this.column.title}</div>
                <div class="task-list" id="task-container">
                    ${cardsHtml}
                </div>
                
                <button class="add-btn">+ Add a card</button>
                <div class="form-container">
                    <textarea placeholder="Enter title..."></textarea>
                    <button class="save-btn">Add Card</button>
                </div>
            </div>
        `;

        // Hydrate the cards with data
        const cardElements = this.shadow.querySelectorAll('kanban-card');
        cardElements.forEach((el, index) => el.data = this.tasks[index]);

        this._attachFormEvents();
    }

    _attachFormEvents() {
        const btn = this.shadow.querySelector('.add-btn');
        const form = this.shadow.querySelector('.form-container');
        const saveBtn = this.shadow.querySelector('.save-btn');
        const input = this.shadow.querySelector('textarea');

        btn.addEventListener('click', () => {
            btn.style.display = 'none';
            form.style.display = 'flex';
            input.focus();
        });

        saveBtn.addEventListener('click', () => {
            if (input.value.trim() !== '') {
                // Dispatch a custom event to the main board
                this.dispatchEvent(new CustomEvent('task-added', { 
                    detail: { text: input.value, colId: this.column.id },
                    bubbles: true, composed: true 
                }));
            }
            // Reset form
            btn.style.display = 'block';
            form.style.display = 'none';
            input.value = '';
        });
    }
}
customElements.define('kanban-list', KanbanList);