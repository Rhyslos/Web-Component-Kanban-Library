import express from 'express';
import { db } from '../Modules/store.mjs'; 

const router = express.Router();

const hashPassword = (plainTextPassword) => {
    return Buffer.from(plainTextPassword.split('').reverse().join('')).toString('base64');
};

// --- BOARD & CONFIG ---
router.get('/board', (req, res) => {
    res.json(db);
});

router.put('/lists/:colId/:swimId/config', (req, res) => {
    const colId = parseInt(req.params.colId);
    const swimId = parseInt(req.params.swimId);
    const { color, title, category, locked } = req.body;

    let entry = db.listConfigs.find(l => l.colId === colId && l.swimId === swimId);
    
    if (entry) {
        if (color !== undefined) entry.color = color;
        if (title !== undefined) entry.title = title;
        if (category !== undefined) entry.category = category;
        if (locked !== undefined) entry.locked = locked;
    } else {
        entry = { 
            colId, swimId, 
            color: color || '#dfe1e6', 
            title: title || '',
            category: category || '',
            locked: locked || false
        };
        db.listConfigs.push(entry);
    }
    res.json(entry);
});

router.delete('/lists/:colId/:swimId', (req, res) => {
    const colId = parseInt(req.params.colId);
    const swimId = parseInt(req.params.swimId);
    db.listConfigs = db.listConfigs.filter(c => !(c.colId === colId && c.swimId === swimId));
    const initialCount = db.tasks.length;
    db.tasks = db.tasks.filter(t => !(t.columnId === colId && t.swimlaneId === swimId));
    res.json({ success: true, tasksDeleted: initialCount - db.tasks.length });
});

router.post('/columns', (req, res) => {
    const newCol = { id: Date.now(), title: req.body.title || 'New List' };
    db.columns.push(newCol);
    res.status(201).json(newCol);
});

router.put('/columns/:id', (req, res) => {
    const col = db.columns.find(c => c.id === parseInt(req.params.id));
    if (col && req.body.title) col.title = req.body.title;
    res.json(col);
});

router.post('/swimlanes', (req, res) => {
    const newSwim = { id: Date.now(), title: req.body.title || 'Main Lane' };
    db.swimlanes.push(newSwim);
    res.status(201).json(newSwim);
});

// --- TASKS (UPDATED) ---
router.post('/tasks', (req, res) => {
    const newTask = { 
        id: Date.now(), 
        columnId: req.body.columnId, 
        swimlaneId: req.body.swimlaneId, 
        text: req.body.text,
        owner: req.body.owner || 'Guest',
        category: req.body.category || '',
        description: '',
        assignee: null,
        dueDate: null,
        checklist: []
    };
    db.tasks.push(newTask);
    res.status(201).json(newTask);
});

router.put('/tasks/:id', (req, res) => {
    const task = db.tasks.find(t => t.id === parseInt(req.params.id));
    if (task) {
        if (req.body.columnId) task.columnId = req.body.columnId;
        if (req.body.swimlaneId) task.swimlaneId = req.body.swimlaneId;
        if (req.body.text) task.text = req.body.text;
        if (req.body.category !== undefined) task.category = req.body.category;
        
        // NEW FIELDS
        if (req.body.description !== undefined) task.description = req.body.description;
        if (req.body.assignee !== undefined) task.assignee = req.body.assignee;
        if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;
        if (req.body.checklist !== undefined) task.checklist = req.body.checklist;
    }
    res.json(task);
});

// --- USERS ---
router.post('/users/register', (req, res) => {
    const { username, email, password, country } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Required fields missing" });
    if (db.users.find(u => u.username === username || u.email === email)) return res.status(400).json({ error: "User exists" });
    const newUser = { id: Date.now(), username, email, password: hashPassword(password), country: country || 'Unknown' };
    db.users.push(newUser);
    res.status(201).json({ id: newUser.id, username: newUser.username, email: newUser.email, country: newUser.country });
});

router.post('/users/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username);
    if (!user || user.password !== hashPassword(password)) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, country: user.country } });
});

router.delete('/users/:username', (req, res) => {
    const { username } = req.params;
    if (!db.users.find(u => u.username === username)) return res.status(404).json({ error: "User not found" });
    db.users = db.users.filter(u => u.username !== username);
    const tasksBefore = db.tasks.length;
    const remainingTasks = db.tasks.filter(task => task.owner !== username);
    db.tasks.length = 0; db.tasks.push(...remainingTasks); 
    res.json({ success: true, tasksDeleted: tasksBefore - db.tasks.length });
});

export default router;