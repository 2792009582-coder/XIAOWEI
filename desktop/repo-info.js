/* 推断 GitHub 仓库信息：优先 GitHub Actions 环境变量，其次 git remote，最后 package.json */
const cp = require('child_process');

function parseGitHubUrl(url){
  if(!url) return null;
  const s = String(url).trim();
  const m = s.match(/(?:git@github\.com:|https?:\/\/github\.com\/)([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?]|$)/i);
  return m ? {owner: m[1], repo: m[2]} : null;
}

function getRepoInfo(){
  let info = null;

  if(process.env.GITHUB_REPOSITORY){
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if(owner && repo) info = {owner, repo};
  }

  if(!info){
    try{
      const url = cp.execFileSync('git', ['remote', 'get-url', 'origin'], {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      info = parseGitHubUrl(url);
    }catch(e){}
  }

  if(!info){
    try{
      const pkg = require('./package.json');
      const r = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository && pkg.repository.url);
      info = parseGitHubUrl(r);
    }catch(e){}
  }

  const isPlaceholder = !info || info.owner === 'YOUR_GITHUB_USERNAME';
  if(isPlaceholder) info = {owner: 'YOUR_GITHUB_USERNAME', repo: 'xiaowei-reader'};

  return {
    owner: info.owner,
    repo: info.repo,
    isPlaceholder,
    url: 'https://github.com/' + info.owner + '/' + info.repo
  };
}

module.exports = {getRepoInfo, parseGitHubUrl};
