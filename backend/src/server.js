// just example

const express = require('express');
const app = express();
const PORT = 8080;

app.use(express.json());

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from backend!' });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});