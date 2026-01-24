/**
 * Modules/kanban-card.mjs (The Interactive Card)
 */
export class KanbanCard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.isEditing = false;
    }

    set data(taskObj) {
        this._task = taskObj; 
        this.render();
    }

    get data() { return this._task; }

    render() {
        if (!this._task) return; 

        this.shadow.innerHTML = `
            <style>
                :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                
                /* Premium Card Styling */
                .task-card { 
        background-color: #fff; 
        border-radius: 4px; 
        box-shadow: 0 1px 2px rgba(9,30,66,.15); 
        padding: 10px 12px; 
        margin-bottom: 8px; 
        font-size: 0.95rem;
        color: #172b4d;
        line-height: 1.4;
        user-select: none; -webkit-user-select: none;
        border: 1px solid transparent;
        transition: box-shadow 0.15s ease, background-color 0.15s ease;

        /* THE FIX: The classic pointer finger (High contrast, native, and clean) */
        cursor: pointer; 
    }

    .task-card:hover { 
        background-color: #f4f5f7; 
        box-shadow: 0 4px 8px rgba(9,30,66,.15); 
        border-color: #dfe1e6; 
    }
                .text-display { pointer-events: none; } /* Let the parent catch the double click */

                /* The Hidden Edit Form */
                .edit-form { display: none; margin-bottom: 8px; }
                .edit-input {
                    width: 100%; box-sizing: border-box;
                    font-family: inherit; font-size: 0.95rem; line-height: 1.4;
                    padding: 10px 12px; border-radius: 4px;
                    border: none; outline: 2px solid #0079bf; outline-offset: -1px;
                    background-color: #fff; color: #172b4d;
                    resize: none; box-shadow: 0 2px 4px rgba(9,30,66,.2);
                }
            </style>
            
            <div class="task-card" id="card-display">
                <span class="text-display">${this._task.text}</span>
            </div>

            <div class="edit-form" id="edit-form">
                <textarea class="edit-input" id="edit-input" rows="3"></textarea>
            </div>
        `;

        this._attachEvents();
    }

    _attachEvents() {
        const display = this.shadow.getElementById('card-display');
        const form = this.shadow.getElementById('edit-form');
        const input = this.shadow.getElementById('edit-input');

        // 1. DOUBLE CLICK TO EDIT
        display.addEventListener('dblclick', (e) => {
            e.stopPropagation(); // Stop the drag controller from firing
            this.isEditing = true;
            display.style.display = 'none';
            form.style.display = 'block';
            input.value = this._task.text;
            input.focus();
            input.select(); // Highlight the text so it's easy to overwrite
        });

        const saveChanges = () => {
            if (!this.isEditing) return;
            this.isEditing = false;
            
            const newText = input.value.trim();
            if (newText !== '' && newText !== this._task.text) {
                // Dispatch event to the main board to save the change
                this.dispatchEvent(new CustomEvent('task-renamed', { 
                    detail: { taskId: this._task.id, newText: newText }, 
                    bubbles: true, composed: true 
                }));
            } else {
                // Revert UI if no changes were made
                display.style.display = 'block';
                form.style.display = 'none';
            }
        };

        // 2. SAVE ON BLUR (Clicking away) OR ENTER KEY
        input.addEventListener('blur', saveChanges);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                input.blur(); // Trigger the blur event
            }
            if (e.key === 'Escape') {
                this.isEditing = false;
                display.style.display = 'block';
                form.style.display = 'none';
            }
        });
    }
}
customElements.define('kanban-card', KanbanCard);