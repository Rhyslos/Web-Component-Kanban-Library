/**
 * Modules/kanban-list.mjs (The Smart Component)
 */
import './kanban-card.mjs'; 

export class KanbanList extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.initialized = false;
    }

    set data({ column, tasks }) {
        this.column = column;
        this.tasks = tasks || [];
        
        // 1. First load: Build the HTML shell
        if (!this.initialized) {
            this.renderShell();
            this.initialized = true;
        }
        
        // 2. Subsequent loads: Only update the text and cards
        this.updateData();
    }

    renderShell() {
        this.shadow.innerHTML = `
            <style>
                :host { display: block; height: 100%; box-sizing: border-box; }
                .list { background-color: #ebecf0; border-radius: 6px; display: flex; flex-direction: column; max-height: 100%; box-shadow: 0 1px 2px rgba(9,30,66,.15); transition: box-shadow 0.2s ease, background-color 0.2s ease; }
                .list-header { font-weight: 600; color: #172b4d; padding: 10px 12px; font-size: 0.95rem; }
                .task-list { padding: 0 8px; overflow-y: auto; flex-grow: 1; min-height: 4px; }
                .add-btn { padding: 8px; margin: 2px 8px 8px 8px; cursor: pointer; border: none; background: none; text-align: left; color: #5e6c84; border-radius: 3px; font-size: 0.9rem; }
                .add-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }
                .form-container { display: none; padding: 0 8px 8px 8px; flex-direction: column; gap: 8px; }
                textarea { border: none; border-radius: 3px; padding: 8px; box-shadow: 0 1px 0 rgba(9,30,66,.25); resize: none; font-family: inherit; font-size: 0.9rem; outline: 2px solid #0079bf; outline-offset: -1px; }
                .save-btn { background-color: #0079bf; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-weight: bold; width: fit-content; }
                .save-btn:hover { background-color: #026aa7; }
            </style>
            <div class="list" data-id="${this.column.id}">
                <div class="list-header" id="header-text"></div>
                <div class="task-list" id="task-container"></div>
                
                <button class="add-btn">+ Add a card</button>
                <div class="form-container">
                    <textarea placeholder="Enter a title for this card..." rows="3"></textarea>
                    <button class="save-btn">Add Card</button>
                </div>
            </div>
        `;
        this._attachFormEvents();
    }

    // THE DIFFING ALGORITHM
    updateData() {
        // 1. Update Header Text without touching the DOM
        this.shadow.getElementById('header-text').textContent = this.column.title;

        const container = this.shadow.getElementById('task-container');
        const existingCards = container.querySelectorAll('kanban-card');

        // 2. Update existing cards with new data
        for (let i = 0; i < Math.min(this.tasks.length, existingCards.length); i++) {
            existingCards[i].data = this.tasks[i];
        }

        // 3. If there are MORE new tasks than existing cards, create new elements
        if (this.tasks.length > existingCards.length) {
            for (let i = existingCards.length; i < this.tasks.length; i++) {
                const newCard = document.createElement('kanban-card');
                newCard.data = this.tasks[i];
                container.appendChild(newCard);
            }
        }

        // 4. If there are FEWER new tasks than existing cards, remove the excess
        if (this.tasks.length < existingCards.length) {
            for (let i = existingCards.length - 1; i >= this.tasks.length; i--) {
                container.removeChild(existingCards[i]);
            }
        }
    }

    _attachFormEvents() {
        // (This code remains exactly the same as your previous version)
        const btn = this.shadow.querySelector('.add-btn');
        const form = this.shadow.querySelector('.form-container');
        const saveBtn = this.shadow.querySelector('.save-btn');
        const input = this.shadow.querySelector('textarea');

        btn.addEventListener('click', () => { btn.style.display = 'none'; form.style.display = 'flex'; input.focus(); });

        const submitForm = () => {
            if (input.value.trim() !== '') {
                this.dispatchEvent(new CustomEvent('task-added', { detail: { text: input.value, colId: this.column.id }, bubbles: true, composed: true }));
            }
            btn.style.display = 'block'; form.style.display = 'none'; input.value = '';
        };

        saveBtn.addEventListener('click', submitForm);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitForm(); } });
    }
}
customElements.define('kanban-list', KanbanList);