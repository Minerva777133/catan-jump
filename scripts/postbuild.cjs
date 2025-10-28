// scripts/postbuild.cjs
const fs = require('fs');
const path = require('path');

const docs = path.join(process.cwd(), 'docs');
if (!fs.existsSync(docs)) {
  console.error('docs/ not found. Did build fail?');
  process.exit(1);
}

// 1) 生成 .nojekyll（空文件即可）
const nojekyll = path.join(docs, '.nojekyll');
if (!fs.existsSync(nojekyll)) {
  fs.writeFileSync(nojekyll, '');
  console.log('Created docs/.nojekyll');
}

// 2) 复制 index.html -> 404.html（防止刷新 404）
const indexHtml = path.join(docs, 'index.html');
const notFoundHtml = path.join(docs, '404.html');
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
  console.log('Copied docs/index.html -> docs/404.html');
} else {
  console.warn('docs/index.html not found, skipped 404.html copy');
}

console.log('postbuild done.');
