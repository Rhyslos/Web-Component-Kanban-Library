/**
 * Modules/kanban-card.mjs
 */
export class KanbanCard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
    }

    set data(taskObj) {
        this._task = taskObj; 
        this.render();
    }

    get data() {
        return this._task; // Exposed for the Physics Engine
    }

    render() {
        // Fallback safety if data hasn't loaded yet
        if (!this._task) return; 

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
        font-family: sans-serif;
        font-size: 0.9rem;
        color: #172b4d;
        word-wrap: break-word;
        
        /* 1. THE FIX: Prevent blue text highlight */
        user-select: none;
        -webkit-user-select: none;

        /* 2. THE ANIMATION: Smooth hover effect */
        transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        will-change: transform, box-shadow; /* Hardware acceleration */
    }

    /* Elevate the card slightly on hover */
    .task-card:hover { 
        background-color: #f4f5f7; 
        box-shadow: 0 2px 4px rgba(9,30,66,.15);
        transform: translateY(-1px);
    }
</style>
            <div class="task-card">${this._task.text}</div>
        `;
    }
}
customElements.define('kanban-card', KanbanCard);