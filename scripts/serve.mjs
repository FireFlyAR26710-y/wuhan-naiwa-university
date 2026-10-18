import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.startsWith('/api/')) {
      res.writeHead(503, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({error:'Counter requires Netlify Functions; use netlify dev for backend preview'}));
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      res.writeHead(403);return res.end();
    }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream'});
    res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173/?stay=1 (static preview; no live counter)'));
