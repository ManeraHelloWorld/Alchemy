import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(path.join(root,'dist',name),'utf8');
const names=['chemistry','discoveries','researchui','physics','renderer','blackboard','curriculum','practicalcourse','progression','courseui','lessonlab','app'];
let bundle='"use strict";\nconst __alchemiaModules={};\n';
for(const name of names){
  let source=read(`${name}.js`);
  const exported=[...source.matchAll(/^export\s+(?:const|let|class|function)\s+(\w+)/gm)].map(m=>m[1]);
  source=source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/(\w+)\.js['"];?\s*$/gm,(_,bindings,module)=>`const {${bindings.replace(/\s+as\s+/g,':')}} = __alchemiaModules.${module};`);
  source=source.replace(/^export\s+/gm,'');
  if(/^import\s/m.test(source))throw new Error(`Unsupported import in ${name}`);
  bundle+=`__alchemiaModules.${name}=(()=>{\n${source}\nreturn {${exported.join(',')}};\n})();\n`;
}
new vm.Script(bundle,{filename:'alchemia-bundle.js'});
let html=read('index.html');
const css=read('style.css');
html=html.replace('<link rel="stylesheet" href="./research.css">',()=>`<style>${read('research.css')}</style>`);
html=html.replace('<link rel="stylesheet" href="./course.css">',()=>`<style>${read('course.css')}</style>`);
html=html.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`);
html=html.replace('<link rel="stylesheet" href="./desktop.css">',()=>`<style>${read('desktop.css')}</style>`);
html=html.replace('<script type="module" src="./app.js"></script>',()=>`<script>\n${bundle.replace(/<\/script/gi,'<\\/script')}\n</script>`);
// An ordinary file can be opened directly; all gameplay, art and styles are embedded.
html=html.replace('href="./" aria-label="Алхемия — главная"','href="#" aria-label="Алхемия — главная"');
mkdirSync(path.join(root,'standalone'),{recursive:true});
for(const [edition,title] of [['','Алхемия'],['learning','Алхемия — Обучение'],['free','Алхемия — Free']]){
  let page=html;
  if(edition)page=page.replace('<html lang="ru">',`<html lang="ru" data-edition="${edition}">`).replace(/<title>[^<]+<\/title>/,`<title>${title}</title>`);
  const output=path.join(root,'standalone',title+'.html');
  writeFileSync(output,page);
  console.log(`Standalone: ${output}\n${Buffer.byteLength(page)} bytes; JavaScript syntax verified.`);
}
