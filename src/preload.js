const { contextBridge, ipcRenderer } = require('electron');
const { STRINGS } = require('./i18n');

contextBridge.exposeInMainWorld('petAPI', {
  // 펫 창
  onMotion: (cb) => ipcRenderer.on('pet-motion', (_e, data) => cb(data)),
  onReact: (cb) => ipcRenderer.on('pet-react', (_e, data) => cb(data)),
  clicked: () => ipcRenderer.send('pet-clicked'),
  // 공용 / 상태창
  getState: () => ipcRenderer.invoke('get-state'),
  feed: () => ipcRenderer.invoke('feed'),
  play: () => ipcRenderer.invoke('play'),
  // 이름 짓기 창
  setName: (name, lang) => ipcRenderer.invoke('set-name', name, lang),
  // 다국어 문자열 테이블 (렌더러가 lang 으로 골라 씀)
  strings: STRINGS,
});
