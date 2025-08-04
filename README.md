# PeerTube Plugin: Browser Live

Stream directly from your browser (webcam + mic) to PeerTube without OBS or external tools.

This plugin adds a simple “Go Live with Browser” button to the PeerTube live interface. It securely captures your webcam/audio, streams it to the server over WebSocket, and relays it to PeerTube’s RTMP input using ffmpeg.

## Features
•   One-click browser-based streaming
•   Auth token validation (only streamers can publish)
•   Uses WebSocket + ffmpeg for low-latency relay
•   Prevents stream hijacking or overlapping broadcasts
•   Compatible with PeerTube v6.0+

## Installation

Clone into your PeerTube instance’s plugin directory:

```
git clone https://github.com/joeaa17/peertube-plugin-browser-live.git \
  /app/data/plugins/peertube-plugin-browser-live
```

## Usage
1.	Log into PeerTube as an admin or channel owner.
2.	Create a new Live video.
3.	Visit the video page — click “Go Live with Browser”.
4.	Grant camera/mic permissions.
5.	Streaming begins — no OBS needed.

## Security
•	WebSocket relay uses PeerTube auth token from browser.
•	Backend verifies token and live ownership before allowing ffmpeg to start.
•	Each stream is isolated — no cross-stream interference possible.

## Requirements
•	ffmpeg must be installed in the PeerTube environment (container or host).
•	Node.js ≥ 16, PeerTube ≥ 6.x