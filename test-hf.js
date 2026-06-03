import fs from 'fs';
import path from 'path';

async function testHF() {
  const token = 'HF_TOKEN_PLACEHOLDER'; // The user's token from .env
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; 
  const endpoint = 'https://api-inference.huggingface.co/models/stabilityai/TripoSR';
  
  console.log('Testing with JSON payload (like current code)...');
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: base64 })
    });
    console.log('JSON payload response status:', res.status);
    const text = await res.text();
    console.log('JSON payload response body:', text.slice(0, 100));
  } catch (err) {
    console.error('JSON fetch failed:', err.message);
  }

  console.log('\nTesting with binary payload...');
  try {
    const binary = Buffer.from(base64, 'base64');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/jpeg'
      },
      body: binary
    });
    console.log('Binary payload response status:', res.status);
    const text = await res.text();
    console.log('Binary payload response body:', text.slice(0, 100));
  } catch (err) {
    console.error('Binary fetch failed:', err.message);
  }
}

testHF();
