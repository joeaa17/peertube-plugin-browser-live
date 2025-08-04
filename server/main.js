const { spawn } = require('child_process')
const WebSocket = require('ws')
const https = require('https')

const streams = {}

function verifyToken(token, liveId, callback) {
  const options = {
    hostname: 'localhost',
    port: 443,
    path: '/api/v1/users/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    rejectUnauthorized: false
  }

  const req = https.request(options, res => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try {
        const user = JSON.parse(data)
        if (!user || !user.username) return callback(false)
        // Additional liveId ownership check can be added here
        return callback(true)
      } catch {
        return callback(false)
      }
    })
  })

  req.on('error', () => callback(false))
  req.end()
}

function register({ getRouter, getWebSocketServer, peertubeHelpers }) {
  const wss = new WebSocket.Server({ noServer: true })

  getWebSocketServer().on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `https://${req.headers.host}`)
    const liveId = url.pathname.split('/').pop()
    const token = url.searchParams.get('token')

    if (!token || !liveId) return socket.destroy()

    verifyToken(token, liveId, isValid => {
      if (!isValid) return socket.destroy()
      wss.handleUpgrade(req, socket, head, ws => {
        ws.liveId = liveId
        wss.emit('connection', ws, req)
      })
    })
  })

  wss.on('connection', (ws) => {
    const liveId = ws.liveId
    if (streams[liveId]) {
      ws.close()
      return
    }

    const ffmpeg = spawn('ffmpeg', [
      '-f', 'webm', '-i', 'pipe:0',
      '-c:v', 'libx264', '-preset', 'veryfast',
      '-c:a', 'aac', '-f', 'flv',
      `rtmp://localhost/live/${liveId}`
    ])

    ffmpeg.stderr.on('data', data => console.log(`[ffmpeg] ${data}`))
    ffmpeg.on('close', () => delete streams[liveId])
    streams[liveId] = ffmpeg

    ws.on('message', chunk => ffmpeg.stdin.write(chunk))
    ws.on('close', () => {
      ffmpeg.stdin.end()
      ffmpeg.kill('SIGINT')
    })
  })
}

module.exports = { register }