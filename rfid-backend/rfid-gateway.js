
const http = require('http');

const HOST = '100.111.185.46';
const PORT = 3002;
const PI_IP = '100.127.232.82';
const ENDPOINT = '/api/station2/scan/reader';
const MAX_BODY = 4096;

const server = http.createServer((req, res) => {
  const clientIP = req.socket.remoteAddress?.replace(/^::ffff:/, '');

  function reject(code, message) {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message }));
  }

  if (clientIP !== PI_IP && clientIP !== HOST && clientIP !== '127.0.0.1') {
    return reject(403, 'Device not allowed');
  }

  if (req.method !== 'POST' || req.url !== ENDPOINT) {
    return reject(404, 'Endpoint not available');
  }

  if (!req.headers['x-rfid-token']) {
    return reject(401, 'RFID token required');
  }

  let chunks = [];
  let total = 0;
  let rejected = false;

  req.on('data', chunk => {
    total += chunk.length;
    if (total > MAX_BODY) {
      rejected = true;
      reject(413, 'Payload too large');
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (rejected) return;

    const body = Buffer.concat(chunks);

    const upstream = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: ENDPOINT,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': body.length,
        'x-rfid-token': req.headers['x-rfid-token']
      },
      timeout: 5000
    }, response => {
      res.writeHead(response.statusCode || 502, {
        'Content-Type': 'application/json'
      });
      response.pipe(res);
    });

    upstream.on('timeout', () => upstream.destroy());

    upstream.on('error', () => {
      if (!res.headersSent) reject(502, 'Backend unavailable');
      else res.end();
    });

    upstream.end(body);
  });
});

server.listen(PORT, HOST, () => {
  console.log('RFID Gateway ready');
  console.log(`Listening: http://${HOST}:${PORT}`);
  console.log(`Allowed Pi: ${PI_IP}`);
  console.log(`Endpoint: POST ${ENDPOINT}`);
});
