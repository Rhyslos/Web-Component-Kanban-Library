import express from "express";

const router = express.Router();

// 1. THE RELATIONAL DATABASE
// Since you wanted the board to start empty, all arrays start blank.
let db = {
    columns: [],
    swimlanes: [],
    tasks: [] 
};

// ==========================================
// READ ENDPOINTS
// ==========================================

// GET: Read the entire board state
router.get('/board', (req, res) => {
    res.json(db);
});

// ==========================================
// CREATE ENDPOINTS
// ==========================================

// POST: Add a new Column
router.post('/columns', (req, res) => {
    const { title } = req.body;
    
    if (title) {
        const newColumn = { id: Date.now(), title: title };
        db.columns.push(newColumn);
        res.status(201).json(newColumn);
    } else {
        res.status(400).send("Title is required");
    }
});

// POST: Add a new Swimlane
router.post('/swimlanes', (req, res) => {
    const { title } = req.body;
    
    if (title) {
        const newSwimlane = { id: Date.now(), title: title };
        db.swimlanes.push(newSwimlane);
        res.status(201).json(newSwimlane);
    } else {
        res.status(400).send("Title is required");
    }
});

// POST: Add Task (Now requires both coordinates)
router.post('/tasks', (req, res) => {
    const { columnId, swimlaneId, taskText } = req.body;
    
    // Validate that the coordinates actually exist
    const columnExists = db.columns.some(col => col.id === columnId);
    const swimlaneExists = db.swimlanes.some(swim => swim.id === swimlaneId);

    if (columnExists && swimlaneExists && taskText) {
        const newTask = { 
            id: Date.now(), 
            text: taskText,
            colId: columnId,   // X Coordinate
            swimId: swimlaneId // Y Coordinate
        };
        db.tasks.push(newTask);
        res.status(201).json(newTask);
    } else {
        res.status(400).send("Invalid grid coordinates or missing text");
    }
});

// ==========================================
// UPDATE ENDPOINTS
// ==========================================

// PUT: Move Task (Update its X and Y coordinates)
router.put('/tasks/:taskId', (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { newColumnId, newSwimlaneId } = req.body;

    const taskToMove = db.tasks.find(t => t.id === taskId);

    if (taskToMove) {
        // Update the task's coordinates
        taskToMove.colId = newColumnId;
        taskToMove.swimId = newSwimlaneId;
        res.status(200).json(taskToMove);
    } else {
        res.status(404).send("Task not found");
    }
});

// ==========================================
// DELETE ENDPOINTS
// ==========================================

// DELETE: Remove Task
router.delete('/tasks/:taskId', (req, res) => {
    const taskId = parseInt(req.params.taskId);
    db.tasks = db.tasks.filter(task => task.id !== taskId);
    res.status(200).send("Task deleted");
});

export default router;