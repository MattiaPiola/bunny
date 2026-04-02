'use strict';

const { processMessage } = require('../../src/chatEngine');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  let message;
  try {
    const body = JSON.parse(event.body || '{}');
    message = body.message;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  if (typeof message !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Campo "message" richiesto.' }),
    };
  }

  let result;
  try {
    result = processMessage(message);
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
};
