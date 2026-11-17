/* 无第三方依赖地生成 256×256 应用图标（PNG-in-ICO） */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 256;
const pixels = Buffer.alloc(S * S * 4);

function put(x, y, r, g, b, a){
  x = Math.round(x); y = Math.round(y);
  if(x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4;
  pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a === undefined ? 255 : a;
}

function inRoundRect(x, y, x0, y0, x1, y1, r){
  if(x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : (x > x1 - r ? x1 - r : x);
  const cy = y < y0 + r ? y0 + r : (y > y1 - r ? y1 - r : y);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function fillPoly(points, color){
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.floor(Math.min(...xs)), maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
  for(let y = minY; y <= maxY; y++){
    for(let x = minX; x <= maxX; x++){
      let inside = false;
      for(let i = 0, j = points.length - 1; i < points.length; j = i++){
        const xi = points[i][0], yi = points[i][1], xj = points[j][0], yj = points[j][1];
        if(((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if(inside) put(x, y, color[0], color[1], color[2], color[3]);
    }
  }
}

/* 背景：靛蓝渐变圆角方块 */
for(let y = 0; y < S; y++){
  for(let x = 0; x < S; x++){
    if(inRoundRect(x, y, 8, 8, 248, 248, 48)){
      const t = (x + y) / (2 * S);
      put(x, y, Math.round(67 + 42 * t), Math.round(56 + 38 * t), Math.round(202 + 50 * t), 255);
    }
  }
}

/* 打开的书 */
fillPoly([[36, 76], [118, 62], [122, 188], [36, 204]], [255, 255, 255, 255]);
fillPoly([[134, 62], [220, 76], [220, 204], [134, 188]], [255, 255, 255, 255]);
fillPoly([[120, 64], [134, 62], [134, 188], [122, 188]], [198, 193, 228, 255]);

/* 页面文字纹理 */
for(let i = 0; i < 6; i++){
  const y = 92 + i * 15;
  fillPoly([[52, y], [110, y - 5], [110, y - 2], [52, y + 3]], [196, 201, 214, 255]);
  fillPoly([[146, y - 5], [204, y], [204, y + 3], [146, y - 2]], [196, 201, 214, 255]);
}

/* 绿色书签 */
fillPoly([[118, 60], [138, 60], [138, 118], [128, 108], [118, 118]], [22, 163, 74, 255]);

/* ---- PNG 编码 ---- */
let table = [];
for(let n = 0; n < 256; n++){
  let c = n;
  for(let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  table[n] = c >>> 0;
}
function crc32(data){
  let c = 0xffffffff;
  for(const b of data) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const stride = 1 + S * 4;
const raw = Buffer.alloc(S * stride);
for(let y = 0; y < S; y++) pixels.copy(raw, y * stride + 1, y * S * 4, (y + 1) * S * 4);
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
  chunk('IEND', Buffer.alloc(0))
]);

/* ---- ICO 封装 ---- */
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0;
entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12);

const dir = path.join(__dirname);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([header, entry, png]));
console.log('✓ build/icon.ico 已生成（256×256）');
