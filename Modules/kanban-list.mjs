import './kanban-card.mjs'; 

export class KanbanList extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.initialized = false;
        this._availableCategories = [];
        this._allUsers = [];
    }

    set data({ column, tasks, color, title, category, locked, swimId, availableCategories, allUsers }) {
        this.column = column;
        this.tasks = tasks || [];
        this.color = color;
        this.title = title;
        this.category = category;
        this.locked = locked;
        this.swimId = swimId;
        this._availableCategories = availableCategories || [];
        this._allUsers = allUsers || [];
        
        if (!this.initialized) { this.renderShell(); this.initialized = true; }
        this.updateData();
    }

    renderShell() {
        this.shadow.innerHTML = `
            <style>
                :host { 
                    display: block; 
                    height: 100%; 
                    box-sizing: border-box; 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                    outline: none; 
                }
                
                .list { 
                    background-color: #ebecf0; 
                    border-radius: 6px; 
                    display: flex; 
                    flex-direction: column; 
                    max-height: 100%; 
                    box-shadow: 0 1px 2px rgba(9,30,66,.15); 
                    transition: box-shadow 0.2s ease; 
                    border-top: 5px solid var(--list-color, transparent); 
                    position: relative; 
                    outline: none;
                }
                
                .header-container { padding: 12px 14px; position: relative; }
                
                .header-top { display: flex; align-items: center; gap: 8px; width: 100%; margin-bottom: 6px; }
                .header-bottom { display: flex; align-items: center; gap: 6px; width: 100%; }

                .color-picker { -webkit-appearance: none; -moz-appearance: none; appearance: none; width: 16px; height: 16px; border: none; border-radius: 50%; cursor: pointer; background: transparent; padding: 0; overflow: hidden; box-shadow: 0 0 0 1px rgba(9,30,66,.15); flex-shrink: 0; }
                .color-picker::-webkit-color-swatch-wrapper { padding: 0; }
                .color-picker::-webkit-color-swatch { border: none; }
                
                .list-header { font-weight: 600; color: #172b4d; font-size: 1rem; cursor: pointer; user-select: none; flex-grow: 1; }
                .header-input { display: none; width: 100%; box-sizing: border-box; font-family: inherit; font-size: 1rem; font-weight: 600; color: #172b4d; padding: 4px 8px; margin: -4px -8px; border-radius: 4px; border: none; outline: 2px solid #0079bf; }
                
                .menu-btn { border: none; background: none; font-size: 1.2rem; cursor: pointer; color: #6b778c; padding: 0 4px; border-radius: 4px; font-weight: bold; }
                .menu-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }

                .cat-input {
                    flex-grow: 1; border: 1px solid transparent; background: rgba(9,30,66,.04); 
                    border-radius: 3px; font-size: 0.75rem; padding: 2px 6px; color: #5e6c84;
                    font-weight: 600; text-transform: uppercase;
                }
                .cat-input:focus { background: white; border-color: #0079bf; outline: none; color: #172b4d; }
                .cat-input::placeholder { color: #97a0af; opacity: 1; }

                .lock-btn { border: none; background: none; font-size: 0.9rem; cursor: pointer; padding: 2px; opacity: 0.5; transition: opacity 0.2s; }
                .lock-btn:hover { opacity: 1; }
                .lock-btn.locked { opacity: 1; }

                .menu-dropdown { display: none; position: absolute; top: 35px; right: 8px; z-index: 100; background: white; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #dfe1e6; min-width: 150px; overflow: hidden; }
                .menu-dropdown.open { display: block; }
                .menu-item { display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; cursor: pointer; font-family: inherit; font-size: 0.9rem; color: #172b4d; }
                .menu-item:hover { background-color: #f4f5f7; }
                .menu-item.danger { color: #BF0000; }
                .menu-item.danger:hover { background-color: #ffeaea; }

                .task-list { padding: 0 8px; overflow-y: auto; flex-grow: 1; min-height: 4px; }
                .add-btn { display: flex; align-items: center; padding: 10px 12px; margin: 4px 8px 8px 8px; cursor: pointer; border: none; background: none; text-align: left; color: #5e6c84; border-radius: 4px; font-size: 0.95rem; font-family: inherit; transition: background-color 0.15s, color 0.15s; }
                .add-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }
                .form-container { display: none; padding: 0 8px 8px 8px; flex-direction: column; gap: 8px; }
                .form-input { border: none; border-radius: 4px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(9,30,66,.15); resize: none; font-family: inherit; font-size: 0.95rem; line-height: 1.4; outline: 2px solid #0079bf; outline-offset: -1px; transition: box-shadow 0.15s; }
                .form-controls { display: flex; align-items: center; gap: 8px; }
                .save-btn { background-color: #0079bf; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; font-family: inherit; transition: background-color 0.1s; }
                .save-btn:hover { background-color: #026aa7; }
                .cancel-btn { background: none; border: none; color: #6b778c; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 4px; }
                .cancel-btn:hover { color: #172b4d; }
            </style>
            
            <datalist id="global-cats"></datalist>

            <div class="list" data-id="${this.column.id}">
                <div class="header-container">
                    <div class="header-top" id="header-wrapper">
                        <input type="color" class="color-picker" id="color-picker" title="Change list color" />
                        <div class="list-header" id="header-display" title="Double click to rename"></div>
                        <button class="menu-btn" id="menu-btn">⋮</button>
                    </div>
                    <input class="header-input" id="header-input" type="text" />

                    <div class="header-bottom">
                        <input class="cat-input" id="cat-input" list="global-cats" placeholder="Category" />
                        <button class="lock-btn" id="lock-btn" title="Lock category">🔓</button>
                    </div>

                    <div class="menu-dropdown" id="menu-dropdown">
                        <button class="menu-item danger" id="btn-delete-list">Delete List...</button>
                    </div>
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
        const catInput = this.shadow.getElementById('cat-input');
        const lockBtn = this.shadow.getElementById('lock-btn');
        const datalist = this.shadow.getElementById('global-cats');

        // Parent provides valid title
        if (display.textContent !== this.title) display.textContent = this.title;
        
        const listColor = this.color || '#dfe1e6';
        this.style.setProperty('--list-color', listColor);
        if (colorPicker.value !== listColor) colorPicker.value = listColor;

        if (catInput.value !== (this.category || '')) catInput.value = this.category || '';
        
        if (this.locked) {
            lockBtn.textContent = '🔒'; 
            lockBtn.classList.add('locked'); 
            lockBtn.title = "Category Locked";
        } else {
            lockBtn.textContent = '🔓'; 
            lockBtn.classList.remove('locked'); 
            lockBtn.title = "Category Unlocked";
        }

        datalist.innerHTML = this._availableCategories.map(c => `<option value="${c}"></option>`).join('');

        const container = this.shadow.getElementById('task-container');
        const existingCards = container.querySelectorAll('kanban-card');

        for (let i = 0; i < Math.min(this.tasks.length, existingCards.length); i++) {
            // Pass allUsers down for the assignment menu
            existingCards[i].data = { 
                ...this.tasks[i], 
                availableCategories: this._availableCategories, 
                allUsers: this._allUsers 
            };
        }
        if (this.tasks.length > existingCards.length) {
            for (let i = existingCards.length; i < this.tasks.length; i++) {
                const newCard = document.createElement('kanban-card');
                newCard.data = { 
                    ...this.tasks[i], 
                    availableCategories: this._availableCategories, 
                    allUsers: this._allUsers 
                };
                newCard.setAttribute('data-id', this.tasks[i].id);
                newCard.setAttribute('data-col-id', this.column.id);
                if(this.tasks[i].swimlaneId) newCard.setAttribute('data-swim-id', this.tasks[i].swimlaneId);
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
            input.value = this.title; 
            input.focus(); 
            input.select(); 
        });

        const saveHeader = () => {
            const newTitle = input.value.trim();
            if (newTitle !== '' && newTitle !== this.title) { 
                this.dispatchEvent(new CustomEvent('list-title-changed', { detail: { colId: this.column.id, swimId: this.swimId, newTitle: newTitle }, bubbles: true, composed: true })); 
            }
            wrapper.style.display = 'flex'; 
            input.style.display = 'none';
        };
        input.addEventListener('blur', saveHeader);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { wrapper.style.display = 'flex'; input.style.display = 'none'; } });

        const colorPicker = this.shadow.getElementById('color-picker');
        colorPicker.addEventListener('input', (e) => { this.style.setProperty('--list-color', e.target.value); });
        colorPicker.addEventListener('change', (e) => {
            this.dispatchEvent(new CustomEvent('list-color-changed', { detail: { colId: this.column.id, swimId: this.swimId, newColor: e.target.value }, bubbles: true, composed: true }));
        });

        const catInput = this.shadow.getElementById('cat-input');
        catInput.addEventListener('change', () => {
             this.dispatchEvent(new CustomEvent('list-cat-changed', { detail: { colId: this.column.id, swimId: this.swimId, newCat: catInput.value.trim() }, bubbles: true, composed: true }));
        });

        const lockBtn = this.shadow.getElementById('lock-btn');
        lockBtn.addEventListener('click', () => {
             this.dispatchEvent(new CustomEvent('list-lock-toggled', { detail: { colId: this.column.id, swimId: this.swimId, isLocked: !this.locked }, bubbles: true, composed: true }));
        });

        const menuBtn = this.shadow.getElementById('menu-btn');
        const menuDropdown = this.shadow.getElementById('menu-dropdown');
        const deleteBtn = this.shadow.getElementById('btn-delete-list');
        menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menuDropdown.classList.toggle('open'); });
        document.addEventListener('click', () => { if (menuDropdown.classList.contains('open')) menuDropdown.classList.remove('open'); });
        deleteBtn.addEventListener('click', () => { this.dispatchEvent(new CustomEvent('list-deleted', { detail: { colId: this.column.id, swimId: this.swimId }, bubbles: true, composed: true })); });

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