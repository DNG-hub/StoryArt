(async () => {
  const BASE_URL = 'http://localhost:8000';

  // Accept storyId and episodeNumber from CLI args or use defaults
  const [ , , storyIdArg, episodeNumberArg ] = process.argv;
  const storyId = storyIdArg || '59f64b1e-726a-439d-a6bc-0dfefcababdb';
  const episodeNumber = Number(episodeNumberArg) || 1;

  // 1) Authenticate and retrieve token
  const loginUrl = `${BASE_URL}/api/v1/auth/dev-login-working?user_type=production`;
  console.log('→ Logging in via:', loginUrl);
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!loginRes.ok) {
    console.error('Authentication failed with status', loginRes.status);
    console.error(await loginRes.text());
    process.exit(1);
  }
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  console.log('← Received token:', token);

  // 2) Request episode context
  const contextUrl = `${BASE_URL}/api/v1/scene-context/extract-episode-context`;
  console.log(`→ Requesting context for story ${storyId} episode ${episodeNumber}`);
  const ctxRes = await fetch(contextUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ story_id: storyId, episode_number: episodeNumber }),
  });
  console.log('← Context status:', ctxRes.status, ctxRes.statusText);
  const ctxBody = await ctxRes.text();
  console.log('← Context body:', ctxBody);
})();
