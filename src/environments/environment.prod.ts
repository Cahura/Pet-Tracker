export const environment = {
  production: true,
  mapboxToken: 'pk.eyJ1Ijoia2FsaXRvczAiLCJhIjoiY21jcXp3aWxrMHBiMTJtb3JxNDB0enhuMSJ9.IARuB5IywY0T0h2SA60vLw',
  pusher: {
    key: 'wigli6jxrshlpmocqtm9ywevffhq21e4',
    cluster: 'mt1', // No se usa con Soketi pero es requerido
    wsHost: 'soketi-production-a060.up.railway.app',
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    enabledTransports: ['ws', 'wss']
  }
};
