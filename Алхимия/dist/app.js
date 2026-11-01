import {World,EQUIPMENT} from './physics.js';
import {SUBSTANCES,REACTIONS,createMixture,volume,color,components,getPH,describe,identifyMixture,identifyProduct} from './chemistry.js';
import {Renderer,drawItem,BOARD_RECT} from './renderer.js';
import {DiscoveryBook} from './discoveries.js';
import {ResearchUI} from './researchui.js';
import {Blackboard} from './blackboard.js';
import {PRACTICAL_LESSONS as LESSONS} from './practicalcourse.js';
import {CourseProgress} from './progression.js';
import {CourseUI} from './courseui.js';
import {supplyAllowed,lessonSetupProblem,createLessonSetup,observeLessonSetup} from './lessonlab.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const OLD_STORE='alchemia-lab-v1';
const validEdition=value=>['learning','free'].includes(value)?value:null;
const ENTRY_EDITION=validEdition(document.documentElement.dataset.edition)||validEdition(new URLSearchParams(location.search).get('edition'));
const readJSON=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
let currentEdition=ENTRY_EDITION||validEdition(readJSON('alchemia-v4-edition'))||'learning';
let STORE='alchemia-v4-'+currentEdition,profileLoading=true;
let catalogPage=0,equipmentPage=0,lessonKitIds=[];
const canvas=$('#lab'),renderer=new Renderer(canvas);
let activeView='table',inventory=Array(10).fill(null),notes=[],activeNote=null,events=[],filter='all',soundEnabled=false,audioContext=null,toastTimer,lastInspector=0,inspectorId=null,dirty=true,lastSave=0,touch=false,loaded=false;
const course=new CourseProgress();
let courseUI=null,lessonAttempt=null;
const viewScrollPositions={};
const world=new World(onEvent);
const discoveries=new DiscoveryBook();
const researchUI=new ResearchUI(discoveries);
let hoveredBody=null,boardHovered=false,discoveryToastTimer,queuedDiscoveries=new Set();
const board=new Blackboard($('#chalkboard'),()=>{dirty=true;$('#board-save-status').textContent=save()?'Сохранено на устройстве':'Не удалось сохранить';});
const fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});
const dateFormat=iso=>new Date(iso).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});

function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3300);}
function sound(type){if(!soundEnabled)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const now=audioContext.currentTime;if(type==='break'||type==='explosion'){const size=audioContext.sampleRate*.4,buffer=audioContext.createBuffer(1,size,audioContext.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*(1-i/size);const source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;gain.gain.setValueAtTime(type==='explosion'?.17:.09,now);gain.gain.exponentialRampToValueAtTime(.001,now+.4);source.connect(gain).connect(audioContext.destination);source.start();return;}const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(type==='gas'?330:type==='pick'?760:540,now);osc.frequency.exponentialRampToValueAtTime(type==='gas'?190:320,now+.12);gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.16);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(now+.18);}catch{soundEnabled=false;}}
function onEvent(event){if(!event?.title)return;recordReaction(event);if(lessonAttempt?.receiver===event.body&&course.activeLessonId===lessonAttempt.lessonId){if(event.reactionId)recordPractice({type:'reaction',id:event.reactionId});if(event.type==='boil')recordPractice({type:'boil'});}const last=events[0];if(last?.title===event.title&&Date.now()-last.at<30000)return;if(event.reactionId&&event.body&&!event.body.broken){world.selected=event.body;renderInspector(true);}events.unshift({type:event.type,title:event.title,description:event.description||'',equation:event.equation||'',at:Date.now()});events=events.slice(0,50);renderEvents();dirty=true;sound(event.type);if(['explosion','break'].includes(event.type))toast(event.title);}
function renderEvents(){const host=$('#observations');if(!events.length){host.innerHTML='<div class="observation"><b>Лаборатория готова</b><p>Выберите сосуд и начните эксперимент. Здесь появятся изменения, реакции и ваши открытия.</p></div>';return;}host.innerHTML=events.slice(0,5).map(e=>`<div class="observation"><time>${new Date(e.at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time><b>${escape(e.title)}</b><p>${escape(e.description)}</p>${e.equation?`<code>${escape(e.equation)}</code>`:''}</div>`).join('');}
function setView(view){if(view==='course'&&course.mode==='free')return;if(!['table','substances','equipment','notebook','encyclopedia','course'].includes(view))return;const changed=view!==activeView;if(changed)viewScrollPositions[activeView]=window.scrollY;if(view!=='table'&&world.held)world.release();activeView=view;$$('[id^="view-"]').forEach(el=>el.hidden=el.id!==`view-${view}`);$$('.nav-tab').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);el.setAttribute('aria-current',el.dataset.view===view?'page':'false');});if(view==='notebook')renderNotes();if(view==='encyclopedia')researchUI.render();if(view==='course')courseUI?.render();updateHold();if(view==='table')requestAnimationFrame(fitCanvas);if(changed)window.scrollTo({top:viewScrollPositions[view]||0,behavior:'instant'});}
$$('.nav-tab').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));

