const { contextBridge, ipcRenderer } = require('electron');
const { STRINGS } = require('./i18n');

contextBridge.exposeInMainWorld('petAPI', {
  // 펫 창
  onMotion: (cb) => ipcRenderer.on('pet-motion', (_e, data) => cb(data)),
  onReact: (cb) => ipcRenderer.on('pet-react', (_e, data) => cb(data)),
  talk: () => ipcRenderer.invoke('pet-talk'),         // 단일 클릭: 대사
  openStatus: () => ipcRenderer.send('pet-open-status'), // 더블클릭/우클릭: 상태창
  dragStart: () => ipcRenderer.send('pet-drag-start'),
  dragEnd: () => ipcRenderer.send('pet-drag-end'),
  // 공용 / 상태창
  getState: () => ipcRenderer.invoke('get-state'),
  feed: () => ipcRenderer.invoke('feed'),
  play: () => ipcRenderer.invoke('play'),
  restart: () => ipcRenderer.send('pet-restart'), // 상태창/미니독: 펫 재시작
  hide: () => ipcRenderer.send('pet-hide'),       // 상태창: 펫 넣어두기
  show: () => ipcRenderer.send('pet-show'),       // 미니독: 펫 꺼내기
  // 이름 짓기 창
  setName: (name, lang) => ipcRenderer.invoke('set-name', name, lang),
  // 다국어 문자열 테이블 (렌더러가 lang 으로 골라 씀)
  strings: STRINGS,
});
