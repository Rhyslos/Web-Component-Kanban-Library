import express from 'express';
import { db } from './store.mjs'; 

const router = express.Router();

// --- Security Helper ---
const hashPassword = (plainTextPassword) => {
    return Buffer.from(plainTextPassword.split('').reverse().join('')).toString('base64');
};

// --- Register ---
router.post('/register', (req, res) => {
    const { username, email, password, country } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ error: "Username, Email, and Password are required." });
    }

    const exists = db.users.find(u => u.username === username || u.email === email);
    if (exists) {
        return res.status(400).json({ error: "Username or Email already exists." });
    }

    const secureHash = hashPassword(password);

    const newUser = { 
        id: Date.now(), 
        username, 
        email, 
        password: secureHash, 
        country: country || 'Unknown' 
    };
    
    db.users.push(newUser);
    res.status(201).json({ id: newUser.id, username: newUser.username });
});

// --- Login ---
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.users.find(u => u.username === username);

    if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({ 
        success: true, 
        user: { id: user.id, username: user.username, country: user.country } 
    });
});

// --- Delete ---
router.delete('/:username', (req, res) => {
    const { username } = req.params;

    if (!db.users.find(u => u.username === username)) {
        return res.status(404).json({ error: "User not found" });
    }

    db.users = db.users.filter(u => u.username !== username);

    const tasksBefore = db.tasks.length;
    const remainingTasks = db.tasks.filter(task => task.owner !== username);
    
    db.tasks.length = 0; 
    db.tasks.push(...remainingTasks); 

    res.json({ success: true, tasksDeleted: tasksBefore - db.tasks.length });
});

export default router;