function stockSpec(id){const s=SUBSTANCES[id];return{kind:'bottle',substance:id,volume:s.state==='solid'?1.5:80,label:s.name,formula:s.formula,color:s.color,sealed:s.state==='gas'};}
function specName(spec){return spec.label||EQUIPMENT.find(e=>e.id===spec.kind)?.name||'Бутылочка';}
function makeBody(spec,x=600,y=330){if(world.bodies.filter(b=>!b.broken).length>=35){toast('На столе уже 35 предметов. Уберите часть в инвентарь.');return null;}const body=world.create(spec.kind,x,y,spec);if(spec.mixture)body.mixture=clone(spec.mixture);body.formula=spec.formula||body.formula;body.color=spec.color||body.color;body.sealed=spec.sealed===true&&body.canSeal!==false;updateIdentity(body);recordMixture(body.mixture,{kind:spec.substance?'stock':'existing',source:spec.substance?'Взято из шкафа: '+SUBSTANCES[spec.substance]?.name:'Содержимое сосуда на столе'});return body;}
function deploy(spec,point=null){if(!supplyAllowed(spec,course)){toast('Этот ресурс откроется после учебной темы.');return;}setView('table');if(world.held)world.release();const p=point||{x:560,y:345};const body=makeBody(spec,p.x,p.y);if(!body)return;world.grab(body);world.selected=body;dirty=true;renderInspector(true);updateHold();sound('pick');if(!point)toast('Предмет в руке. Колесо — наклонить, ПКМ — отпустить.');}
function addInventory(spec){if(!supplyAllowed(spec,course)){toast('Этот ресурс ещё не открыт.');return false;}const index=inventory.indexOf(null);if(index<0){toast('Все 10 ячеек заняты. Освободите место на столе.');return false;}inventory[index]=clone(spec);if(spec.substance)recordMixture(createMixture(spec.substance,spec.volume),{kind:'stock',source:'Взято из шкафа: '+SUBSTANCES[spec.substance]?.name});else if(spec.mixture)recordMixture(spec.mixture,{kind:'existing',source:'Исследовано в инвентаре'});renderInventory();dirty=true;toast(`${specName(spec)} — в инвентаре`);return true;}
function renderInventory(){const grid=$('#inventory-slots');grid.replaceChildren();inventory.forEach((item,index)=>{const slot=document.createElement('button');slot.className=`inventory-slot${item?'':' empty'}`;slot.title=item?`${specName(item)} — взять на стол`:`Ячейка ${index+1}: открыть шкаф`;slot.setAttribute('aria-label',slot.title);slot.innerHTML=`<span class="slot-number">${String(index+1).padStart(2,'0')}</span>${item?'<canvas width="100" height="110"></canvas><span class="slot-label"></span>':'<span class="slot-plus">＋</span>'}`;if(item){slot.querySelector('.slot-label').textContent=item.formula||specName(item);drawItem(slot.querySelector('canvas'),item);slot.addEventListener('click',()=>{if(world.bodies.filter(b=>!b.broken).length>=35){toast('Сначала освободите место на столе.');return;}inventory[index]=null;deploy(item);renderInventory();save();});}else slot.addEventListener('click',()=>setView('substances'));grid.append(slot);});$('#inventory-count').textContent=`${inventory.filter(Boolean).length} / 10`;}
function storeSelected(target=null){const b=target?.kind?target:world.selected;if(!b||b.broken)return;updateIdentity(b);if(b.lit){b.lit=false;}const spec={kind:b.kind,mixture:clone(b.mixture),label:b.label,formula:b.formula,color:b.color,sealed:b.sealed};if(addInventory(spec)){world.remove(b);renderInspector(true);updateHold();save();}}

const normalizeFormula=text=>String(text).toLowerCase().replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c));
function catalogSize(){const columns=innerWidth>=1200?4:innerWidth>=850?3:2;return columns*(innerHeight>=680?2:1);}
function renderPager(id,page,total,size,onPage){
 const host=$(id),pages=Math.max(1,Math.ceil(total/size));host.replaceChildren();
 const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
 prev.textContent='← Назад';next.textContent='Далее →';prev.disabled=page===0;next.disabled=page>=pages-1;
 label.textContent=total?String(page+1)+' / '+pages+' · '+total+' образцов':'Нет образцов';
 prev.addEventListener('click',()=>onPage(page-1));next.addEventListener('click',()=>onPage(page+1));host.append(prev,label,next);
}
function renderCatalog(){
 const search=normalizeFormula($('#substance-search').value.trim());
 const substances=Object.values(SUBSTANCES).filter(s=>(course.mode==='free'||s.stock)&&(!search||normalizeFormula(s.name+' '+s.formula+' '+s.id).includes(search))&&(filter==='all'||filter==='solid'&&s.state==='solid'||filter==='liquid'&&['liquid','aqueous'].includes(s.state)||filter==='element'&&s.category==='Элементы'||filter==='gas'&&s.state==='gas'));
 const size=catalogSize();catalogPage=Math.max(0,Math.min(catalogPage,Math.ceil(substances.length/size)-1));
 const grid=$('#substance-grid');grid.replaceChildren();
 for(const s of substances.slice(catalogPage*size,(catalogPage+1)*size)){
  const state=s.id==='water'?'РАСТВОРИТЕЛЬ':s.state==='gas'?'ГАЗ · ЗАКРЫТЫЙ СОСУД':s.state==='solid'?'ТВЁРДЫЙ ОБРАЗЕЦ':'ВОДНЫЙ РАСТВОР';
  const card=catalogCard(stockSpec(s.id),s.name,s.description,s.formula,state);grid.append(card);
 }
 if(!substances.length)grid.innerHTML='<p class="empty-catalog">Ничего не найдено. Попробуйте другое название.</p>';
 renderPager('#substance-pagination',catalogPage,substances.length,size,page=>{catalogPage=page;renderCatalog();});
}

function catalogCard(spec,name,description,formula,state){const allowed=supplyAllowed(spec,course);const card=document.createElement('article');card.className='catalog-card';card.innerHTML=`<div class="catalog-art" title="Перетащите на рабочий стол"><canvas width="170" height="170"></canvas><span class="catalog-formula">${escape(formula)}</span><span class="catalog-state">${escape(state)}</span></div><div class="catalog-card-body"><h3>${escape(name)}</h3><p>${escape(description)}</p><div class="catalog-card-actions"><button data-deploy>На стол ↗</button><button data-store>＋ В инвентарь</button></div></div>`;drawItem(card.querySelector('canvas'),spec);if(!allowed){card.classList.add('catalog-locked');card.querySelectorAll('button').forEach(b=>b.disabled=true);const hint=document.createElement('p');hint.className='resource-lock';hint.textContent=unlockHint(spec);card.querySelector('.catalog-card-actions').before(hint);card.querySelector('.catalog-art').title='Откроется по ходу обучения';return card;}card.querySelector('[data-deploy]').addEventListener('click',()=>deploy(spec));card.querySelector('[data-store]').addEventListener('click',()=>addInventory(spec));const art=card.querySelector('.catalog-art');let start=null,dragging=false;art.addEventListener('pointerdown',e=>{if(e.button!==0)return;start={x:e.clientX,y:e.clientY};dragging=false;art.setPointerCapture(e.pointerId);});art.addEventListener('pointermove',e=>{if(!start)return;if(!dragging&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>9){dragging=true;setView('table');deploy(spec,pointOnCanvas(e));}if(dragging){const p=pointOnCanvas(e);world.move(p.x,p.y);}});art.addEventListener('pointerup',()=>{if(start&&!dragging)deploy(spec);start=null;dragging=false;});art.addEventListener('pointercancel',()=>{start=null;dragging=false;});return card;}
$('#substance-search').addEventListener('input',()=>{catalogPage=0;renderCatalog();});$$('#substance-filters button').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.filter;catalogPage=0;$$('#substance-filters button').forEach(b=>b.classList.toggle('active',b===btn));renderCatalog();}));
function renderEquipment(){
 const grid=$('#equipment-grid'),size=catalogSize();grid.replaceChildren();equipmentPage=Math.max(0,Math.min(equipmentPage,Math.ceil(EQUIPMENT.length/size)-1));
 for(const e of EQUIPMENT.slice(equipmentPage*size,(equipmentPage+1)*size))grid.append(catalogCard({kind:e.id,label:e.name},e.name,e.description,e.capacity?e.capacity+' мл':'',['burner','hotplate'].includes(e.id)?'ИСТОЧНИК ТЕПЛА':e.id==='stand'?'МЕТАЛЛ':e.id==='thermometer'?'ИЗМЕРЕНИЕ':e.canSeal===false?'ФАРФОР':'СТЕКЛО'));
 renderPager('#equipment-pagination',equipmentPage,EQUIPMENT.length,size,page=>{equipmentPage=page;renderEquipment();});
}


