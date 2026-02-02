export class KanbanCard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.isEditingTitle = false;
        this.isEditingCategory = false;
        this._categories = []; 
        this._allUsers = [];
    }

    set data(taskObj) {
        this._task = taskObj; 
        if (taskObj.availableCategories) this._categories = taskObj.availableCategories;
        if (taskObj.allUsers) this._allUsers = taskObj.allUsers;
        this.render();
    }

    get data() { return this._task; }

    render() {
        if (!this._task) return; 
        const categoryText = this._task.category || '';
        const assignee = this._task.assignee || null;
        const dueDate = this._task.dueDate || null;

        // Dropdown Items
        const dropdownItems = this._categories.map(c => `<div class="cat-item" data-val="${c}">${c}</div>`).join('');
        const dropdownHtml = this._categories.length > 0 
            ? `<div class="category-dropdown" id="cat-dropdown">${dropdownItems}</div>`
            : `<div class="category-dropdown" id="cat-dropdown"><div class="empty-msg">Type to add new...</div></div>`;

        // Avatar
        let avatarHtml = '';
        if (assignee) {
            const initial = assignee.charAt(0).toUpperCase();
            avatarHtml = `<div class="user-avatar" title="Assigned to ${assignee}">${initial}</div>`;
        } else {
            avatarHtml = `<div class="user-avatar empty" title="Unassigned">?</div>`;
        }

        // User Options
        const userOptions = this._allUsers.map(u => `<div class="menu-item user-option" data-user="${u.username}">${u.username}</div>`).join('');

        // Date Badge
        let dateHtml = '';
        if (dueDate) {
            const dateObj = new Date(dueDate);
            const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            const now = new Date();
            const diffTime = dateObj - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            let colorClass = 'date-normal';
            if (diffDays < 0) colorClass = 'date-overdue';
            else if (diffDays <= 2) colorClass = 'date-soon';

            dateHtml = `<div class="date-badge ${colorClass}" title="${diffDays} days remaining">🕒 ${displayDate}</div>`;
        }

        this.shadow.innerHTML = `
            <style>
                :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; outline: none; }
                
                .task-card { 
                    background-color: #fff; border-radius: 4px; box-shadow: 0 1px 2px rgba(9,30,66,.15); 
                    margin-bottom: 8px; cursor: pointer; color: #172b4d; position: relative;
                    user-select: none; transition: box-shadow 0.15s ease, background-color 0.15s ease;
                    border: 1px solid transparent; display: flex; flex-direction: column; overflow: visible; 
                }
                .task-card:hover { background-color: #f4f5f7; box-shadow: 0 4px 8px rgba(9,30,66,.15); border-color: #dfe1e6; }
                :host(:focus), .task-card:focus { outline: none; }

                /* HEADER */
                .card-banner {
                    background-color: var(--list-color, #dfe1e6);
                    height: 24px; display: flex; align-items: center; justify-content: flex-start;
                    padding: 0 8px; font-size: 0.75rem; font-weight: 700; color: #172b4d;
                    text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.1s;
                    border-top-left-radius: 4px; border-top-right-radius: 4px;
                }
                .card-banner:hover { filter: brightness(0.95); cursor: pointer; } 
                .arrow { font-size: 0.6rem; opacity: 0.6; margin-right: 6px; } 

                .banner-input { 
                    display: none; height: 24px; width: 100%; box-sizing: border-box; 
                    background-color: #fff; color: #172b4d; border: none; 
                    font-family: inherit; font-size: 0.75rem; font-weight: 700; 
                    text-transform: uppercase; letter-spacing: 0.5px; 
                    padding: 0 12px; outline: none; border-bottom: 2px solid #0079bf;
                }

                .card-content { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
                .card-header { font-size: 0.95rem; line-height: 1.4; pointer-events: none; }
                
                /* FOOTER */
                .card-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-top: 8px; height: 24px;
                }
                .footer-left { display: flex; align-items: center; gap: 6px; }

                .user-avatar {
                    width: 24px; height: 24px; border-radius: 50%; background: #0079bf; color: white;
                    display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;
                }
                .user-avatar.empty { background: #ebecf0; color: #5e6c84; font-weight: normal; }

                .date-badge {
                    font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; font-weight: 600; display: flex; align-items: center; gap: 4px;
                }
                .date-normal { background: #ebecf0; color: #5e6c84; }
                .date-soon { background: #ffab00; color: #172b4d; }
                .date-overdue { background: #ff5630; color: white; }

                .card-menu-btn {
                    border: none; background: none; font-weight: bold; color: #6b778c; 
                    cursor: pointer; padding: 0 4px; font-size: 1.1rem; border-radius: 4px;
                    opacity: 0; transition: opacity 0.2s;
                }
                .task-card:hover .card-menu-btn { opacity: 1; }
                .card-menu-btn:hover { background-color: rgba(9,30,66,.08); color: #172b4d; }

                /* DROPDOWNS - FIXED POSITIONING FIXES THE BUG */
                .category-dropdown, .card-menu-dropdown {
                    display: none; 
                    position: fixed; /* FIXED: Breaks out of scroll containers */
                    background: white; border: 1px solid #dfe1e6; border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                    z-index: 99999; /* Always on top */
                    overflow-y: auto;
                }
                .category-dropdown { width: 200px; max-height: 150px; }
                .card-menu-dropdown { min-width: 160px; }
                
                .open { display: block; }
                
                .cat-item, .menu-item { padding: 6px 12px; font-size: 0.85rem; color: #172b4d; cursor: pointer; text-align: left; display: block; width: 100%; border: none; background: none; }
                .cat-item:hover, .menu-item:hover { background-color: #f4f5f7; color: #0079bf; }
                
                .menu-divider { border-top: 1px solid #dfe1e6; margin: 4px 0; }
                .menu-item.danger { color: #BF0000; }
                .menu-item.danger:hover { background-color: #ffeaea; }
                
                .empty-msg { padding: 8px; color: #6b778c; font-style: italic; font-size: 0.75rem; }
                .menu-label { padding: 4px 12px; font-size: 0.7rem; color: #5e6c84; font-weight: 700; text-transform: uppercase; cursor: default; }

                .edit-form { display: none; margin-bottom: 8px; }
                .edit-input { width: 100%; box-sizing: border-box; font-family: inherit; font-size: 0.95rem; line-height: 1.4; padding: 10px 12px; border-radius: 4px; border: none; outline: 2px solid #0079bf; resize: none; box-shadow: 0 2px 4px rgba(9,30,66,.2); }
            </style>
            
            <div class="task-card" id="card-display">
                <div class="card-banner" id="banner-display" title="Click: Select / Double-Click: Rename">
                    <span class="arrow">▼</span>
                    <span>${categoryText}</span>
                </div>
                ${dropdownHtml}
                <input class="banner-input" id="banner-input" placeholder="CATEGORY" maxlength="20" />
                
                <div class="card-content" id="card-content">
                    <div class="card-header"><span class="text-display">${this._task.text}</span></div>
                    
                    <div class="card-footer">
                        <div class="footer-left">
                            ${avatarHtml}
                            ${dateHtml}
                        </div>
                        <button class="card-menu-btn" id="card-menu-btn">⋮</button>
                    </div>
                </div>

                <div class="card-menu-dropdown" id="card-menu-dropdown">
                    <button class="menu-item" id="btn-poke">👉 Poke</button>
                    <div class="menu-divider"></div>
                    <div class="menu-label">Assign To:</div>
                    ${userOptions.length ? userOptions : '<div class="empty-msg">No users found</div>'}
                    <div class="menu-divider"></div>
                    <button class="menu-item danger" id="btn-delete-task">Delete Task</button>
                </div>

            </div>
            <div class="edit-form" id="edit-form"><textarea class="edit-input" id="edit-input" rows="3"></textarea></div>
        `;
        this._attachEvents();
    }

    _attachEvents() {
        const banner = this.shadow.getElementById('banner-display');
        const bannerInput = this.shadow.getElementById('banner-input');
        const catDropdown = this.shadow.getElementById('cat-dropdown');

        // --- FIXED POSITION CALCULATION ---
        const openDropdown = (btn, dropdown) => {
            // Close any other open dropdowns first
            document.querySelectorAll('kanban-card').forEach(c => {
                const d = c.shadowRoot.querySelector('.open');
                if(d && d !== dropdown) d.classList.remove('open');
            });

            // Calculate Position
            const rect = btn.getBoundingClientRect();
            
            // Basic boundary check
            const bottomSpace = window.innerHeight - rect.bottom;
            const dropHeight = 150; // Approx max height
            
            dropdown.style.left = `${rect.left}px`;
            
            // Flip if too close to bottom
            if (bottomSpace < dropHeight) {
                dropdown.style.top = `${rect.top - dropHeight}px`;
            } else {
                dropdown.style.top = `${rect.bottom + 2}px`;
            }
            
            dropdown.classList.toggle('open');
        };

        // 1. Category Dropdown
        banner.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            openDropdown(banner, catDropdown);
        });
        
        banner.addEventListener('dblclick', (e) => {
            e.stopPropagation(); this.isEditingCategory = true;
            catDropdown.classList.remove('open'); banner.style.display = 'none';
            bannerInput.style.display = 'block'; bannerInput.value = this._task.category || ''; bannerInput.focus();
        });

        catDropdown.querySelectorAll('.cat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const newCat = e.target.getAttribute('data-val');
                if (newCat !== this._task.category) {
                    this.dispatchEvent(new CustomEvent('category-changed', { detail: { taskId: this._task.id, newCategory: newCat }, bubbles: true, composed: true }));
                }
                catDropdown.classList.remove('open');
            });
        });

        const saveCategory = () => {
            if (!this.isEditingCategory) return;
            this.isEditingCategory = false;
            const newCategory = bannerInput.value.trim();
            if (newCategory !== (this._task.category || '')) { 
                this.dispatchEvent(new CustomEvent('category-changed', { detail: { taskId: this._task.id, newCategory: newCategory }, bubbles: true, composed: true })); 
            } else { banner.style.display = 'flex'; bannerInput.style.display = 'none'; }
        };
        bannerInput.addEventListener('blur', saveCategory);
        bannerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); bannerInput.blur(); } });

        // 2. Kebab Menu Dropdown
        const menuBtn = this.shadow.getElementById('card-menu-btn');
        const menuDropdown = this.shadow.getElementById('card-menu-dropdown');
        
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Custom positioning for menu (Right aligned)
                const rect = menuBtn.getBoundingClientRect();
                menuDropdown.style.top = `${rect.bottom + 5}px`;
                menuDropdown.style.left = `${rect.right - 160}px`; // Shift left by width
                menuDropdown.classList.toggle('open');
            });

            menuDropdown.querySelectorAll('.user-option').forEach(u => {
                u.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const user = e.target.getAttribute('data-user');
                    this.dispatchEvent(new CustomEvent('task-assigned', { detail: { taskId: this._task.id, username: user }, bubbles: true, composed: true }));
                    menuDropdown.classList.remove('open');
                });
            });

            this.shadow.getElementById('btn-delete-task').addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm("Delete this task?")) {
                    this.dispatchEvent(new CustomEvent('task-deleted', { detail: { taskId: this._task.id }, bubbles: true, composed: true }));
                }
            });

            this.shadow.getElementById('btn-poke').addEventListener('click', (e) => {
                e.stopPropagation();
                alert("👈 Poked!");
                menuDropdown.classList.remove('open');
            });
        }

        // --- CLOSE DROPDOWNS ON SCROLL OR CLICK ---
        document.addEventListener('click', () => {
            if (catDropdown.classList.contains('open')) catDropdown.classList.remove('open');
            if (menuDropdown && menuDropdown.classList.contains('open')) menuDropdown.classList.remove('open');
        });
        
        // This is key: Close fixed menus when the container scrolls
        window.addEventListener('scroll', () => {
            if (catDropdown.classList.contains('open')) catDropdown.classList.remove('open');
            if (menuDropdown && menuDropdown.classList.contains('open')) menuDropdown.classList.remove('open');
        }, true); // Capture phase to catch div scrolling

        // --- TITLE EDITING ---
        const cardDisplay = this.shadow.getElementById('card-display');
        const contentArea = this.shadow.getElementById('card-content');
        const form = this.shadow.getElementById('edit-form');
        const input = this.shadow.getElementById('edit-input');
        
        contentArea.addEventListener('click', (e) => {
            if (e.target.closest('.card-menu-btn')) return;
            this.dispatchEvent(new CustomEvent('task-clicked', { detail: { taskId: this._task.id }, bubbles: true, composed: true }));
        });

        contentArea.addEventListener('dblclick', (e) => { 
            e.stopPropagation(); this.isEditingTitle = true; cardDisplay.style.display = 'none'; form.style.display = 'block'; input.value = this._task.text; input.focus(); input.select(); 
        });
        
        const saveTitle = () => {
            if (!this.isEditingTitle) return;
            this.isEditingTitle = false;
            const newText = input.value.trim();
            if (newText !== '' && newText !== this._task.text) { 
                this.dispatchEvent(new CustomEvent('task-renamed', { detail: { taskId: this._task.id, newText: newText }, bubbles: true, composed: true })); 
            } else { cardDisplay.style.display = 'flex'; form.style.display = 'none'; }
        };
        input.addEventListener('blur', saveTitle);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { this.isEditingTitle = false; cardDisplay.style.display = 'flex'; form.style.display = 'none'; } });
    }
}
customElements.define('kanban-card', KanbanCard);