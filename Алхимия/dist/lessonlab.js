import {SUBSTANCES,volume} from './chemistry.js';
import {EQUIPMENT} from './physics.js';

// Free mode exposes the whole catalog; learning exposes the current course kit.
// Existing physical samples may be moved; fresh supplies pass through this gate.
export function supplyAllowed(spec,progress){
 if(!spec||!progress.hasEquipment(spec.kind||'bottle'))return false;
 return !spec.substance||(Object.hasOwn(SUBSTANCES,spec.substance)&&progress.hasSubstance(spec.substance));
}
export function lessonSetupProblem(lesson,progress){
 const setup=lesson?.practice?.setup;
 if(progress.mode!=='learning')return 'Учебные установки доступны в режиме обучения.';
 if(!lesson||lesson.id!==progress.activeLessonId||!progress.canAccess(lesson.id))return 'Сначала выберите доступный урок.';
 if(!progress.status(lesson.id).read)return 'Сначала начните опыт кнопкой «Подготовить опыт».';
 if(!setup)return 'В этом уроке используется задача, а не установка на столе.';
 const specs=[setup.receiver,setup.donor?{kind:'bottle',...setup.donor}:null,setup.heater?{kind:setup.heater}:null,setup.heater==='burner'?{kind:'stand'}:null].filter(Boolean);
 if(specs.some(spec=>!supplyAllowed(spec,progress)))return 'Для установки ещё не открыты нужные вещества или приборы.';
 return null;
}

/** Caller reserves the central work area before creating this small real setup. */
export function createLessonSetup(world,lesson,progress){
 const problem=lessonSetupProblem(lesson,progress);
 if(problem)throw new Error(problem);
 const setup=lesson.practice.setup,x=600,receiverSpec=EQUIPMENT.find(e=>e.id===setup.receiver.kind);
 let bottom=490;
 let heater=null;const createdIds=[];
 if(setup.heater==='burner'){
  createdIds.push(world.create('stand',x,425,{label:'Учебная подставка'}).id);
  heater=world.create('burner',x,458);
  bottom=397;
 }else if(setup.heater==='hotplate'){
  heater=world.create('hotplate',x,470);
  bottom=450;
 }
 const receiver=world.create(setup.receiver.kind,x,bottom-receiverSpec.h/2,{...setup.receiver,sealed:false});
 const donor=setup.donor?world.create('bottle',480,340,{...setup.donor,sealed:false}):null;
 if(donor){world.grab(donor);world.move(540,bottom-receiverSpec.h-90);}
 else if(heater)world.selected=heater;
 else world.selected=null;
 createdIds.push(...[receiver,donor,heater].filter(Boolean).map(body=>body.id));
 return {lessonId:lesson.id,receiver,donor,donorSubstance:setup.donor?.substance,heater,createdIds,initialVolume:volume(receiver.mixture),startTime:world.time};
}

export function observeLessonSetup(world,attempt){
 if(!attempt||attempt.receiver.broken||!world.bodies.includes(attempt.receiver))return [];
 const b=attempt.receiver,events=[];
 if(world.selected===b){
  for(const [id,n] of Object.entries(b.mixture.amounts||{}))if(n>1e-7)events.push({type:'inspect',substance:id});
 }
 const added=attempt.donor?(b.receivedFrom?.[attempt.donor.id]||0):0;
 if(added>0&&attempt.donor)events.push({type:'pour',substance:attempt.donorSubstance,volume:added});
 if(b.heat>0)for(const [id,n]of Object.entries(b.mixture.amounts||{}))if(n>1e-7)events.push({type:'heat',substance:id,temperature:b.mixture.temperature});
 return events;
}
