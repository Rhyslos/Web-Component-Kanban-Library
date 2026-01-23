/**
 * kanban-service.mjs
 * This class handles all communication with the Express backend.
 */

class KanbanService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    // --- READ ---
    async getBoard() {
        const response = await fetch(`${this.baseUrl}/board`);
        if (!response.ok) throw new Error("Failed to fetch board data");
        return await response.json();
    }

    // --- CREATE ---
    async createColumn(title) {
        const response = await fetch(`${this.baseUrl}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        if (!response.ok) throw new Error("Failed to create column");
        return await response.json();
    }

    async createSwimlane(title) {
        const response = await fetch(`${this.baseUrl}/swimlanes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        if (!response.ok) throw new Error("Failed to create swimlane");
        return await response.json();
    }

    async createTask(columnId, swimlaneId, taskText) {
        const response = await fetch(`${this.baseUrl}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId, swimlaneId, taskText })
        });
        if (!response.ok) throw new Error("Failed to create task");
        return await response.json();
    }

    // --- UPDATE ---
    async moveTask(taskId, newColumnId, newSwimlaneId) {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newColumnId, newSwimlaneId })
        });
        if (!response.ok) throw new Error("Failed to move task");
        return await response.json();
    }

    // --- DELETE ---
    async deleteTask(taskId) {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Failed to delete task");
        return true;
    }
}

// Export a single instance of the service (Singleton pattern)
export const api = new KanbanService();