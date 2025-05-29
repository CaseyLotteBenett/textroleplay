export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.url === '/api/health') {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Backend API is running'
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}
