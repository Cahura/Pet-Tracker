export const environment = {
  production: true,
  socketUrl: window.location.origin, // Usa la misma URL del servidor
  mapboxToken: 'pk.eyJ1Ijoia2FsaXRvczAiLCJhIjoiY21jcXp3aWxrMHBiMTJtb3JxNDB0enhuMSJ9.IARuB5IywY0T0h2SA60vLw',
  apiUrl: window.location.origin + '/api',
  pusher: {
    key: 'your-pusher-key',
    cluster: 'us2',
    wsHost: window.location.hostname,
    wsPort: parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
    wssPort: parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
    forceTLS: window.location.protocol === 'https:'
  }
};
