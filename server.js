'use strict';

const express = require('express');
const path = require('path');
const { processMessage } = require('./src/chatEngine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * POST /api/chat
 * Body: { message: string }
 * Response: { reply: string, team: string|null, location: string|null }
 */
app.post('/api/chat', (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Campo "message" richiesto.' });
  }
  const result = processMessage(message);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`🐰 Coniglio Pasquale in ascolto su http://localhost:${PORT}`);
});

module.exports = app;