function renderInspector(force=false){
 const b=world.selected&&!world.selected.broken?world.selected:null,host=$('#object-inspector');
 if(!b){if(inspectorId==='empty'&&!force)return;inspectorId='empty';host.innerHTML='<div class="object-card"><div class="panel-heading">ОБЪЕКТ ИССЛЕДОВАНИЯ <span>↗</span></div><div class="inspector-empty-art"><canvas width="140" height="140"></canvas></div><h2>Начнём с любопытства.</h2><p class="description">Возьмите предмет, чтобы исследовать его состав. Новые вещества попадают в энциклопедию.</p><div class="mini-tip">Нажмите на доску за столом — там можно писать настоящим мелом.</div></div>';drawItem(host.querySelector('canvas'),{kind:'flask',substance:'cuso4',volume:75,color:'#309ab4',capacity:200});return;}
 updateIdentity(b);
 if(inspectorId!==b.id||force){inspectorId=b.id;host.innerHTML='<div class="object-card"><div class="panel-heading">ОБЪЕКТ ИССЛЕДОВАНИЯ <span id="object-status"></span></div><h2 class="mixture-name" id="mixture-name"></h2><div class="formula" id="mixture-formula"></div><div id="object-stats"></div><p class="substance-description" id="substance-description"></p><button class="substance-link" id="substance-encyclopedia">О веществе в энциклопедии ↗</button><div class="composition-label" id="composition-label">СОСТАВ СМЕСИ</div><ul class="composition" id="object-composition"></ul><div class="object-actions"><button id="object-action"></button><button id="object-store">В инвентарь</button><button id="object-remove" class="danger">Убрать</button></div><div class="mini-tip" id="object-tip"></div></div>';$('#object-action').addEventListener('click',actionSelected);$('#object-store').addEventListener('click',storeSelected);$('#object-remove').addEventListener('click',()=>{world.remove(world.selected);dirty=true;renderInspector(true);updateHold();toast('Предмет убран со стола');});$('#substance-encyclopedia').addEventListener('click',()=>{const id=world.selected?.product?.id||world.selected?.identity?.ids[0];setView('encyclopedia');if(id)researchUI.select(id);});}
 const identity=b.identity,equipment=EQUIPMENT.find(e=>e.id===b.kind),isHeater=['burner','hotplate'].includes(b.kind);
 $('#mixture-name').textContent=b.product?.name||(identity?.status==='mixture'?'Смесь веществ':b.label);
 $('#mixture-formula').textContent=b.product?.formula||b.formula||equipment?.name||'';
 $('#substance-description').textContent=b.product?b.product.description+(b.product.mixed?' Также в сосуде: '+b.product.otherIds.map(id=>SUBSTANCES[id].formula).join(', ')+'.':''):identity?.status!=='empty'&&identity?identity.description:equipment?.description||'Пустая бутылочка для нового опыта.';
 $('#substance-encyclopedia').hidden=!identity?.ids?.length;
 $('#object-status').textContent=b===world.held?'В РУКЕ':b.sealed?'ЗАКРЫТО':'НА СТОЛЕ';
 const act=$('#object-action');act.hidden=!isHeater&&(!b.capacity||b.canSeal===false);act.textContent=isHeater?(b.lit?'Выключить':b.kind==='hotplate'?'Включить':'Зажечь'):(b.sealed?'Открыть крышку':'Закрыть крышку');
 if(b.capacity){
  const ph=getPH(b.mixture),gasParts=Object.entries(b.mixture.gasAmounts||{}).filter(([,amount])=>amount>1e-7).map(([id,amount])=>({...SUBSTANCES[id],amount,state:'gas'}));
  const condensedVolume=volume(b.mixture),gasOnly=gasParts.length>0&&condensedVolume<.001;
  $('#object-stats').innerHTML='<div class="inspector-stats"><div class="stat"><small>'+(gasOnly?'Газовая полость':'Объём')+'</small><b>'+fmt(gasOnly?b.capacity:condensedVolume)+' <span>мл</span></b></div><div class="stat"><small>Температура</small><b>'+fmt(b.mixture.temperature)+'<span> °C</span></b></div><div class="stat"><small>'+(b.sealed?'Давление':'pH ≈')+'</small><b>'+(b.sealed?fmt(b.mixture.pressure??1):ph===null?'—':fmt(ph))+(b.sealed?'<span> атм</span>':'')+'</b></div></div>';
  $('#composition-label').hidden=false;$('#composition-label').textContent='СОСТАВ СОСУДА';
  const parts=[...components(b.mixture),...gasParts];
  $('#object-composition').innerHTML=parts.length?parts.map(s=>'<li><i style="background:'+SUBSTANCES[s.id]?.color+'"></i><div class="component-name"><b>'+escape(s.formula)+(s.state==='gas'?' (газ)':'')+'</b><small>'+escape(s.name)+'</small></div><span class="component-amount">'+(s.amount<.05?'&lt;0,1':fmt(s.amount))+' ммоль</span></li>').join(''):'<li>Сосуд пуст</li>';
  $('#object-tip').textContent=b.sealed?'Давление газа указано в атмосферах. Открытие крышки выпускает газ.':b===world.held?'Наклоните горлышко над принимающим сосудом.':'Вместимость '+b.capacity+' мл. '+(b.heat>.1?'Содержимое нагревается.':b.canSeal===false?'Открытый фарфоровый сосуд.':'E — крышка.');
 }
 else{$('#composition-label').hidden=true;$('#object-composition').innerHTML='';$('#object-stats').innerHTML=b.kind==='thermometer'?'<div class="inspector-stats"><div class="stat"><small>Показание</small><b>'+fmt(b.reading??22)+'<span> °C</span></b></div></div>':'';$('#object-tip').textContent=b.kind==='thermometer'?(b.readingSource?'Измеряется: '+b.readingSource:'Погрузите нижнюю колбу в жидкость.'):isHeater?(b.lit?'Нагрев включён.':'E — включить нагрев.'):'Поставьте посуду на верхнюю сетку, а спиртовку — под ней.';}
}
function actionSelected(target=null){const b=target?.kind?target:world.selected;if(!b||b.broken)return;if(['burner','hotplate'].includes(b.kind)){if(Math.abs(b.angle)>.45){toast('Сначала поставьте нагреватель вертикально.');return;}b.lit=!b.lit;onEvent({type:'action',title:b.lit?(b.kind==='hotplate'?'Электроплитка включена':'Спиртовка зажжена'):'Нагрев выключен',description:b.lit?'Посуда над источником тепла нагревается.':'Нагретая посуда постепенно остывает.'});}else if(b.capacity&&b.canSeal!==false){b.sealed=!b.sealed;toast(b.sealed?'Крышка закрыта':'Крышка открыта — можно переливать');}dirty=true;renderInspector(true);}
function updateHold(){canvas.classList.toggle('holding',!!world.held);$('#held-hint').hidden=!world.held||touch;$('#touch-controls').hidden=!touch||!world.held||activeView!=='table';}
function pointOnCanvas(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1200/r.width,y:(e.clientY-r.top)*620/r.height};}
canvas.addEventListener('pointerdown',e=>{if(e.button===2){e.preventDefault();world.release();updateHold();dirty=true;return;}if(e.button!==0)return;touch=e.pointerType==='touch';const p=pointOnCanvas(e);if(!world.held&&isBoardPoint(p)&&!world.hitTest(p.x,p.y)){openBoard();return;}if(!world.held){const picked=world.pick(p.x,p.y);if(picked){sound('pick');renderInspector(true);}else{world.selected=null;renderInspector(true);}}else world.move(p.x,p.y);canvas.focus({preventScroll:true});updateHold();dirty=true;});
canvas.addEventListener('pointermove',e=>{const p=pointOnCanvas(e);world.move(p.x,p.y);hoveredBody=!world.held?world.hitTest(p.x,p.y):null;boardHovered=!world.held&&isBoardPoint(p)&&!world.hitTest(p.x,p.y);canvas.classList.toggle('over-board',boardHovered);});
canvas.addEventListener('pointerleave',()=>{hoveredBody=null;boardHovered=false;canvas.classList.remove('over-board');});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();world.release();renderInspector(true);updateHold();dirty=true;});
canvas.addEventListener('wheel',e=>{if(!world.held)return;e.preventDefault();world.rotate(Math.sign(e.deltaY||e.deltaX)*.13);dirty=true;},{passive:false});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||document.querySelector('dialog[open]'))return;if(e.code==='KeyF'){e.preventDefault();toggleFullscreen();return;}if(e.code==='Escape'){document.body.classList.remove('immersive');syncFullscreen();world.release();updateHold();return;}if(/^[1-6]$/.test(e.key)){setView(['table','substances','equipment','notebook','encyclopedia','course'][Number(e.key)-1]);return;}if(activeView!=='table')return;if(e.code==='Space'){e.preventDefault();togglePause();}if(e.code==='KeyB')openBoard();if(e.code==='KeyE')actionSelected(world.held||world.selected);if(e.code==='KeyA')world.rotate(-.12);if(e.code==='KeyD')world.rotate(.12);if(e.code==='KeyI')storeSelected(world.held||world.selected);if(world.held&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();const n=e.shiftKey?25:7;world.move(world.cursor.x+(e.code==='ArrowRight'?n:e.code==='ArrowLeft'?-n:0),world.cursor.y+(e.code==='ArrowDown'?n:e.code==='ArrowUp'?-n:0));}dirty=true;});
$('#rotate-left').addEventListener('click',()=>world.rotate(-.2));$('#rotate-right').addEventListener('click',()=>world.rotate(.2));$('#touch-action').addEventListener('click',()=>actionSelected(world.held||world.selected));$('#touch-drop').addEventListener('click',()=>{world.release();updateHold();});
function togglePause(){world.paused=!world.paused;$('#pause-overlay').hidden=!world.paused;$('#pause-btn').innerHTML=world.paused?'▶ <span>Продолжить</span>':'Ⅱ <span>Пауза</span>';dirty=true;}
$('#pause-btn').addEventListener('click',togglePause);$('#resume-btn').addEventListener('click',togglePause);
$('#clean-btn').addEventListener('click',()=>{world.puddles=[];world.particles=world.particles.filter(p=>p.type!=='shard');world.bodies=world.bodies.filter(b=>!b.broken);if(world.selected?.broken)world.selected=null;dirty=true;renderInspector(true);toast('Поверхность стола очищена');});
$('#reset-btn').addEventListener('click',()=>$('#reset-dialog').showModal());$('#confirm-reset').addEventListener('click',()=>{resetTable();$('#reset-dialog').close();toast('Стол готов к новому эксперименту');});
function resetTable(){world.clear();lessonAttempt=null;lessonKitIds=[];world.paused=false;world.create('bottle',250,440,stockSpec('water'));world.create('beaker',560,449);world.create('tube',800,440);world.selected=null;events=[];renderEvents();$('#pause-overlay').hidden=true;$('#pause-btn').innerHTML='Ⅱ <span>Пауза</span>';renderInspector(true);updateHold();dirty=true;save();}
$('#experiment-btn').addEventListener('click',()=>{if(course.mode==='learning'){setView('course');return;}if(!['acetic_acid','sodium_bicarbonate'].every(id=>course.hasSubstance(id))){toast('Сода и уксусная кислота открываются в первых темах обучения.');return;}if(world.bodies.filter(b=>!b.broken).length>31){toast('Для опыта нужно освободить место на столе.');return;}world.release();if(!reserveRegion(425,650))return;const beaker=makeBody({kind:'beaker',substance:'acetic_acid',volume:30,label:'Опыт: кислота и сода'},570,449);const bottle=makeBody({...stockSpec('sodium_bicarbonate'),volume:45},450,440);if(beaker&&bottle){world.selected=bottle;world.grab(bottle);world.move(490,340);renderInspector(true);updateHold();toast('Наклоните бутылочку над стаканом. Наблюдайте за пузырьками.');}dirty=true;});
$('#dismiss-experiment').addEventListener('click',()=>$('.experiment-card').hidden=true);
$('#heat-setup-btn').addEventListener('click',()=>{if(!['stand','burner','beaker'].every(id=>course.hasEquipment(id))){toast('Нагревательная установка откроется в учебном маршруте.');return;}if(world.bodies.filter(b=>!b.broken).length>32){toast('Освободите три места на столе.');return;}setView('table');world.release();const x=findSpace(160);if(x===null)return;const stand=makeBody({kind:'stand',label:'Подставка'},x,425),burner=makeBody({kind:'burner',label:'Спиртовка'},x,458),beaker=makeBody({kind:'beaker',substance:'water',volume:50,label:'Вода для нагрева'},x,356);if(stand&&burner&&beaker){world.selected=burner;renderInspector(true);toast('Установка собрана. Нажмите E, чтобы зажечь спиртовку.');}dirty=true;});
function reserveRegion(left,right){const conflict=world.bodies.filter(b=>!b.broken&&b.x+b.w/2>left&&b.x-b.w/2<right);if(inventory.filter(x=>!x).length<conflict.length){toast('Освободите центр стола или несколько ячеек инвентаря.');return false;}for(const b of conflict){updateIdentity(b);inventory[inventory.indexOf(null)]={kind:b.kind,mixture:clone(b.mixture),label:b.label,formula:b.formula,color:b.color,sealed:b.sealed};world.remove(b);}renderInventory();return true;}
function findSpace(width){for(const x of [650,480,900,300,1080,120])if(!world.bodies.some(b=>!b.broken&&Math.abs(b.x-x)<width/2+b.w/2))return x;return reserveRegion(550,750)?650:null;}

