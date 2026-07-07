import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  closeWindow: () => ipcRenderer.send('close-window'),
  ready: () => ipcRenderer.invoke('ready'),
  sendSticker: async (stickerPath: string, settings: unknown) =>
    ipcRenderer.send('send-sticker', stickerPath, settings),
  downloadStickerPack: (url: string) => {
    const { port1, port2 } = new MessageChannel();
    ipcRenderer.postMessage('download-sticker-pack', url, [port2]);
    port1.onmessage = (event: MessageEvent) => {
      window.postMessage(event.data, '*');
    };
  },
  setStickerPackOrder: (stickerPackOrder: string[]) =>
    ipcRenderer.send('set-sticker-pack-order', stickerPackOrder),
  getHotkey: () => ipcRenderer.invoke('get-hotkey'),
  setHotkey: (hotkey: string) => ipcRenderer.send('set-hotkey', hotkey),
  disableHotkey: () => ipcRenderer.send('disable-hotkey'),
  enableHotkey: () => ipcRenderer.send('enable-hotkey'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: string) => ipcRenderer.send('set-theme', theme),
  getRunOnStartup: () => ipcRenderer.invoke('get-run-on-startup'),
  setRunOnStartup: (runOnStartup: boolean) => ipcRenderer.send('set-run-on-startup', runOnStartup),
  getResizeWidth: () => ipcRenderer.invoke('get-resize-width'),
  setResizeWidth: (width: number) => ipcRenderer.send('set-resize-width', width),
  getUpdates: () => ipcRenderer.invoke('get-updates'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  setFavorites: (favorites: unknown) => ipcRenderer.send('set-favorites', favorites),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  getMostUsed: () => ipcRenderer.invoke('get-most-used'),
});
