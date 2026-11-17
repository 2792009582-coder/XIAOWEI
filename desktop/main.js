/* 小唯阅读器桌面版 Electron 主进程 */
const {app, BrowserWindow, Menu, shell, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs');
const {autoUpdater} = require('electron-updater');
const {getRepoInfo} = require('./repo-info');

const repo = getRepoInfo();
let win = null;

function readRepoConfig(){
  try{
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'app', 'repo.json'), 'utf8'));
  }catch(e){
    return repo;
  }
}

function send(channel, payload){
  if(win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

/* ---- 自动更新：安装包走 GitHub Releases，便携包不更新 ---- */
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function hookUpdaterEvents(){
  autoUpdater.on('checking-for-update', () => send('updater:state', {type: 'checking'}));
  autoUpdater.on('update-available', info => {
    send('updater:state', {type: 'available', version: info.version, notes: info.releaseNotes || ''});
    autoUpdater.downloadUpdate().catch(() => {});
  });
  autoUpdater.on('update-not-available', () => send('updater:state', {type: 'not-available'}));
  autoUpdater.on('download-progress', p => send('updater:state', {
    type: 'progress',
    percent: Math.round(p.percent || 0)
  }));
  autoUpdater.on('update-downloaded', info => send('updater:state', {
    type: 'downloaded',
    version: info.version
  }));
  autoUpdater.on('error', err => send('updater:state', {
    type: 'error',
    message: String((err && err.message) || err)
  }));
}

function checkForUpdates(){
  if(!app.isPackaged) return Promise.resolve({ok: false, message: '开发模式不检查更新，请使用安装包版本'});
  if(repo.isPlaceholder) return Promise.resolve({ok: false, message: '尚未配置 GitHub 仓库，无法检查更新'});
  return autoUpdater.checkForUpdates().then(r => ({ok: true, info: r && r.updateInfo || null}))
    .catch(e => ({ok: false, message: String((e && e.message) || e)}));
}

/* ---- 应用菜单：Alt 显示（autoHideMenuBar），入口与设置弹窗共用同一逻辑 ---- */
function buildMenu(){
  const cfg = readRepoConfig();
  const template = [
    {
      label: '文件',
      submenu: [
        {label: '打开 PDF…', accelerator: 'Ctrl+O', click: () => send('menu:action', 'open')},
        {type: 'separator'},
        {role: 'quit', label: '退出'}
      ]
    },
    {
      label: '编辑',
      submenu: [
        {role: 'undo', label: '撤销'},
        {role: 'redo', label: '重做'},
        {type: 'separator'},
        {role: 'cut', label: '剪切'},
        {role: 'copy', label: '复制'},
        {role: 'paste', label: '粘贴'},
        {type: 'separator'},
        {role: 'selectAll', label: '全选'}
      ]
    },
    {
      label: '视图',
      submenu: [
        {role: 'reload', label: '重新加载'},
        {role: 'togglefullscreen', label: '切换全屏'}
      ]
    },
    {
      label: '帮助',
      submenu: [
        {label: '检查更新…', click: () => send('menu:action', 'check-update')},
        {type: 'separator'},
        {label: '项目主页', click: () => shell.openExternal(cfg.url || repo.url)},
        {label: '关于小唯阅读器', click: () => send('menu:action', 'about')}
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(){
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#faf9f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.on('closed', () => { win = null; });
}

function registerIpc(){
  ipcMain.handle('app:getInfo', () => {
    const cfg = readRepoConfig();
    return {
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
      isPackaged: app.isPackaged,
      repoUrl: cfg.url || repo.url,
      repoPlaceholder: !!cfg.isPlaceholder
    };
  });
  ipcMain.handle('updater:check', () => checkForUpdates());
  ipcMain.handle('updater:download', async () => {
    try{ await autoUpdater.downloadUpdate(); return {ok: true}; }
    catch(e){ return {ok: false, message: String((e && e.message) || e)}; }
  });
  ipcMain.handle('updater:quitAndInstall', () => autoUpdater.quitAndInstall(false, true));
  ipcMain.handle('shell:openExternal', (_event, url) => {
    if(typeof url === 'string' && /^https?:\/\//i.test(url)) return shell.openExternal(url);
  });
}

const gotLock = app.requestSingleInstanceLock();
if(!gotLock){
  app.quit();
}else{
  app.on('second-instance', () => {
    if(win){
      if(win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    if(process.platform === 'win32') app.setAppUserModelId('com.xiaowei.reader');
    registerIpc();
    hookUpdaterEvents();
    buildMenu();
    createWindow();

    // 启动后静默检查一次：有新版自动下载，用户点「安装更新」才重启
    setTimeout(() => { checkForUpdates().catch(() => {}); }, 6000);

    app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
  });
}
