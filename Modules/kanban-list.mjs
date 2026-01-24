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
        if (!this.initialized) { this.renderShell(); this.initialized = true; }
        this.updateData();
    }

    renderShell() {
        this.shadow.innerHTML = `
            <style>
                :host { display: block; height: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                
                .list { background-color: #ebecf0; border-radius: 6px; display: flex; flex-direction: column; max-height: 100%; box-shadow: 0 1px 2px rgba(9,30,66,.15); transition: box-shadow 0.2s ease; }
                
                .header-container { padding: 12px 14px; position: relative; }
                .header-wrapper { display: flex; align-items: center; gap: 8px; width: 100%; }
                
                /* The Native Color Picker */
                .color-picker { 
                    -webkit-appearance: none; -moz-appearance: none; appearance: none;
                    width: 16px; height: 16px; border: none; border-radius: 50%; cursor: pointer;
                    background: transparent; padding: 0; overflow: hidden;
                    box-shadow: 0 0 0 1px rgba(9,30,66,.15); flex-shrink: 0;
                }
                .color-picker::-webkit-color-swatch-wrapper { padding: 0; }
                .color-picker::-webkit-color-swatch { border: none; }

                .list-header { font-weight: 600; color: #172b4d; font-size: 1rem; cursor: pointer; user-select: none; flex-grow: 1; }
                .header-input { 
                    display: none; width: 100%; box-sizing: border-box; font-family: inherit; font-size: 1rem; font-weight: 600; color: #172b4d;
                    padding: 4px 8px; margin: -4px -8px; border-radius: 4px; border: none; outline: 2px solid #0079bf;
                }

                .task-list { padding: 0 8px; overflow-y: auto; flex-grow: 1; min-height: 4px; }
                
                .add-btn { 
                    display: flex; align-items: center; padding: 10px 12px; margin: 4px 8px 8px 8px; 
                    cursor: pointer; border: none; background: none; text-align: left; 
                    color: #5e6c84; border-radius: 4px; font-size: 0.95rem; font-family: inherit;
                    transition: background-color 0.15s, color 0.15s;
                }
                .add-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }

                .form-container { display: none; padding: 0 8px 8px 8px; flex-direction: column; gap: 8px; }
                .form-input { 
                    border: none; border-radius: 4px; padding: 10px 12px;
                    box-shadow: 0 1px 2px rgba(9,30,66,.15); resize: none; font-family: inherit; font-size: 0.95rem; line-height: 1.4;
                    outline: 2px solid #0079bf; outline-offset: -1px; transition: box-shadow 0.15s;
                }
                .form-controls { display: flex; align-items: center; gap: 8px; }
                .save-btn { background-color: #0079bf; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; font-family: inherit; transition: background-color 0.1s; }
                .save-btn:hover { background-color: #026aa7; }
                .cancel-btn { background: none; border: none; color: #6b778c; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 4px; }
                .cancel-btn:hover { color: #172b4d; }
            </style>
            <div class="list" data-id="${this.column.id}">
                <div class="header-container">
                    <div class="header-wrapper" id="header-wrapper">
                        <input type="color" class="color-picker" id="color-picker" title="Change list color" />
                        <div class="list-header" id="header-display" title="Double click to rename"></div>
                    </div>
                    <input class="header-input" id="header-input" type="text" />
                </div>
                
                <div class="task-list" id="task-container"></div>
                
                <button class="add-btn" id="add-btn">+ Add a card</button>
                <div class="form-container" id="form-container">
                    <textarea class="form-input" id="form-input" placeholder="Enter a title for this card..." rows="3"></textarea>
                    <div class="form-controls">
                        <button class="save-btn" id="save-btn">Add Card</button>
                        <button class="cancel-btn" id="cancel-btn">×</button>
                    </div>
                </div>
            </div>
        `;
        this._attachEvents();
    }

    updateData() {
        const display = this.shadow.getElementById('header-display');
        const colorPicker = this.shadow.getElementById('color-picker');

        if (display.textContent !== this.column.title) display.textContent = this.column.title;
        
        // Sync color picker with backend data
        const listColor = this.column.color || '#dfe1e6';
        if (colorPicker.value !== listColor) colorPicker.value = listColor;

        const container = this.shadow.getElementById('task-container');
        const existingCards = container.querySelectorAll('kanban-card');

        // Pass the listColor to every card
        for (let i = 0; i < Math.min(this.tasks.length, existingCards.length); i++) {
            existingCards[i].data = { ...this.tasks[i], listColor: listColor };
        }

        if (this.tasks.length > existingCards.length) {
            for (let i = existingCards.length; i < this.tasks.length; i++) {
                const newCard = document.createElement('kanban-card');
                newCard.data = { ...this.tasks[i], listColor: listColor };
                container.appendChild(newCard);
            }
        }

        if (this.tasks.length < existingCards.length) {
            for (let i = existingCards.length - 1; i >= this.tasks.length; i--) container.removeChild(existingCards[i]);
        }
    }

    _attachEvents() {
        const display = this.shadow.getElementById('header-display');
        const wrapper = this.shadow.getElementById('header-wrapper');
        const input = this.shadow.getElementById('header-input');

        display.addEventListener('dblclick', () => {
            wrapper.style.display = 'none';
            input.style.display = 'block';
            input.value = this.column.title;
            input.focus();
            input.select();
        });

        const saveHeader = () => {
            const newTitle = input.value.trim();
            if (newTitle !== '' && newTitle !== this.column.title) {
                this.dispatchEvent(new CustomEvent('list-renamed', { detail: { colId: this.column.id, newTitle: newTitle }, bubbles: true, composed: true }));
            }
            wrapper.style.display = 'flex';
            input.style.display = 'none';
        };

        input.addEventListener('blur', saveHeader);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { wrapper.style.display = 'flex'; input.style.display = 'none'; } });

        // LISTENER: Color Changed
        const colorPicker = this.shadow.getElementById('color-picker');
        colorPicker.addEventListener('input', (e) => {
            this.dispatchEvent(new CustomEvent('list-color-changed', { 
                detail: { colId: this.column.id, newColor: e.target.value }, 
                bubbles: true, composed: true 
            }));
        });

        const btn = this.shadow.getElementById('add-btn');
        const form = this.shadow.getElementById('form-container');
        const saveBtn = this.shadow.getElementById('save-btn');
        const cancelBtn = this.shadow.getElementById('cancel-btn');
        const formInput = this.shadow.getElementById('form-input');

        const openForm = () => { btn.style.display = 'none'; form.style.display = 'flex'; formInput.focus(); };
        const closeForm = () => { btn.style.display = 'flex'; form.style.display = 'none'; formInput.value = ''; };

        btn.addEventListener('click', openForm);
        cancelBtn.addEventListener('click', closeForm);

        const submitTask = () => {
            if (formInput.value.trim() !== '') {
                this.dispatchEvent(new CustomEvent('task-added', { detail: { text: formInput.value, colId: this.column.id }, bubbles: true, composed: true }));
            }
            closeForm();
        };

        saveBtn.addEventListener('click', submitTask);
        formInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTask(); } if (e.key === 'Escape') closeForm(); });
    }
}
customElements.define('kanban-list', KanbanList);