function newNote(title='',body=''){const note={id:`${Date.now()}-${Math.random().toString(16).slice(2,7)}`,title:title||`Наблюдение № ${notes.length+1}`,body,created:new Date().toISOString(),updated:new Date().toISOString()};notes.unshift(note);activeNote=note.id;dirty=true;renderNotes();save();return note;}
function renderNotes(){if(!notes.length)newNote();if(!notes.some(n=>n.id===activeNote))activeNote=notes[0].id;$('#note-count').textContent=notes.length;const list=$('#note-list');list.replaceChildren();for(const n of notes){const button=document.createElement('button');button.className=`note-list-item${n.id===activeNote?' active':''}`;button.innerHTML=`<b>${escape(n.title||'Без названия')}</b><small>${dateFormat(n.created)}</small>`;button.addEventListener('click',()=>{activeNote=n.id;renderNotes();});list.append(button);}const n=notes.find(n=>n.id===activeNote);$('#note-title').value=n.title;$('#note-body').value=n.body;$('#note-date').textContent=`ЗАПИСЬ ${String(notes.indexOf(n)+1).padStart(2,'0')} / ${dateFormat(n.created).toUpperCase()}`;}
let noteSaveTimer;function editNote(){const n=notes.find(n=>n.id===activeNote);if(!n)return;n.title=$('#note-title').value.slice(0,200);n.body=$('#note-body').value.slice(0,100000);n.updated=new Date().toISOString();dirty=true;$('#note-save-status').textContent='Сохраняется…';clearTimeout(noteSaveTimer);noteSaveTimer=setTimeout(()=>{const success=save();$('#note-save-status').textContent=success?'Сохранено':'Не удалось сохранить';const row=$('.note-list-item.active b');if(row)row.textContent=n.title||'Без названия';},450);}
$('#note-title').addEventListener('input',editNote);$('#note-body').addEventListener('input',editNote);$('#new-note').addEventListener('click',()=>{newNote();$('#note-title').focus();$('#note-title').select();});
let deletedNote=null;$('#delete-note').addEventListener('click',()=>{const index=notes.findIndex(n=>n.id===activeNote);if(index<0)return;deletedNote=notes.splice(index,1)[0];activeNote=notes[0]?.id;renderNotes();save();toast('Запись удалена. Ctrl+Z — восстановить.');});document.addEventListener('keydown',e=>{if(!document.querySelector('dialog[open]')&&(e.ctrlKey||e.metaKey)&&e.code==='KeyZ'&&deletedNote&&!e.target.matches('input,textarea')){e.preventDefault();notes.unshift(deletedNote);activeNote=deletedNote.id;deletedNote=null;renderNotes();save();toast('Запись восстановлена');}});
$('#save-observation').addEventListener('click',()=>{if(!events.length){toast('Сначала проведите опыт — наблюдений пока нет.');return;}const selected=world.selected;const text=`Дата: ${new Date().toLocaleString('ru-RU')}\n\n${selected&&!selected.broken?`Объект: ${selected.label}\n${describe(selected.mixture)}\nТемпература: ${fmt(selected.mixture.temperature)} °C\n\n`:''}Наблюдения:\n${events.slice(0,8).reverse().map(e=>`${e.title}\n${e.equation?e.equation+'\n':''}${e.description}`).join('\n\n')}\n\nВывод:\n`;newNote(events[0].title,text);setView('notebook');toast('Наблюдения сохранены. Дополните запись своими выводами.');});
$('#export-notes').addEventListener('click',()=>{const text=notes.map(n=>`${n.title}\n${'─'.repeat(30)}\n${new Date(n.created).toLocaleString('ru-RU')}\n\n${n.body}`).join('\n\n\n');const blob=new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Алхемия — дневник.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Дневник экспортирован в текстовый файл');});

$('#help-btn').addEventListener('click',()=>$('#help-dialog').showModal());$('#model-btn').addEventListener('click',()=>$('#model-dialog').showModal());$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){if(d.id==='mode-dialog'&&!course.chosenMode)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));$('#sound-btn').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('#sound-btn').innerHTML=soundEnabled?'♪':'♪<span class="sound-off">×</span>';$('#sound-btn').title=soundEnabled?'Выключить звук':'Включить звук';$('#sound-btn').setAttribute('aria-label',$('#sound-btn').title);if(soundEnabled)sound('pick');});

