/* 渲染进程安全桥：只暴露更新/关于所需的最小能力，阅读功能仍完全在页面本地运行 */
const {contextBridge, ipcRenderer} = require('electron');

const wrap = channel => listener => {
  const handler = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('xiaoweiDesktop', Object.freeze({
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  openExternal: url => ipcRenderer.invoke('shell:openExternal', url),
  onUpdateState: listener => wrap('updater:state')(listener),
  onMenuAction: listener => wrap('menu:action')(listener)
}));
