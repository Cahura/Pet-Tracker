export const environment = {
  production: false,
  socketUrl: 'https://pet-tracker-production.up.railway.app',
  mapboxToken: 'pk.eyJ1Ijoia2FsaXRvczAiLCJhIjoiY21jcXp3aWxrMHBiMTJtb3JxNDB0enhuMSJ9.IARuB5IywY0T0h2SA60vLw',
  apiUrl: 'https://pet-tracker-production.up.railway.app/api',
  pusher: {
    key: 'your-pusher-key',
    cluster: 'us2',
    wsHost: 'pet-tracker-production.up.railway.app',
    wsPort: 443,
    wssPort: 443,
    forceTLS: true
  }
};
