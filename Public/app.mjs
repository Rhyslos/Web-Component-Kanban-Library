import { api } from '/modules/kanban-service.mjs';
import { DragController } from '/modules/drag-controller.mjs';
import '/modules/kanban-list.mjs';

export class KanbanBoard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.data = { columns: [], swimlanes: [], tasks: [], users: [], listConfigs: [] };
        this.isLoading = true;
        this.currentUser = null; 
        this.activeCells = new Set();
        this.resizeObserver = null;
        this.modalContent = null;
        this.isSignupMode = false; 
    }

    connectedCallback() {
        this.checkSession();
        this.loadData();
    }

    disconnectedCallback() {
        if (this.dragController) this.dragController.destroy();
        if (this.resizeObserver) this.resizeObserver.disconnect();
    }

    // --- SESSION ---
    checkSession() {
        const savedUser = localStorage.getItem('kanban_user');
        if (savedUser) {
            try { this.currentUser = JSON.parse(savedUser); } 
            catch (e) { localStorage.removeItem('kanban_user'); }
        }
    }

    // --- DATA LOAD ---
    async loadData() {
        try {
            this.data = await api.getBoard();
            
            // Safety checks
            if (!this.data.listConfigs) this.data.listConfigs = [];
            if (!this.data.users) this.data.users = [];

            this.isLoading = false;

            // Re-calc grid
            if (this.data.columns.length > 0 && this.data.swimlanes.length > 0) {
                this.activeCells.add(`${this.data.columns[0].id}-${this.data.swimlanes[0].id}`);
            }
            this.data.tasks.forEach(t => this.activeCells.add(`${t.columnId}-${t.swimlaneId}`));
            
            this.render();
        } catch (error) { console.error("Failed to load:", error); }
    }

    // --- RENDER ROUTER ---
    render() {
        const styles = this.getStyles();
        if (this.isLoading) { 
            this.shadow.innerHTML = `${styles}<div class="loading">Loading...</div>`; 
            return; 
        }
        if (!this.currentUser) { 
            this.renderLoginView(styles); 
            return; 
        }
        this.renderBoardView(styles);
    }

    // --- LOGIN VIEW ---
    renderLoginView(styles) {
        const modeTitle = this.isSignupMode ? "Create Account" : "Login";
        const modeBtnText = this.isSignupMode ? "Sign Up" : "Log In";
        const toggleText = this.isSignupMode ? "Already have an account? Log In" : "Need an account? Sign Up";
        const extraFields = this.isSignupMode ? `<input type="email" id="email" class="login-input" placeholder="Email Address" /><select id="country" class="login-input"><option value="" disabled selected>Select Country</option><option value="NO">Norway</option><option value="US">United States</option><option value="other">Other</option></select>` : '';

        this.shadow.innerHTML = `${styles}<div class="login-container"><div class="login-card"><h1>${modeTitle}</h1><input type="text" id="username" class="login-input" placeholder="Username" /><input type="password" id="password" class="login-input" placeholder="Password" />${extraFields}<button id="btn-submit" class="btn btn-primary full-width">${modeBtnText}</button><p id="btn-toggle" class="toggle-link">${toggleText}</p><div class="legal-links"><a href="#" id="link-tos">Terms</a> | <a href="#" id="link-privacy">Privacy</a></div></div><div id="legal-modal" class="modal ${this.modalContent ? 'open' : ''}"><div class="modal-content"><span id="close-modal" class="close-btn">&times;</span><div id="modal-text">${this.modalContent || ''}</div></div></div></div>`;
        this.attachLoginEvents();
    }

    attachLoginEvents() {
        const btnSubmit = this.shadow.getElementById('btn-submit');
        const btnToggle = this.shadow.getElementById('btn-toggle');
        const usernameInput = this.shadow.getElementById('username');
        const passwordInput = this.shadow.getElementById('password');
        const emailInput = this.shadow.getElementById('email'); 
        const countryInput = this.shadow.getElementById('country'); 

        btnToggle.addEventListener('click', () => { this.isSignupMode = !this.isSignupMode; this.render(); });
        
        btnSubmit.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            if (!username || !password) return alert("Credentials required");
            
            try {
                if (this.isSignupMode) {
                    const email = emailInput.value.trim();
                    const country = countryInput.value;
                    if (!email || !country) return alert("Email/Country required");
                    const userObj = await api.registerUser({ username, email, password, country });
                    
                    this.currentUser = userObj;
                    localStorage.setItem('kanban_user', JSON.stringify(userObj));
                    await this.loadData();
                } else {
                    const response = await api.login(username, password);
                    this.currentUser = response.user;
                    localStorage.setItem('kanban_user', JSON.stringify(response.user));
                    this.render();
                }
            } catch (e) { alert(e.message); }
        });

        const linkTos = this.shadow.getElementById('link-tos');
        const linkPrivacy = this.shadow.getElementById('link-privacy');
        const modal = this.shadow.getElementById('legal-modal');
        const closeModal = this.shadow.getElementById('close-modal');

        linkTos.addEventListener('click', (e) => { e.preventDefault(); this.modalContent = `<h3>Terms</h3><p>Educational use only.</p>`; this.render(); });
        linkPrivacy.addEventListener('click', (e) => { e.preventDefault(); this.modalContent = `<h3>Privacy</h3><p>RAM storage only.</p>`; this.render(); });
        closeModal.addEventListener('click', () => { this.modalContent = null; this.render(); });
        modal.addEventListener('click', (e) => { if(e.target === modal) { this.modalContent = null; this.render(); } });
    }

    // --- BOARD VIEW ---
    renderBoardView(styles) {
        const colCount = this.data.columns.length;
        const swimCount = this.data.swimlanes.length;
        const totalCols = colCount + 1; 
        const totalSwims = Math.max(1, swimCount) + 1;

        const navHtml = `
        <nav class="menu-container">
            <input type="checkbox" id="menu-toggle" class="menu-checkbox">
            <label for="menu-toggle" class="hamburger-btn">
                <span class="bar bar1"></span>
                <span class="bar bar2"></span>
                <span class="bar bar3"></span>
            </label>
            <div class="menu-items">
                <a href="#" id="nav-boards">Boards</a>
                <a href="#" id="nav-settings">Settings</a>
                <a href="#" id="nav-account">Account</a>
                <a href="#" id="nav-logout" class="logout-link">Logout</a>
            </div>
        </nav>

        <div id="profile-modal" class="modal ${this.modalContent ? 'open' : ''}">
             <div class="modal-content">
                <span id="close-modal-board" class="close-btn">&times;</span>
                <div id="modal-text-board">${this.modalContent || ''}</div>
            </div>
        </div>
        `;

        let gridHtml = '';
        if (colCount === 0) {
             gridHtml = `<div class="board-container"><div class="invisible-zone" id="first-col-btn" style="grid-column: 1; grid-row: 1; opacity: 1;">+ Start Board</div></div>`;
        } else {
            let cellsHtml = '';
            const activeIndices = new Set();
            for (let y = 0; y < swimCount; y++) {
                for (let x = 0; x < colCount; x++) {
                    const col = this.data.columns[x];
                    const swim = this.data.swimlanes[y];
                    if (col && swim && this.activeCells.has(`${col.id}-${swim.id}`)) activeIndices.add(`${x}-${y}`);
                }
            }
            for (let y = 0; y < totalSwims; y++) {
                for (let x = 0; x < totalCols; x++) {
                    const isPopulated = activeIndices.has(`${x}-${y}`);
                    const gridCoords = `grid-column: ${x + 1}; grid-row: ${y + 1};`;
                    if (isPopulated) {
                        const col = this.data.columns[x];
                        const swim = this.data.swimlanes[y];
                        cellsHtml += `<kanban-list class="list-component" data-col-index="${x + 1}" data-col-id="${col.id}" data-swim-id="${swim.id}" style="${gridCoords}"></kanban-list>`;
                    } else {
                        const isAdjacent = activeIndices.has(`${x - 1}-${y}`) || activeIndices.has(`${x + 1}-${y}`) || activeIndices.has(`${x}-${y - 1}`) || activeIndices.has(`${x}-${y + 1}`);
                        if (isAdjacent) cellsHtml += `<div class="invisible-zone add-list-btn" data-x="${x}" data-y="${y}" style="${gridCoords}">+ Add List</div>`;
                        else cellsHtml += `<div class="dead-zone" style="${gridCoords}"></div>`;
                    }
                }
            }
            gridHtml = `<div class="board-container">${cellsHtml}</div>`;
        }

        this.shadow.innerHTML = `${styles} ${navHtml} ${gridHtml}`;
        this.updateComponents(); 
        this.attachBoardEvents(); 
        this.attachSizingPhysics();
    }

    getUniqueCategories() {
        const cats = new Set();
        this.data.tasks.forEach(t => { if(t.category) cats.add(t.category); });
        this.data.listConfigs.forEach(c => { if(c.category) cats.add(c.category); });
        return Array.from(cats).sort();
    }

    updateComponents() {
        const uniqueCategories = this.getUniqueCategories();
        const listElements = this.shadow.querySelectorAll('kanban-list');
        listElements.forEach(listEl => {
            const colId = parseInt(listEl.getAttribute('data-col-id'));
            const swimId = parseInt(listEl.getAttribute('data-swim-id'));
            
            const col = this.data.columns.find(c => c.id === colId);
            const configEntry = this.data.listConfigs?.find(c => c.colId === colId && c.swimId === swimId);
            const finalTitle = (configEntry && configEntry.title) ? configEntry.title : col.title;

            listEl.data = {
                column: col,
                tasks: this.data.tasks.filter(t => t.columnId === colId && t.swimlaneId === swimId),
                swimId: swimId,
                color: configEntry ? configEntry.color : '#dfe1e6',
                title: finalTitle,
                category: configEntry ? configEntry.category : '',
                locked: configEntry ? configEntry.locked : false,
                availableCategories: uniqueCategories,
                allUsers: this.data.users // Pass all users for assignment dropdowns
            };
        });
    }

    attachBoardEvents() {
        // --- NAV & HAMBURGER ---
        const checkbox = this.shadow.getElementById("menu-toggle");
        const closeNav = () => { if(checkbox) checkbox.checked = false; };

        this.shadow.getElementById('nav-boards').addEventListener('click', async (e) => {
            e.preventDefault(); await this.loadData(); closeNav();
        });

        this.shadow.getElementById('nav-settings').addEventListener('click', (e) => {
            e.preventDefault();
            this.modalContent = `<h2>Current Board</h2><p><strong>Columns:</strong> ${this.data.columns.length}</p><p><strong>Swimlanes:</strong> ${this.data.swimlanes.length}</p><p><strong>Total Tasks:</strong> ${this.data.tasks.length}</p>`;
            this.render();
        });

        this.shadow.getElementById('nav-account').addEventListener('click', (e) => {
            e.preventDefault();
            this.modalContent = `
                <h2>My Profile</h2>
                <div style="margin-bottom: 20px;">
                    <p><strong>User:</strong> ${this.currentUser.username}</p>
                    <p><strong>Email:</strong> ${this.currentUser.email}</p>
                    <p><strong>From:</strong> ${this.currentUser.country}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #dfe1e6; margin: 15px 0;">
                <button id="btn-delete-account" class="btn btn-delete full-width">Delete My Account</button>
            `;
            this.render();
        });

        this.shadow.getElementById('nav-logout').addEventListener('click', (e) => {
            e.preventDefault();
            this.currentUser = null; 
            localStorage.removeItem('kanban_user'); 
            this.render();
        });

        // --- GLOBAL MODAL (Profile, Task Details, etc.) ---
        const modal = this.shadow.getElementById('profile-modal');
        const closeBtn = this.shadow.getElementById('close-modal-board');
        const deleteBtn = this.shadow.getElementById('btn-delete-account');

        if (closeBtn) closeBtn.addEventListener('click', () => { this.modalContent = null; this.render(); });
        if (modal) modal.addEventListener('click', (e) => { if(e.target === modal) { this.modalContent = null; this.render(); } });

        // Account Delete
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if(!confirm(`WARNING: Delete account '${this.currentUser.username}'?\nThis cannot be undone.`)) return;
                try {
                    await api.deleteUser(this.currentUser.username);
                    alert("Account deleted.");
                    this.currentUser = null;
                    localStorage.removeItem('kanban_user'); 
                    this.modalContent = null;
                    this.render();
                } catch(e) { alert("Error: " + e.message); }
            });
        }
        
        // --- ADD BUTTONS ---
        const firstBtn = this.shadow.getElementById('first-col-btn');
        if(firstBtn) firstBtn.addEventListener('click', () => this.handleAddList(0, 0));
        this.shadow.querySelectorAll('.add-list-btn').forEach(zone => { zone.addEventListener('click', (e) => { this.handleAddList(parseInt(e.target.dataset.x), parseInt(e.target.dataset.y)); }); });

        // --- COMPONENT EVENT BUBBLING ---

        // 1. Task Added (Lock Logic)
        this.shadow.removeEventListener('task-added', this._onTaskAdded);
        this._onTaskAdded = (e) => {
            const swimId = e.target.getAttribute('data-swim-id') ? parseInt(e.target.getAttribute('data-swim-id')) : this.data.swimlanes[0].id;
            const colId = e.detail.colId;
            const config = this.data.listConfigs.find(c => c.colId === colId && c.swimId === swimId);
            let cat = ''; if(config && config.locked && config.category) cat = config.category;
            this.handleAddTask(colId, swimId, e.detail.text, this.currentUser.username, cat); 
        };
        this.shadow.addEventListener('task-added', this._onTaskAdded);

        // 2. Task Events
        this.shadow.removeEventListener('task-renamed', this._onTaskRenamed);
        this._onTaskRenamed = async (e) => { const { taskId, newText } = e.detail; const task = this.data.tasks.find(t => t.id === taskId); if(task) { task.text = newText; this.updateComponents(); } try { await api.updateTask(taskId, { text: newText }); } catch(err) { console.error(err); } };
        this.shadow.addEventListener('task-renamed', this._onTaskRenamed);

        this.shadow.removeEventListener('category-changed', this._onCatChanged);
        this._onCatChanged = async (e) => { const { taskId, newCategory } = e.detail; const task = this.data.tasks.find(t => t.id === taskId); if(task) { task.category = newCategory; this.updateComponents(); } try { await api.updateTask(taskId, { category: newCategory }); } catch(err) { console.error(err); } };
        this.shadow.addEventListener('category-changed', this._onCatChanged);

        this.shadow.removeEventListener('task-deleted', this._onTaskDeleted);
        this._onTaskDeleted = async (e) => {
            const { taskId } = e.detail;
            const idx = this.data.tasks.findIndex(t => t.id === taskId);
            if(idx > -1) this.data.tasks.splice(idx, 1);
            this.updateComponents();
            try { await api.updateTask(taskId, { deleted: true }); /* Simulating delete via update or dedicated endpoint */ } 
            catch(err) { this.loadData(); }
        };
        this.shadow.addEventListener('task-deleted', this._onTaskDeleted);

        this.shadow.removeEventListener('task-assigned', this._onTaskAssigned);
        this._onTaskAssigned = async (e) => {
            const { taskId, username } = e.detail;
            const task = this.data.tasks.find(t => t.id === taskId);
            if(task) { task.assignee = username; this.updateComponents(); }
            try { await api.updateTask(taskId, { assignee: username }); } catch(err) { console.error(err); }
        };
        this.shadow.addEventListener('task-assigned', this._onTaskAssigned);

        // 3. Task Clicked -> Details Modal
        this.shadow.removeEventListener('task-clicked', this._onTaskClicked);
        this._onTaskClicked = (e) => {
            const taskId = e.detail.taskId;
            const task = this.data.tasks.find(t => t.id === taskId);
            if(!task) return;

            this.modalContent = `
                <h2 style="margin-top:0">${task.text}</h2>
                <label style="font-weight:bold; font-size:0.9rem;">Internal Description</label>
                <textarea id="task-desc-input" style="width:100%; height:100px; margin-top:5px; padding:8px; border-radius:4px; border:1px solid #dfe1e6;">${task.description || ''}</textarea>
                
                <div style="margin-top:15px; display:flex; gap:10px;">
                    <div style="flex:1">
                        <label style="font-weight:bold; font-size:0.9rem;">Due Date</label>
                        <input type="date" id="task-date-input" style="width:100%; padding:8px; margin-top:5px;" value="${task.dueDate || ''}">
                    </div>
                </div>

                <div style="margin-top:20px; text-align:right;">
                    <button id="btn-save-task-details" class="btn btn-primary">Save Changes</button>
                </div>
            `;
            this.render();

            setTimeout(() => {
                const saveBtn = this.shadow.getElementById('btn-save-task-details');
                if(saveBtn) {
                    saveBtn.addEventListener('click', async () => {
                        const newDesc = this.shadow.getElementById('task-desc-input').value;
                        const newDate = this.shadow.getElementById('task-date-input').value;
                        
                        task.description = newDesc;
                        task.dueDate = newDate;
                        this.modalContent = null;
                        this.updateComponents(); 
                        this.render(); 

                        try { await api.updateTask(taskId, { description: newDesc, dueDate: newDate }); }
                        catch(err) { alert("Failed to save details"); }
                    });
                }
            }, 0);
        };
        this.shadow.addEventListener('task-clicked', this._onTaskClicked);

        // 4. List Events
        this.shadow.removeEventListener('list-title-changed', this._onListTitleChanged);
        this._onListTitleChanged = async (e) => { const { colId, swimId, newTitle } = e.detail; let entry = this.data.listConfigs.find(c => c.colId === colId && c.swimId === swimId); if (entry) { entry.title = newTitle; } else { this.data.listConfigs.push({ colId, swimId, color: '#dfe1e6', title: newTitle }); } this.updateComponents(); try { await api.updateListConfig(colId, swimId, { title: newTitle }); } catch(err) { console.error(err); } };
        this.shadow.addEventListener('list-title-changed', this._onListTitleChanged);

        this.shadow.removeEventListener('list-color-changed', this._onListColorChanged);
        this._onListColorChanged = async (e) => { const { colId, swimId, newColor } = e.detail; let entry = this.data.listConfigs.find(c => c.colId === colId && c.swimId === swimId); if (entry) { entry.color = newColor; } else { this.data.listConfigs.push({ colId, swimId, color: newColor, title: '' }); } this.updateComponents(); try { await api.updateListConfig(colId, swimId, { color: newColor }); } catch(err) { console.error(err); } };
        this.shadow.addEventListener('list-color-changed', this._onListColorChanged);

        this.shadow.removeEventListener('list-cat-changed', this._onListCatChanged);
        this._onListCatChanged = async (e) => { const { colId, swimId, newCat } = e.detail; let entry = this.data.listConfigs.find(c => c.colId === colId && c.swimId === swimId); if (entry) { entry.category = newCat; } else { this.data.listConfigs.push({ colId, swimId, color: '#dfe1e6', title: '', category: newCat }); } this.updateComponents(); try { await api.updateListConfig(colId, swimId, { category: newCat }); } catch(err) { console.error(err); } };
        this.shadow.addEventListener('list-cat-changed', this._onListCatChanged);

        this.shadow.removeEventListener('list-lock-toggled', this._onListLockToggled);
        this._onListLockToggled = async (e) => { const { colId, swimId, isLocked } = e.detail; let entry = this.data.listConfigs.find(c => c.colId === colId && c.swimId === swimId); if (entry) { entry.locked = isLocked; } else { this.data.listConfigs.push({ colId, swimId, color: '#dfe1e6', title: '', locked: isLocked }); } this.updateComponents(); try { await api.updateListConfig(colId, swimId, { locked: isLocked }); } catch(err) { console.error(err); } };
        this.shadow.addEventListener('list-lock-toggled', this._onListLockToggled);

        this.shadow.removeEventListener('list-deleted', this._onListDeleted);
        this._onListDeleted = async (e) => { const { colId, swimId } = e.detail; if(!confirm("Delete list?")) return; this.activeCells.delete(`${colId}-${swimId}`); this.data.listConfigs = this.data.listConfigs.filter(c => !(c.colId === colId && c.swimId === swimId)); this.render(); try { await api.deleteList(colId, swimId); } catch(err) { this.loadData(); } };
        this.shadow.addEventListener('list-deleted', this._onListDeleted);

        // --- DRAG CONTROLLER (Ghost + Lock) ---
        if (this.dragController) this.dragController.destroy();
        this.dragController = new DragController(this.shadow, {
            onDrop: async (taskId, target) => {
                const task = this.data.tasks.find(t => t.id === taskId);
                if (!task) return;

                if (target.isGhost) {
                    let newColId; if (target.x >= this.data.columns.length) { const newCol = await api.createColumn('New List'); newColId = newCol.id; } else { newColId = this.data.columns[target.x].id; }
                    let newSwimId; if (target.y >= this.data.swimlanes.length) { const newSwim = await api.createSwimlane('Main Lane'); newSwimId = newSwim.id; } else { newSwimId = this.data.swimlanes[target.y].id; }
                    await api.moveTask(taskId, newColId, newSwimId); await this.loadData(); return;
                }

                const oldColId = task.columnId; const oldSwimId = task.swimlaneId;
                if (oldColId === target.colId && oldSwimId === target.swimId) return; 
                
                const config = this.data.listConfigs.find(c => c.colId === target.colId && c.swimId === target.swimId);
                let newCategory = task.category; let categoryChanged = false;
                if (config && config.locked && config.category) { newCategory = config.category; task.category = newCategory; categoryChanged = true; }

                task.columnId = target.colId; task.swimlaneId = target.swimId; 
                this.updateComponents(); 
                try {
                    await api.moveTask(taskId, target.colId, target.swimId);
                    if (categoryChanged) { await api.updateTask(taskId, { category: newCategory }); }
                } catch (error) { task.columnId = oldColId; task.swimlaneId = oldSwimId; this.updateComponents(); }
            }
        });
    }

    async handleAddList(colIndex, swimIndex) {
        let colId, swimId;
        if (colIndex >= this.data.columns.length) { const newCol = await api.createColumn('New List'); colId = newCol.id; } else { colId = this.data.columns[colIndex].id; }
        if (swimIndex >= this.data.swimlanes.length) { const newSwim = await api.createSwimlane('Main Lane'); swimId = newSwim.id; } else { swimId = this.data.swimlanes[swimIndex].id; }
        this.activeCells.add(`${colId}-${swimId}`);
        await this.loadData();
    }

    async handleAddTask(colId, swimId, text, owner, categoryOverride) {
        const newTask = await api.createTask(colId, swimId, text, owner);
        if (categoryOverride) { await api.updateTask(newTask.id, { category: categoryOverride }); }
        this.loadData();
    }

    attachSizingPhysics() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const listHeight = entry.contentRect.height;
                const nextRight = entry.target.nextElementSibling;
                if (nextRight && nextRight.classList.contains('invisible-zone') && !nextRight.classList.contains('dead-zone')) {
                    nextRight.style.height = `${listHeight}px`;
                }
            }
        });
        this.shadow.querySelectorAll('kanban-list').forEach(list => this.resizeObserver.observe(list));
    }

    getStyles() {
        const totalCols = this.data.columns.length + 1; 
        const totalSwims = Math.max(1, this.data.swimlanes.length) + 1; 
        return `
        <style>
            :host { display: block; font-family: 'Segoe UI', sans-serif; height: 100%; box-sizing: border-box; }
            .login-container { height: 100%; display: flex; align-items: center; justify-content: center; background: #f4f5f7; }
            .login-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; width: 320px; }
            .login-input { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #dfe1e6; border-radius: 4px; box-sizing: border-box; font-family: inherit; }
            select.login-input { background: white; }
            .btn { padding: 8px 16px; cursor: pointer; border-radius: 4px; border: none; font-weight: bold; }
            .btn.full-width { width: 100%; padding: 10px; margin-top: 10px; }
            .btn-primary { background-color: #0079bf; color: white; }
            .btn-delete { background-color: #ebecf0; color: #BF0000; }
            .btn-delete:hover { background-color: #BF0000; color: white; }
            
            .toggle-link { color: #0079bf; cursor: pointer; font-size: 0.9rem; margin-top: 15px; }
            .legal-links { font-size: 0.8rem; margin-top: 20px; color: #5e6c84; }
            .legal-links a { color: #5e6c84; text-decoration: none; }
            
            .board-container { width: 100%; height: 100%; overflow: auto; background-color: #f4f5f7; padding: 24px; padding-top: 80px; display: grid; grid-template-columns: repeat(${totalCols}, 272px); grid-template-rows: repeat(${totalSwims}, max-content); gap: 16px; align-items: start; }
            .invisible-zone { display: flex; align-items: center; justify-content: center; font-weight: bold; color: #6b778c; cursor: pointer; min-height: 80px; align-self: stretch; opacity: 0; transition: opacity 0.2s; border-radius: 6px; }
            .invisible-zone:hover { opacity: 1; background-color: rgba(9,30,66,.08); color: #172b4d; }
            .dead-zone { pointer-events: none; } 
            
            /* MODAL STYLES */
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 10000; }
            .modal.open { display: flex; }
            .modal-content { background: white; padding: 20px; border-radius: 8px; width: 400px; position: relative; max-width: 90%; }
            .close-btn { position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; }

            /* --- FLOATING NAV STYLES --- */
            .menu-container {
                position: fixed; top: 20px; right: 20px;
                display: flex; flex-direction: row-reverse; /* Button Right, content expands Left */
                align-items: center;
                background: #000c2a;
                border-radius: 3rem; /* Pill Shape */
                padding: 5px;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: width 0.4s ease;
                width: 3.5rem; /* Start small (just the button) */
                overflow: hidden;
                height: 3.5rem;
            }
            
            /* The Checkbox Hack */
            .menu-checkbox { display: none; }
            .menu-container:has(.menu-checkbox:checked) {
                width: 450px; /* Expanded Width */
            }

            /* Hamburger Button */
            .hamburger-btn {
                width: 3.5rem; height: 3.5rem;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                cursor: pointer; flex-shrink: 0;
            }
            .bar {
                width: 1.8rem; height: 3px; background-color: white;
                border-radius: 2px; margin: 3px 0;
                transition: 0.4s;
            }
            
            /* Animation: Burger to X */
            .menu-checkbox:checked + .hamburger-btn .bar1 { transform: rotate(-45deg) translate(-5px, 6px); }
            .menu-checkbox:checked + .hamburger-btn .bar2 { opacity: 0; }
            .menu-checkbox:checked + .hamburger-btn .bar3 { transform: rotate(45deg) translate(-5px, -6px); }

            /* Menu Items */
            .menu-items {
                display: flex; flex-grow: 1; justify-content: space-evenly;
                opacity: 0; transition: opacity 0.3s ease 0.1s;
                white-space: nowrap;
            }
            .menu-container:has(.menu-checkbox:checked) .menu-items { opacity: 1; }

            .menu-items a {
                color: white; text-decoration: none; font-weight: bold; font-size: 1rem;
                padding: 5px 10px; border-radius: 4px;
            }
            .menu-items a:hover { background: rgba(255,255,255,0.15); }
            .logout-link { color: #ffab00 !important; }
        </style>
        `;
    }
}

customElements.define('kanban-board', KanbanBoard);