function save(){if(profileLoading)return true;try{localStorage.setItem(STORE,JSON.stringify({version:1,world:world.serialize(),inventory,notes,activeNote,events,discoveries:discoveries.serialize(),blackboard:board.serialize(),course:{...course.serialize(),mode:currentEdition},lessonAttempt:serializeAttempt(),lessonKitIds,savedAt:Date.now()}));$('#save-state').textContent='Сохранено на устройстве';dirty=false;lastSave=performance.now();return true;}catch{$('#save-state').textContent='Хранилище недоступно';return false;}}
function load(){
 try{
  const current=readJSON(STORE),legacy=!current?readJSON(OLD_STORE):null,data=current||legacy;
  if(!data||data.version!==1)return false;
  const importBench=!!current||currentEdition==='free';
  if(current&&data.course)course.restore(data.course);
  course.mode=currentEdition;
  board.restore(data.blackboard);
  if(importBench)discoveries.restore(data.discoveries);
  if(Array.isArray(data.notes))notes=data.notes.filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.body==='string').slice(0,1000);
  activeNote=data.activeNote;
  if(!importBench)return false;
  if(Array.isArray(data.inventory))inventory=Array.from({length:10},(_,i)=>{const x=data.inventory[i];return x&&typeof x==='object'&&(x.kind==='bottle'||EQUIPMENT.some(e=>e.id===x.kind))?x:null;});
  if(Array.isArray(data.events))events=data.events.filter(e=>e&&typeof e.title==='string'&&Number.isFinite(e.at)).slice(0,50);
  const restored=world.restore(data.world);
  lessonKitIds=Array.isArray(data.lessonKitIds)?data.lessonKitIds.filter(Number.isSafeInteger):[];
  if(current)restoreAttempt(data.lessonAttempt);
  return restored;
 }catch{return false;}
}
function clearProfileMemory(){
 world.clear();course.restore(null);course.mode=currentEdition;inventory=Array(10).fill(null);notes=[];events=[];activeNote=null;inspectorId=null;discoveries.records={};board.restore([]);lessonAttempt=null;lessonKitIds=[];hoveredBody=null;catalogPage=equipmentPage=0;
 clearTimeout(discoveryToastTimer);queuedDiscoveries.clear();deletedNote=null;clearTimeout(noteSaveTimer);
}
function renderProfile(){
 world.paused=false;$('#pause-overlay').hidden=true;$('#pause-btn').innerHTML='Ⅱ <span>Пауза</span>';renderInventory();renderCatalog();renderEquipment();renderNotes();scanResearch(true);renderInspector(true);renderEvents();researchUI.updateBadge();courseUI.render();refreshModeUI();
}

