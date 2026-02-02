class KanbanService {
    constructor(baseUrl = '/api') { this.baseUrl = baseUrl; }

    async getBoard() {
        const response = await fetch(`${this.baseUrl}/board`);
        if (!response.ok) throw new Error("Failed to fetch board data");
        return await response.json();
    }

    async createColumn(title) {
        const response = await fetch(`${this.baseUrl}/columns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
        return await response.json();
    }

    async createSwimlane(title) {
        const response = await fetch(`${this.baseUrl}/swimlanes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
        return await response.json();
    }

    async createTask(columnId, swimlaneId, text, owner) {
        const response = await fetch(`${this.baseUrl}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId, swimlaneId, text, owner }) 
        });
        return await response.json();
    }

    async updateColumn(id, updates) {
        const response = await fetch(`${this.baseUrl}/columns/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
        return await response.json();
    }

    // NEW: Handles both Color and Title for a specific cell
    async updateListConfig(colId, swimId, config) {
        const response = await fetch(`${this.baseUrl}/lists/${colId}/${swimId}/config`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(config) 
        });
        return await response.json();
    }

    async moveTask(taskId, columnId, swimlaneId) {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newColumnId: columnId, newSwimlaneId: swimlaneId })
        });
        return await response.json();
    }

    async updateTask(taskId, updates) {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
        return await response.json();
    }

    async registerUser(userData) {
        const response = await fetch(`${this.baseUrl}/users/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Registration failed"); }
        return await response.json();
    }

    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Login failed"); }
        return await response.json();
    }

    async deleteUser(username) {
        const response = await fetch(`${this.baseUrl}/users/${username}`, { method: 'DELETE' });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Deletion failed"); }
        return await response.json();
    }
}

export const api = new KanbanService();