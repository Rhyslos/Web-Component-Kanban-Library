import express from "express";

const PORT = 8080;
const app = new express();

app.use(express.static('public'))


app.get('/', (req, res) => {
    res.send('Hello Class!')
})


app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})