/**
 * Modules/kanban-list.mjs
 */
import './kanban-card.mjs'; 

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
        const cardsHtml = this.tasks.map(() => `<kanban-card></kanban-card>`).join('');

        this.shadow.innerHTML = `
            <style>
                :host { display: block; height: 100%; box-sizing: border-box; }
                
                .list { 
        background-color: #ebecf0; 
        border-radius: 6px; 
        display: flex; 
        flex-direction: column; 
        max-height: 100%; 
        font-family: sans-serif;
        box-shadow: 0 1px 2px rgba(9,30,66,.15);

        /* THE ANIMATION: Smoothly transition the blue highlight when a card hovers over it */
        transition: box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out;
    }

                .list-header { 
                    font-weight: 600; 
                    color: #172b4d; 
                    padding: 10px 12px; 
                    font-size: 0.95rem;
                }

                .task-list { 
                    padding: 0 8px; 
                    overflow-y: auto; 
                    flex-grow: 1; 
                    min-height: 4px; 
                }
                
                /* Trello-style Footer Button */
                .add-btn { 
                    padding: 8px; 
                    margin: 2px 8px 8px 8px; 
                    cursor: pointer; 
                    border: none; 
                    background: none; 
                    text-align: left; 
                    color: #5e6c84;
                    border-radius: 3px;
                    font-size: 0.9rem;
                }
                .add-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }

                /* Inline Form */
                .form-container { display: none; padding: 0 8px 8px 8px; flex-direction: column; gap: 8px; }
                textarea {
                    border: none; border-radius: 3px; padding: 8px;
                    box-shadow: 0 1px 0 rgba(9,30,66,.25);
                    resize: none; font-family: inherit; font-size: 0.9rem;
                    outline: 2px solid #0079bf; outline-offset: -1px;
                }
                .save-btn {
                    background-color: #0079bf; color: white; border: none;
                    padding: 6px 12px; border-radius: 3px; cursor: pointer;
                    font-weight: bold; width: fit-content;
                }
                .save-btn:hover { background-color: #026aa7; }
            </style>

            <div class="list" data-id="${this.column.id}">
                <div class="list-header">${this.column.title}</div>
                <div class="task-list">
                    ${cardsHtml}
                </div>
                
                <button class="add-btn">+ Add a card</button>
                <div class="form-container">
                    <textarea placeholder="Enter a title for this card..." rows="3"></textarea>
                    <button class="save-btn">Add Card</button>
                </div>
            </div>
        `;

        // Hydrate the generated cards
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

        const submitForm = () => {
            if (input.value.trim() !== '') {
                this.dispatchEvent(new CustomEvent('task-added', { 
                    detail: { text: input.value, colId: this.column.id },
                    bubbles: true, composed: true 
                }));
            }
            btn.style.display = 'block';
            form.style.display = 'none';
            input.value = '';
        };

        saveBtn.addEventListener('click', submitForm);

        // Allow pressing 'Enter' to submit
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitForm();
            }
        });
    }
}
customElements.define('kanban-list', KanbanList);