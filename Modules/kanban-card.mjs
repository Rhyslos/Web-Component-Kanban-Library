/**
 * Modules/kanban-card.mjs (The 4-Layer Interactive Card)
 */
export class KanbanCard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.isEditingTitle = false;
        this.isEditingCategory = false;
    }

    set data(taskObj) {
        this._task = taskObj; 
        this.render();
    }

    get data() { return this._task; }

    render() {
        if (!this._task) return; 

        // The banner color (defaults to grey if no list color is set)
        const bannerColor = this._task.listColor || '#dfe1e6'; 
        // The category text (defaults to empty string)
        const categoryText = this._task.category || '';

        this.shadow.innerHTML = `
            <style>
                :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                
                /* 1. THE WRAPPER (Padding removed so the banner can touch the edges) */
                .task-card { 
                    background-color: #fff; 
                    border-radius: 4px; 
                    box-shadow: 0 1px 2px rgba(9,30,66,.15); 
                    margin-bottom: 8px; 
                    cursor: pointer;
                    color: #172b4d;
                    user-select: none; -webkit-user-select: none;
                    transition: box-shadow 0.15s ease, background-color 0.15s ease;
                    border: 1px solid transparent;
                    
                    display: flex;
                    flex-direction: column;
                    overflow: hidden; /* Clips the banner's top corners to match the border-radius */
                }

                .task-card:hover { 
                    background-color: #f4f5f7; 
                    box-shadow: 0 4px 8px rgba(9,30,66,.15); 
                    border-color: #dfe1e6; 
                }

                /* 2. THE NEW FEATURE: THE 25% CATEGORY BANNER */
                .card-banner {
                    background-color: ${bannerColor};
                    height: 24px; /* Exactly 1/4th of an average 96px card */
                    display: flex; align-items: center; justify-content: flex-start;
                    padding: 0 12px;
                    font-size: 0.75rem; font-weight: 700; color: #172b4d;
                    text-transform: uppercase; letter-spacing: 0.5px;
                    transition: background-color 0.1s;
                }
                .card-banner:hover { filter: brightness(0.9); } /* Darken slightly on hover to show clickability */

                /* 3. The Input for the Banner */
                .banner-input {
                    display: none; height: 24px; width: 100%; box-sizing: border-box;
                    background-color: #fff; color: #172b4d; border: none; 
                    font-family: inherit; font-size: 0.75rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.5px;
                    padding: 0 12px; outline: none;
                }

                /* 4. THE REST OF THE SANDWICH (Now has the padding) */
                .card-content { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
                .card-header { font-size: 0.95rem; line-height: 1.4; pointer-events: none; }
                .card-body, .card-footer { display: flex; flex-wrap: wrap; gap: 4px; }
                .card-body:empty, .card-footer:empty { display: none; }

                /* Task Title Edit Form */
                .edit-form { display: none; margin-bottom: 8px; }
                .edit-input { width: 100%; box-sizing: border-box; font-family: inherit; font-size: 0.95rem; line-height: 1.4; padding: 10px 12px; border-radius: 4px; border: none; outline: 2px solid #0079bf; outline-offset: -1px; background-color: #fff; color: #172b4d; resize: none; box-shadow: 0 2px 4px rgba(9,30,66,.2); }
            </style>
            
            <div class="task-card" id="card-display">
                
                <div class="card-banner" id="banner-display" title="Click to add category">
                    ${categoryText}
                </div>
                <input class="banner-input" id="banner-input" placeholder="NAME CATEGORY..." maxlength="20" />

                <div class="card-content" id="card-content">
                    <div class="card-header"><span class="text-display">${this._task.text}</span></div>
                    <div class="card-body" id="card-body"></div>
                    <div class="card-footer" id="card-footer"></div>
                </div>
            </div>

            <div class="edit-form" id="edit-form">
                <textarea class="edit-input" id="edit-input" rows="3"></textarea>
            </div>
        `;

        this._attachEvents();
    }

    _attachEvents() {
        const cardDisplay = this.shadow.getElementById('card-display');
        const contentArea = this.shadow.getElementById('card-content');
        
        // --- 1. CATEGORY BANNER EVENTS (Single Click) ---
        const banner = this.shadow.getElementById('banner-display');
        const bannerInput = this.shadow.getElementById('banner-input');

        banner.addEventListener('click', (e) => {
            e.stopPropagation(); 
            this.isEditingCategory = true;
            banner.style.display = 'none';
            bannerInput.style.display = 'block';
            bannerInput.value = this._task.category || '';
            bannerInput.focus();
        });

        const saveCategory = () => {
            if (!this.isEditingCategory) return;
            this.isEditingCategory = false;
            
            const newCategory = bannerInput.value.trim();
            if (newCategory !== (this._task.category || '')) {
                this.dispatchEvent(new CustomEvent('category-changed', { 
                    detail: { taskId: this._task.id, newCategory: newCategory }, 
                    bubbles: true, composed: true 
                }));
            } else {
                banner.style.display = 'flex';
                bannerInput.style.display = 'none';
            }
        };

        bannerInput.addEventListener('blur', saveCategory);
        bannerInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); bannerInput.blur(); } 
        });


        // --- 2. TASK TITLE EVENTS (Double Click) ---
        const form = this.shadow.getElementById('edit-form');
        const input = this.shadow.getElementById('edit-input');

        contentArea.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.isEditingTitle = true;
            cardDisplay.style.display = 'none';
            form.style.display = 'block';
            input.value = this._task.text;
            input.focus();
            input.select(); 
        });

        const saveTitle = () => {
            if (!this.isEditingTitle) return;
            this.isEditingTitle = false;
            
            const newText = input.value.trim();
            if (newText !== '' && newText !== this._task.text) {
                this.dispatchEvent(new CustomEvent('task-renamed', { 
                    detail: { taskId: this._task.id, newText: newText }, 
                    bubbles: true, composed: true 
                }));
            } else {
                cardDisplay.style.display = 'flex';
                form.style.display = 'none';
            }
        };

        input.addEventListener('blur', saveTitle);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { this.isEditingTitle = false; cardDisplay.style.display = 'flex'; form.style.display = 'none'; }
        });
    }
}
customElements.define('kanban-card', KanbanCard);