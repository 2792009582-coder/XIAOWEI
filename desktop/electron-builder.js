/* Electron 打包配置：NSIS 安装包（支持自动更新）+ 便携 zip（免安装） */
const {getRepoInfo} = require('./repo-info');
const repo = getRepoInfo();

module.exports = {
  appId: 'com.xiaowei.reader',
  productName: '小唯阅读器',
  copyright: 'Copyright © 2026 Xiaowei Reader',
  directories: {
    output: 'out',
    buildResources: 'build'
  },
  files: [
    'main.js',
    'preload.js',
    'package.json',
    'app/**/*',
    'node_modules/**/*',
    '!node_modules/electron/**',
    '!node_modules/electron-builder/**',
    '!node_modules/electron-packager/**',
    '!node_modules/pdfjs-dist/**',
    '!node_modules/katex/**'
  ],
  asar: true,
  artifactName: 'XiaoweiReader-${version}-${os}-${arch}.${ext}',
  win: {
    icon: 'build/icon.ico',
    target: [
      {target: 'nsis', arch: ['x64']},
      {target: 'zip', arch: ['x64']}
    ]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '小唯阅读器',
    deleteAppDataOnUninstall: false,
    artifactName: 'XiaoweiReader-${version}-setup.exe'
  },
  publish: [
    {
      provider: 'github',
      owner: repo.owner,
      repo: repo.repo,
      releaseType: 'release'
    }
  ]
};