function updateIdentity(body){
 if(!body.capacity||body.broken)return;
 const identity=identifyMixture(body.mixture);body.identity=identity;body.product=identifyProduct(body.mixture);
 body.formula=body.product?.formula||identity.formula;
 body.label=identity.status==='empty'?(EQUIPMENT.find(e=>e.id===body.kind)?.name||'Пустая бутылочка'):(body.product?.name||(identity.status==='mixture'?'Смесь веществ':identity.name));
}
function announceDiscoveries(ids){
 if(!ids.length)return;ids.forEach(id=>queuedDiscoveries.add(id));researchUI.updateBadge();dirty=true;
 clearTimeout(discoveryToastTimer);discoveryToastTimer=setTimeout(()=>{const found=[...queuedDiscoveries];queuedDiscoveries.clear();toast('✧ Новое в энциклопедии: '+found.slice(0,3).map(id=>SUBSTANCES[id].formula).join(', ')+(found.length>3?' и ещё '+(found.length-3):''));},450);
}
function recordMixture(mix,context={},silent=false){const ids=discoveries.observe(mix,context);if(ids.length){researchUI.updateBadge();dirty=true;if(!silent)announceDiscoveries(ids);}return ids;}
function recordReaction(event){
 const reaction=REACTIONS.find(r=>r.id===event.reactionId);
 const productIds=reaction?Object.keys(reaction.products):event.type==='boil'?['steam']:[];
 const found=[];
 for(const id of productIds)if(discoveries.record(id,{kind:'reaction',equation:event.equation,source:event.title}))found.push(id);
 if(found.length)announceDiscoveries(found);
}
function scanResearch(silent=false){
 let inventoryChanged=false;
 for(const body of world.bodies){if(body.broken)continue;updateIdentity(body);recordMixture(body.mixture,{kind:'existing',source:'Исследовано на лабораторном столе'},silent);}
 for(const item of inventory){if(!item)continue;if(item.mixture){const identity=identifyMixture(item.mixture),label=identity.status==='empty'?(EQUIPMENT.find(e=>e.id===item.kind)?.name||'Пустая бутылочка'):(identifyProduct(item.mixture)?.name||identity.name);inventoryChanged ||= item.label!==label||item.formula!==identity.formula;item.label=label;item.formula=identity.formula;recordMixture(item.mixture,{kind:'existing',source:'Исследовано в инвентаре'},silent);}else if(item.substance)recordMixture(createMixture(item.substance,item.volume),{kind:'stock',source:'Исходный реактив в инвентаре'},silent);}
 for(const puddle of world.puddles)recordMixture(puddle.mixture,{kind:'existing',source:'Обнаружено в проливе на столе'},silent);
 researchUI.updateBadge();
 if(inventoryChanged)renderInventory();
}
function isBoardPoint(p){return p.x>=BOARD_RECT.x&&p.x<=BOARD_RECT.x+BOARD_RECT.w&&p.y>=BOARD_RECT.y&&p.y<=BOARD_RECT.y+BOARD_RECT.h;}
function openBoard(){if(world.held){toast('Сначала отпустите предмет правой кнопкой мыши.');return;}if(!$('#board-dialog').open){$('#board-dialog').showModal();board.present();}}
$('#open-board').addEventListener('click',openBoard);
$('#board-dialog').addEventListener('close',()=>{board.finish();save();});
$$('[data-chalk-color]').forEach(button=>button.addEventListener('click',()=>{board.color=button.dataset.chalkColor;board.setTool('chalk');$$('[data-chalk-color]').forEach(b=>b.classList.toggle('active',b===button));$('#board-eraser').classList.remove('active');$('#board-eraser').setAttribute('aria-pressed','false');}));
$('#chalk-width').addEventListener('input',event=>{board.width=Number(event.target.value);});
$('#board-eraser').addEventListener('click',()=>{board.setTool(board.tool==='eraser'?'chalk':'eraser');$('#board-eraser').classList.toggle('active',board.tool==='eraser');$('#board-eraser').setAttribute('aria-pressed',String(board.tool==='eraser'));$$('[data-chalk-color]').forEach(b=>b.classList.toggle('active',board.tool==='chalk'&&b.dataset.chalkColor===board.color));});
$('#board-undo').addEventListener('click',()=>board.undo());$('#board-redo').addEventListener('click',()=>board.redo());$('#board-clear').addEventListener('click',()=>{board.clear();toast('Доска очищена. ↶ — вернуть рисунок.');});
$('#board-dialog').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.code==='KeyZ'){event.preventDefault();event.stopPropagation();event.shiftKey?board.redo():board.undo();}});

