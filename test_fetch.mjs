async function test() {
  try {
    const res = await fetch('https://stabilityai-triposr.hf.space/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: ['https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png', true, 85]
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (err) {
    console.error('Fetch err:', err);
  }
}
test();
