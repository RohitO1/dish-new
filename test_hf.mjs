import { Client } from '@gradio/client';
import fs from 'fs';

async function test() {
  try {
    const client = await Client.connect('stabilityai/TripoSR');
    console.log('Connected to TripoSR space!');
    // We would do: client.predict('/generate', { image: ... })
  } catch (err) {
    console.error('Failed:', err);
  }
}
test();
