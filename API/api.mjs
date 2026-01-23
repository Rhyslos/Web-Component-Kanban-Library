import express from "express";

// 1. Create a Router instance (a mini-app for handling routes)
const router = express.Router();

// 2. The Database (moved from server.mjs)
let db = {
    columns: [
        { id: 1, title: "To Do", tasks: [{ id: 101, text: "Design CSS" }] },
        { id: 2, title: "Doing", tasks: [{ id: 102, text: "Build API" }] },
        { id: 3, title: "Done", tasks: [] }
    ]
};

// ==========================================
// EXISTING ENDPOINTS
// ==========================================

// GET: Read Board
router.get('/board', (req, res) => {
    res.json(db);
});

// POST: Add Task
router.post('/tasks', (req, res) => {
    const { columnId, taskText } = req.body;
    const column = db.columns.find(col => col.id === columnId);
    
    if (column) {
        const newTask = { id: Date.now(), text: taskText };
        column.tasks.push(newTask);
        res.status(201).json(newTask);
    } else {
        res.status(404).send("Column not found");
    }
});

// DELETE: Delete Task
router.delete('/tasks/:taskId', (req, res) => {
    const taskId = parseInt(req.params.taskId);
    db.columns.forEach(col => {
        col.tasks = col.tasks.filter(task => task.id !== taskId);
    });
    res.status(200).send("Task deleted");
});

// ==========================================
// NEW ENDPOINTS (For Assignment Completion)
// ==========================================

// POST: Add Column
router.post('/columns', (req, res) => {
    const { title } = req.body;
    
    if (title) {
        const newColumn = {
            id: Date.now(),
            title: title,
            tasks: [] // Starts with empty tasks
        };
        db.columns.push(newColumn);
        res.status(201).json(newColumn);
    } else {
        res.status(400).send("Title is required");
    }
});

// PUT: Move Task (Update)
router.put('/tasks/:taskId', (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { newColumnId } = req.body;

    let taskToMove = null;

    // 1. Find the task and remove it from its current column
    db.columns.forEach(col => {
        const taskIndex = col.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            taskToMove = col.tasks.splice(taskIndex, 1)[0]; // Remove and store the task
        }
    });

    if (!taskToMove) {
        return res.status(404).send("Task not found");
    }

    // 2. Find the new column and push the task into it
    const newColumn = db.columns.find(col => col.id === newColumnId);
    if (newColumn) {
        newColumn.tasks.push(taskToMove);
        res.status(200).json(taskToMove);
    } else {
        res.status(404).send("Target column not found");
    }
});

// 3. Export the router so the main server can use it
export default router;