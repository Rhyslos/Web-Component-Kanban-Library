/**
 * api.mjs (The Permanent Node.js Backend)
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises'; // NEW: Node's native File System module
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Points to the new database file you created
const DB_PATH = path.resolve('database.json');

// --- DATABASE HANDLERS ---
// This opens the file and reads the data
async function readDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { columns: [], swimlanes: [], tasks: [], cellStyles: {} };
    }
}

// This overwrites the file with new data to save it
async function writeDB(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// --- ENDPOINTS ---

// 1. Get Board
app.get('/api/board', async (req, res) => {
    const db = await readDB();
    res.json(db);
});

// 2. Create Column & Swimlane
app.post('/api/columns', async (req, res) => {
    const db = await readDB();
    const newCol = { id: Date.now(), title: req.body.title || 'New List' };
    db.columns.push(newCol);
    await writeDB(db);
    res.status(201).json(newCol);
});

app.post('/api/swimlanes', async (req, res) => {
    const db = await readDB();
    const newSwim = { id: Date.now(), title: req.body.title || 'Main Lane' };
    db.swimlanes.push(newSwim);
    await writeDB(db);
    res.status(201).json(newSwim);
});

// 3. Update Independent List Color
app.put('/api/lists/:colId/:swimId/color', async (req, res) => {
    const db = await readDB();
    const cellId = `${req.params.colId}-${req.params.swimId}`;
    
    db.cellStyles[cellId] = req.body.color; 
    
    await writeDB(db);
    res.json({ success: true });
});

// 4. Tasks (Move, Create, Update)
app.post('/api/tasks', async (req, res) => {
    const db = await readDB();
    const newTask = { id: Date.now(), colId: req.body.colId, swimId: req.body.swimId, text: req.body.text, category: '' };
    db.tasks.push(newTask);
    await writeDB(db);
    res.status(201).json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
    const db = await readDB();
    const task = db.tasks.find(t => t.id === parseInt(req.params.id));
    if (task) {
        if (req.body.colId) task.colId = req.body.colId;
        if (req.body.swimId) task.swimId = req.body.swimId;
        if (req.body.text) task.text = req.body.text;
        if (typeof req.body.category !== 'undefined') task.category = req.body.category;
        await writeDB(db);
    }
    res.json(task);
});

app.listen(3000, () => console.log('✅ Persistent API running on http://localhost:3000'));