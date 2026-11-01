import {SUBSTANCES,REACTIONS} from './chemistry.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={liquid:'Жидкость',aqueous:'Водный раствор',solid:'Твёрдое вещество',gas:'Газ'};
export class ResearchUI {
  constructor(book){
    this.book=book;this.selected=null;this.filter='all';
    document.querySelector('#encyclopedia-search').addEventListener('input',()=>this.render());
    document.querySelectorAll('[data-research-filter]').forEach(button=>button.addEventListener('click',()=>{this.filter=button.dataset.researchFilter;document.querySelectorAll('[data-research-filter]').forEach(b=>b.classList.toggle('active',b===button));this.render();}));
  }
  updateBadge(){document.querySelector('#discovery-count').textContent=this.book.count;}
  select(id){if(this.book.records[id]){this.selected=id;this.filter='all';document.querySelector('#encyclopedia-search').value='';document.querySelectorAll('[data-research-filter]').forEach(b=>b.classList.toggle('active',b.dataset.researchFilter==='all'));this.render();}}
  render(){
    this.updateBadge();
    const records=Object.values(this.book.records),total=Object.keys(SUBSTANCES).length;
    document.querySelector('#research-total').textContent=`${records.length} / ${total}`;
    document.querySelector('#research-meter-fill').style.width=`${records.length/total*100}%`;
    document.querySelector('#research-synthesized').textContent=records.filter(r=>r.synthesis).length;
    const query=document.querySelector('#encyclopedia-search').value.trim().toLocaleLowerCase('ru-RU');
    const list=records.filter(r=>{const s=SUBSTANCES[r.id];return (!query||`${s.name} ${s.formula}`.toLocaleLowerCase('ru-RU').includes(query))&&(this.filter==='all'||this.filter==='reaction'&&r.synthesis||this.filter==='stock'&&r.kind==='stock');}).sort((a,b)=>b.at-a.at||SUBSTANCES[a.id].name.localeCompare(SUBSTANCES[b.id].name,'ru'));
    const host=document.querySelector('#discovery-grid');host.replaceChildren();
    if(!list.length)host.innerHTML='<div class="discovery-empty">Пока нет подходящих открытий.<br>Возьмите вещество из шкафа или проведите опыт.</div>';
    if(!list.some(r=>r.id===this.selected))this.selected=list[0]?.id||null;
    for(const record of list){const s=SUBSTANCES[record.id],button=document.createElement('button');button.className=`discovery-card${record.id===this.selected?' active':''}`;button.dataset.substance=record.id;button.setAttribute('aria-pressed',String(record.id===this.selected));button.innerHTML=`<small>${escape(s.category)}</small><span class="discovery-card-formula">${escape(s.formula)}</span><b>${escape(s.name)}</b><span class="discovery-card-method${record.synthesis?' synthesized':''}">${record.synthesis?'✧ Получено в опыте':record.kind==='stock'?'↗ Исследовано из шкафа':'◦ Исследовано на столе'}</span>`;button.addEventListener('click',()=>{this.selected=record.id;this.render();if(matchMedia('(max-width:750px)').matches)document.querySelector('#discovery-detail').scrollIntoView({block:'start',behavior:'smooth'});});host.append(button);}
    this.renderDetail();
  }
  renderDetail(){
    const host=document.querySelector('#discovery-detail'),s=SUBSTANCES[this.selected],record=this.book.records[this.selected];
    if(!s||!record){host.innerHTML='<div class="entry-empty">У каждого вещества<br>есть своя история.<br>Откройте первую.</div>';return;}
    const detail=(Array.isArray(s.details)?s.details:typeof s.details==='string'?[s.details]:[s.description]).filter(p=>p!==s.description&&p!==s.sourcing);
    const recipes=REACTIONS.filter(r=>r.products[s.id]).slice(0,3);
    const sourcing=!s.stock&&recipes.length?'В симуляторе вещество образуется в следующих реакциях.':s.sourcing||(s.stock?'Доступно в шкафу исходных веществ.':'Получается в ходе химической реакции.');
    const uses=Array.isArray(s.uses)?s.uses:typeof s.uses==='string'?[s.uses]:[];
    const props=Object.entries(s.properties||{}).filter(([key,value])=>typeof value==='string'&&value.length<100&&!['state','molarMass','molarMassUnit'].includes(key)).slice(0,4);
    const labels={appearance:'Внешний вид',solubility:'Растворимость',behavior:'Особенность',classification:'Класс',color:'Цвет',density:'Плотность',concentration:'Исходная концентрация'};
    host.innerHTML=`<div class="eyebrow">КАРТОЧКА ИССЛЕДОВАТЕЛЯ / ${String(Object.keys(SUBSTANCES).indexOf(s.id)+1).padStart(2,'0')}</div><div class="entry-formula">${escape(s.formula)}</div><h2>${escape(s.name)}</h2><p>${escape(s.description)}</p><dl class="entry-props"><div><dt>Форма в симуляторе</dt><dd>${escape(states[s.state]||s.state)}</dd></div><div><dt>Молярная масса</dt><dd>${Number.isFinite(s.molarMass)?s.molarMass.toLocaleString('ru-RU',{maximumFractionDigits:3})+' г/моль':'—'}</dd></div>${props.map(([k,v])=>`<div><dt>${escape(labels[k]||k)}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl><h3>ЧТО ЭТО ЗА ВЕЩЕСТВО</h3>${detail.map(p=>`<p>${escape(p)}</p>`).join('')}${uses.length?`<h3>ГДЕ ВСТРЕЧАЕТСЯ И ЗАЧЕМ НУЖНО</h3><ul class="entry-use-list">${uses.map(u=>`<li>${escape(u)}</li>`).join('')}</ul>`:''}<h3>ПОЛУЧЕНИЕ В ИГРЕ</h3><p>${escape(sourcing)}</p>${recipes.map(r=>`<p class="entry-equation">${escape(r.equation)}${r.minTemp?`<br><small>Условие модели: нагрев от ${r.minTemp} °C.</small>`:''}</p>`).join('')}<div class="entry-observation"><div class="eyebrow">ВАШЕ ОТКРЫТИЕ</div><p>${escape(record.source)}</p>${record.equation?`<p class="entry-equation">${escape(record.equation)}</p>`:''}${record.synthesis&&record.kind!=='reaction'?`<p>Также получено в собственном опыте.</p><p class="entry-equation">${escape(record.synthesis.equation)}</p>`:''}<span class="entry-date">${new Date(record.at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</span></div>`;
  }
}
