'use strict';

function register({ registerHook }) {
  registerHook({
    target: 'action:video-live.view',
    handler: async ({ live, hostElement }) => {
      // Avoid injecting multiple buttons
      if (hostElement.querySelector('.browser-live-btn')) {
        return;
      }

      // Create “Go Live with Browser” button
      const btn = document.createElement('button');
      btn.className = 'browser-live-btn btn btn-primary';
      btn.innerText = 'Go Live with Browser';
      btn.style.marginTop = '10px';
      hostElement.appendChild(btn);

      let ws;
      let recorder;

      btn.addEventListener('click', async () => {
        // If already streaming, this click stops
        if (btn.dataset.streaming === 'true') {
          btn.disabled = true;
          btn.innerText = 'Stopping…';
          ws.close();
          return;
        }

        // Begin streaming
        btn.disabled = true;
        btn.innerText = 'Connecting…';

        // Pull JWT from localStorage
        const token = window.localStorage.getItem('peertube-auth-token');
        if (!token) {
          alert('Authentication token missing.');
          btn.disabled = false;
          btn.innerText = 'Go Live with Browser';
          return;
        }

        // Open WebSocket to your plugin’s server endpoint
        ws = new WebSocket(
          `wss://${location.host}/plugins/browser-live/ws/${live.id}?token=${token}`
        );
        ws.binaryType = 'arraybuffer';

        ws.onopen = async () => {
          try {
            // Grab camera + mic
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            // Send 1 s chunks as WebM to the server
            recorder = new MediaRecorder(stream, {
              mimeType: 'video/webm;codecs=vp8,opus',
            });
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(e.data);
              }
            };
            recorder.start(1000);

            // Update UI to “Stop”
            btn.dataset.streaming = 'true';
            btn.disabled = false;
            btn.innerText = 'Stop Browser Live';
          } catch (err) {
            alert('Could not access camera/microphone.');
            ws.close();
            btn.disabled = false;
            btn.innerText = 'Go Live with Browser';
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          alert('WebSocket error occurred.');
          btn.disabled = false;
          btn.innerText = 'Go Live with Browser';
        };

        ws.onclose = () => {
          // Stop MediaRecorder if still running
          if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
          }
          btn.dataset.streaming = 'false';
          btn.disabled = false;
          btn.innerText = 'Go Live with Browser';
        };
      });
    },
  });
}

module.exports = { register };