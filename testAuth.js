(async () => {
  const url = 'http://localhost:8000/api/v1/auth/dev-login-working?user_type=production';
  console.log('→ Sending POST to', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    console.log('← Status:', res.status, res.statusText);
    console.log('← Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('← Body:', text);
  } catch (err) {
    console.error('⚠ Error:', err.name, err.message);
  }
})();
