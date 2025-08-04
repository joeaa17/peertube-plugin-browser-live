function register({ registerHook }) {
  registerHook({
    target: 'action:video-live.view',
    handler: ({ live, hostElement }) => {
      const btn = document.createElement('button')
      btn.innerText = 'Go Live with Browser'
      btn.style.marginTop = '10px'
      hostElement.appendChild(btn)

      btn.onclick = async () => {
        const token = window.localStorage.getItem('peertube-auth-token')
        if (!token) return alert('Authentication token missing.')

        const ws = new WebSocket(`wss://${location.host}/plugins/browser-live/ws/${live.id}?token=${token}`)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })

        recorder.ondataavailable = async e => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(await e.data.arrayBuffer())
          }
        }

        recorder.start(1000)
        ws.onclose = () => recorder.stop()
      }
    }
  })
}