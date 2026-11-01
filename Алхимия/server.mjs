import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const standalone=process.argv.includes('--standalone');
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),standalone?'standalone':'dist');
const port=Number(process.argv.find(a=>a.startsWith('--port='))?.split('=')[1])||Number(process.env.PORT)||4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(pathname==='/'?(standalone?'/Алхемия.html':'/index.html'):pathname));if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const s=await stat(target);if(!s.isFile())throw Error();const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
