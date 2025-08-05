'use strict';

const { spawn } = require('child_process');
const https = require('https');
const WebSocket = require('ws');

const streams = {};

/**
 * Verify that the given JWT belongs to a real PeerTube user.
 * Calls callback(true) if valid, callback(false) otherwise.
 */
function verifyToken(token, liveId, callback) {
  const options = {
    hostname: 'localhost',
    port: 443,
    path: '/api/v1/users/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    rejectUnauthorized: false, // allow self-signed
  };

  const req = https.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const user = JSON.parse(body);
        if (user && user.username) {
          // TODO: add additional ownership check against liveId if needed
          return callback(true);
        }
      } catch (err) {
        // malformed JSON
      }
      return callback(false);
    });
  });

  req.on('error', () => callback(false));
  req.end();
}

/**
 * Called by PeerTube at startup.
 * @param {Object}   services
 * @param {Function} services.getWebSocketServer — PeerTube’s HTTP server, to hook into upgrade events
 */
function register({ getWebSocketServer }) {
  const wss = new WebSocket.Server({ noServer: true });
  const httpServer = getWebSocketServer();

  // Intercept WebSocket upgrades on our plugin-specific path
  httpServer.on('upgrade', (req, socket, head) => {
    // Expect URL: /plugins/browser-live/ws/<liveId>?token=<jwt>
    const url    = new URL(req.url, `https://${req.headers.host}`);
    const parts  = url.pathname.split('/');
    const liveId = parts[parts.length - 1];
    const token  = url.searchParams.get('token');

    if (!liveId || !token) {
      return socket.destroy();
    }

    // Validate the JWT
    verifyToken(token, liveId, isValid => {
      if (!isValid) {
        return socket.destroy();
      }
      // Upgrade to WebSocket if valid
      wss.handleUpgrade(req, socket, head, ws => {
        ws.liveId = liveId;
        wss.emit('connection', ws, req);
      });
    });
  });

  // Handle incoming browser streams
  wss.on('connection', ws => {
    const liveId = ws.liveId;

    // Only one browser per live session
    if (streams[liveId]) {
      ws.close();
      return;
    }

    // Spawn ffmpeg to convert WebM chunks (pipe:0) into RTMP
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'webm', '-i', 'pipe:0',
      '-c:v', 'libx264', '-preset', 'veryfast',
      '-c:a', 'aac',
      '-f', 'flv',
      `rtmp://localhost/live/${liveId}`
    ]);

    streams[liveId] = ffmpeg;

    ffmpeg.stderr.on('data', chunk => {
      console.log(`[ffmpeg] ${chunk.toString().trim()}`);
    });

    ffmpeg.on('close', code => {
      delete streams[liveId];
      console.log(`FFmpeg for live ${liveId} exited with code ${code}`);
    });

    // Forward each incoming WebSocket message (ArrayBuffer) into ffmpeg stdin
    ws.on('message', data => {
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(Buffer.from(data));
      }
    });

    ws.on('close', () => {
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.end();
      }
      ffmpeg.kill('SIGINT');
    });
  });
}

module.exports = { register };