function unlockHint(spec){
 const lesson=LESSONS.find(l=>(spec.substance?l.unlock.substances:l.unlock.equipment).includes(spec.substance||spec.kind));
 return lesson?'🔒 В опыте «'+lesson.title+'»':'🔒 Откроется по ходу обучения';
}
function migrateLegacyResources(){
 const substances=new Set(),equipment=new Set();
 const inspect=item=>{if(!item)return;equipment.add(item.kind);if(item.substance)substances.add(item.substance);for(const [id,n]of Object.entries(item.mixture?.amounts||{}))if(n>1e-7)substances.add(id);};
 world.bodies.forEach(inspect);inventory.forEach(inspect);
 Object.keys(discoveries.records).forEach(id=>substances.add(id));
 course.grantLegacy({substances:[...substances].filter(id=>SUBSTANCES[id]?.stock),equipment:[...equipment]});
}
function refreshModeUI(){
 $('#scene-mode').textContent=course.mode==='learning'?'ОБУЧЕНИЕ · СМОТРИ И ПРОБУЙ':'FREE · ВЕСЬ КАТАЛОГ';document.body.dataset.mode=course.mode;
 $('.experiment-card').hidden=true;$('.nav-tab[data-view=course]').hidden=course.mode==='free';
 $('#heat-setup-btn').disabled=!['burner','stand','beaker'].every(id=>course.hasEquipment(id));
 courseUI?.renderCoach();
}
function changeMode(mode){
 if(!validEdition(mode))return;
 if(mode!==currentEdition){
  save();profileLoading=true;currentEdition=mode;STORE='alchemia-v4-'+mode;clearProfileMemory();if(!load())resetTable();profileLoading=false;
 }
 course.setMode(mode);try{localStorage.setItem('alchemia-v4-edition',JSON.stringify(mode));}catch{}
 renderProfile();setView('table');save();
 if(mode==='learning'&&!lessonAttempt&&!course.status().complete){course.markRead();prepareLesson(course.lesson());}
}

