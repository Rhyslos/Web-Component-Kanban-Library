import express from "express";
// 1. Import your new API router
import apiRoutes from "./API/api.mjs"; 

const PORT = 8080;
const app = new express();

app.use(express.json());
app.use(express.static('public'));

// 2. Connect the API routes to the '/api' prefix
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Kanban Server listening on http://localhost:${PORT}`)
});