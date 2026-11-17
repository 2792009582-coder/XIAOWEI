/* prepare.js —— 桌面版离线化构建：
 * 1. 把仓库根 index.html 复制到 app/index.html，把 5 个 CDN 引用改写为本地 libs/ 路径（离线可用）
 * 2. 从 node_modules 拷贝 pdf.js legacy 版（与网页版 CDN 同版本 3.11.174）与 KaTeX dist（含字体）
 * 3. 写入 app/repo.json，供「关于/项目主页」使用
 * 说明：pdf.js 用 legacy build——file:// 下 Worker 创建失败时会自动降级主线程 fake worker（经典 script 加载，file://→file:// 可用）
 */
const fs = require('fs');
const path = require('path');
const {getRepoInfo} = require('./repo-info');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(__dirname, 'app');
const LIBS = path.join(APP, 'libs');

fs.mkdirSync(LIBS, {recursive: true});
fs.mkdirSync(path.join(LIBS, 'fonts'), {recursive: true});

/* ---- 1. HTML 改写 ---- */
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CDN = [
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'libs/pdf.min.js'],
  ["GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'",
   "GlobalWorkerOptions.workerSrc='libs/pdf.worker.min.js'"],
  ['https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css', 'libs/katex.min.css'],
  ['https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js', 'libs/katex.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js', 'libs/auto-render.min.js']
];
for (const [from, to] of CDN) {
  if (!html.includes(from)) {
    throw new Error('桌面离线化失败：index.html 中未找到引用 ' + from + '\n若升级了 PDF.js / KaTeX，请同步修改 desktop/prepare.js');
  }
  html = html.split(from).join(to);
}
if (html.includes('cdnjs.cloudflare.com')) {
  throw new Error('桌面离线化失败：app/index.html 仍残留 CDN 引用，请检查 index.html');
}
fs.writeFileSync(path.join(APP, 'index.html'), html);
console.log('✓ app/index.html 生成（CDN → 本地 5/5）');

fs.writeFileSync(path.join(APP, 'repo.json'), JSON.stringify(getRepoInfo(), null, 2));
console.log('✓ app/repo.json 生成');

/* ---- 2. 拷贝依赖 ---- */
const nm = p => path.join(__dirname, 'node_modules', p);
const cp = (src, dst) => {
  if (!fs.existsSync(src)) throw new Error('缺少依赖文件：' + src + '\n请先执行 npm install');
  fs.copyFileSync(src, dst);
  console.log('✓ ' + path.relative(APP, dst));
};

cp(nm('pdfjs-dist/legacy/build/pdf.min.js'), path.join(LIBS, 'pdf.min.js'));
cp(nm('pdfjs-dist/legacy/build/pdf.worker.min.js'), path.join(LIBS, 'pdf.worker.min.js'));
cp(nm('katex/dist/katex.min.css'), path.join(LIBS, 'katex.min.css'));
cp(nm('katex/dist/katex.min.js'), path.join(LIBS, 'katex.min.js'));
cp(nm('katex/dist/contrib/auto-render.min.js'), path.join(LIBS, 'auto-render.min.js'));

const fontsSrc = nm('katex/dist/fonts');
let n = 0;
for (const f of fs.readdirSync(fontsSrc)) {
  if (/\.(woff2|woff|ttf)$/.test(f)) {
    fs.copyFileSync(path.join(fontsSrc, f), path.join(LIBS, 'fonts', f));
    n++;
  }
}
console.log('✓ KaTeX 字体 ' + n + ' 个');
console.log('prepare 完成');