function courseChanged(){
 if(lessonAttempt?.lessonId!==course.activeLessonId)lessonAttempt=null;
 dirty=true;courseUI?.renderCoach();save();
}
function prepareLesson(lesson){
 const problem=lessonSetupProblem(lesson,course);
 if(problem){toast(problem);return;}
 const setup=lesson.practice.setup,kitSize=1+Number(!!setup.donor)+Number(!!setup.heater)+Number(setup.heater==='burner');
 if(world.bodies.filter(b=>!b.broken&&!lessonKitIds.includes(b.id)).length+kitSize>35){toast('Освободите место на столе перед подготовкой опыта.');return;}
 world.release();
 for(const body of [...world.bodies])if(lessonKitIds.includes(body.id))world.remove(body);
 world.particles=world.particles.filter(p=>!lessonKitIds.includes(p.sourceId));lessonKitIds=[];lessonAttempt=null;
 if(!reserveRegion(380,740))return;
 setView('table');
 lessonAttempt=createLessonSetup(world,lesson,course);lessonKitIds=lessonAttempt.createdIds||[lessonAttempt.receiver.id,lessonAttempt.donor?.id,lessonAttempt.heater?.id].filter(Boolean);
 world.paused=false;$('#pause-overlay').hidden=true;$('#pause-btn').innerHTML='Ⅱ <span>Пауза</span>';
 scanResearch();renderInspector(true);updateHold();courseUI.renderCoach();save();
 fitCanvas();
 const kind=lesson.practice.setup.kind;
 toast(kind==='inspect'?'Возьмите сосуд с образцом левой кнопкой мыши и прочитайте правую панель.':kind==='heat'?'Установка готова. Нажмите E, чтобы включить нагрев.':'Бутылочка в руке. Плавно наклоните её колесом или D над стаканом.');
}
function recordPractice(event){
 if(course.mode!=='learning'||!lessonAttempt||course.activeLessonId!==lessonAttempt.lessonId||course.status().practice)return;
 if(course.recordPractice(event)){
  if(lessonAttempt?.receiver&&!lessonAttempt.receiver.broken){world.selected=lessonAttempt.receiver;renderInspector(true);}
  dirty=true;courseUI.renderCoach();if(activeView==='course')courseUI.render();save();
  toast('Получилось! Объяснение и следующий опыт — справа.');
 }
}
function checkLessonPractice(){
 if(course.mode!=='learning'||!lessonAttempt||course.activeLessonId!==lessonAttempt.lessonId)return;
 for(const event of observeLessonSetup(world,lessonAttempt))recordPractice(event);
}
function serializeAttempt(){
 if(!lessonAttempt)return null;
 const a=lessonAttempt;
 return {lessonId:a.lessonId,receiverId:a.receiver.id,donorId:a.donor?.id,heaterId:a.heater?.id,donorSubstance:a.donorSubstance,initialVolume:a.initialVolume,startTime:a.startTime};
}
function restoreAttempt(saved){
 lessonAttempt=null;
 if(!saved||course.mode!=='learning'||saved.lessonId!==course.activeLessonId||course.lesson()?.practice.type!=='lab')return;
 const receiver=world.bodies.find(b=>b.id===saved.receiverId);
 if(!receiver)return;
 lessonAttempt={lessonId:saved.lessonId,receiver,donor:world.bodies.find(b=>b.id===saved.donorId)||null,heater:world.bodies.find(b=>b.id===saved.heaterId)||null,donorSubstance:course.lesson().practice.setup?.donor?.substance,initialVolume:Number.isFinite(saved.initialVolume)?saved.initialVolume:volume(receiver.mixture),startTime:world.time};
}
function saveLessonNote(lesson,text,open=true){
 const existing=notes.find(n=>n.lessonId===lesson.id);
 const report=`Тема: ${lesson.title}\n\nЧто я узнал(а):\n${lesson.remember}\n\nИсследовательский вопрос:\n${lesson.notebookPrompt}\n\nПрактика: ${lesson.practice.title}\n${lesson.practice.instructions.join('\n')}\n\nМой вывод:\n${text.trim()}\n\nСледующий вопрос:\n`;
 if(existing){
  if(existing.body===existing.courseGeneratedBody){existing.body=report;existing.courseGeneratedBody=report;}
  else if(existing.courseConclusion!==text.trim())existing.body+='\n\nДополнение к выводу по уроку:\n'+text.trim();
  existing.courseConclusion=text.trim();existing.updated=new Date().toISOString();activeNote=existing.id;
 }else{const note=newNote('Исследование · '+lesson.title,report);note.lessonId=lesson.id;note.courseGeneratedBody=report;note.courseConclusion=text.trim();}
 renderNotes();save();
 if(open){setView('notebook');toast('Исследование сохранено в дневнике. Дополните запись своими вопросами.');}
}
function completeLesson(result){
 const lesson=course.lesson();
 renderCatalog();renderEquipment();refreshModeUI();save();
 const names=[...(result.unlocked?.substances||[]).map(id=>SUBSTANCES[id]?.name),...(result.unlocked?.equipment||[]).map(id=>EQUIPMENT.find(e=>e.id===id)?.name)].filter(Boolean);
 toast(names.length?'Тема пройдена. Открыто: '+names.join(', '):'Опыт пройден. Можно переходить к следующему.');
}

function fitCanvas(){
 const frame=$('#canvas-frame'),w=Math.max(1,frame.clientWidth-2),h=Math.max(1,frame.clientHeight-2);
 if(!w||!h||activeView!=='table')return;
 const width=Math.min(w,h*1200/620);
 canvas.style.width=width+'px';canvas.style.height=(width*620/1200)+'px';
}
function syncFullscreen(){
 const active=!!document.fullscreenElement||document.body.classList.contains('immersive');
 const button=$('#fullscreen-btn');button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',active?'Выйти из полного экрана':'Полный экран');button.innerHTML=active?'⤡ <span>Выйти</span>':'⛶ <span>Полный экран</span>';
 requestAnimationFrame(fitCanvas);
}
async function toggleFullscreen(){
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.body.classList.contains('immersive'))document.body.classList.remove('immersive');
  else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
  else throw new Error('unsupported');
 }catch{
  document.body.classList.add('immersive');toast('Игра развёрнута в окно браузера. F11 включает полный экран браузера.');
 }
 syncFullscreen();
}
$('#fullscreen-btn').addEventListener('click',toggleFullscreen);
document.addEventListener('fullscreenchange',syncFullscreen);
new ResizeObserver(fitCanvas).observe($('#canvas-frame'));
let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{fitCanvas();renderCatalog();renderEquipment();});});

courseUI=new CourseUI(course,{onMode:changeMode,onPrepare:prepareLesson,onNote:saveLessonNote,onChange:courseChanged,onView:setView,onComplete:completeLesson});
course.mode=currentEdition;loaded=load();if(!loaded)resetTable();if(ENTRY_EDITION)course.setMode(currentEdition);profileLoading=false;renderProfile();save();if(!course.chosenMode)courseUI.showModeChoice();else if(currentEdition==='learning'&&!lessonAttempt&&!course.status().complete){course.markRead();prepareLesson(course.lesson());}
$('#chemistry-sources').innerHTML=`<span>${Object.keys(SUBSTANCES).length} веществ · ${REACTIONS.length} реакций · ${LESSONS.length} уроков</span><a href="https://openstax.org/details/books/chemistry-2e" target="_blank" rel="noopener">OpenStax: общая химия ↗</a><a href="https://openstax.org/details/books/organic-chemistry" target="_blank" rel="noopener">OpenStax: органическая химия ↗</a><a href="https://edu.rsc.org/experiments/microscale-reactions-of-positive-ions-with-sodium-hydroxide/757.article" target="_blank" rel="noopener">RSC: осадки ↗</a><a href="https://chemed.chem.purdue.edu/demos/demosheets/9.11.html" target="_blank" rel="noopener">Purdue: вытеснение металлов ↗</a><a href="https://edu.rsc.org/experiments/indicators-and-dry-ice-demonstration/703.article" target="_blank" rel="noopener">RSC: индикаторы ↗</a>`;
let previous=performance.now();function frame(now){const dt=Math.min((now-previous)/1000,.04);previous=now;if(activeView==='table'&&!document.hidden&&!document.querySelector('dialog[open]'))world.step(dt);renderer.draw(world,{showHints:true,blackboardCanvas:board.surface,boardHovered,hovered:hoveredBody,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});if(now-lastInspector>300){scanResearch();checkLessonPractice();renderInspector();updateHold();lastInspector=now;}if(now-lastSave>6000){save();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();previous=performance.now();});
