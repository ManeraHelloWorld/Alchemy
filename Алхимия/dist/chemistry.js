/**
 * A deliberately bounded aqueous chemistry model.
 * amounts are mmol, water has a molar volume of 0.018015 mL/mmol.
 * Stock concentrations are mol/L (numerically mmol/mL). Molecular species
 * represent the corresponding dissolved ions. Rates are accelerated for play.
 */
const WATER_ML = 0.018015;
const GAS_R = 0.082057; // mL·atm / (mmol·K)
const EPS = 1e-8;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const substance = (id, name, formula, color, state, category, description, extra={}) => ({id,name,formula,color,state,category,description,stock:true,...extra});

export const SUBSTANCES = {
  water: substance('water','Дистиллированная вода','H₂O','#82cbd1','liquid','Растворители','Чистая вода. Растворитель; при атмосферном давлении кипит около 100 °C.',{atoms:{H:2,O:1},molarMass:18.015}),
  hcl: substance('hcl','Соляная кислота','HCl','#d6dfb8','aqueous','Кислоты','Водный раствор 0,5 моль/л. Сильная кислота: нейтрализует основания и реагирует с карбонатами.',{concentration:.5,atoms:{H:1,Cl:1},molarMass:36.46}),
  naoh: substance('naoh','Гидроксид натрия','NaOH','#b9ced4','aqueous','Основания','Водный раствор 0,5 моль/л. Сильное основание; окрашивает фенолфталеин в розовый цвет.',{concentration:.5,atoms:{Na:1,O:1,H:1},molarMass:40}),
  cuso4: substance('cuso4','Сульфат меди(II)','CuSO₄','#249cce','aqueous','Соли','Голубой водный раствор 0,2 моль/л. Ионы меди дают осадок со щёлочью.',{concentration:.2,atoms:{Cu:1,S:1,O:4},molarMass:159.61,tint:6}),
  iron: substance('iron','Железо','Fe','#7c8390','solid','Элементы','Металлические гранулы. Вытесняют медь из раствора её соли. Реакции поверхности ускорены.',{molarVolume:.0071,atoms:{Fe:1},molarMass:55.845}),
  sodium_bicarbonate: substance('sodium_bicarbonate','Гидрокарбонат натрия','NaHCO₃','#e8e4ce','aqueous','Соли','Водный раствор 0,4 моль/л. С кислотой выделяет углекислый газ.',{concentration:.4,atoms:{Na:1,H:1,C:1,O:3},molarMass:84.007}),
  acetic_acid: substance('acetic_acid','Уксусная кислота','CH₃COOH','#d6c895','aqueous','Кислоты','Водный раствор 0,5 моль/л. Слабая кислота; pH зависит от диссоциации и разбавления.',{concentration:.5,atoms:{C:2,H:4,O:2},molarMass:60.052}),
  sodium_chloride: substance('sodium_chloride','Хлорид натрия','NaCl','#dce1da','aqueous','Соли','Водный раствор 0,5 моль/л. Простое смешивание с водой не создаёт нового вещества.',{concentration:.5,atoms:{Na:1,Cl:1},molarMass:58.44}),
  calcium_carbonate: substance('calcium_carbonate','Карбонат кальция','CaCO₃','#e7dfc5','solid','Соли','Мел, практически нерастворимый в воде. Растворяется в кислоте с выделением CO₂.',{molarVolume:.0369,atoms:{Ca:1,C:1,O:3},molarMass:100.09}),
  phenolphthalein: substance('phenolphthalein','Фенолфталеин','C₂₀H₁₄O₄','#d57dba','aqueous','Индикаторы','Разбавленный индикатор. Бесцветен в кислой среде, розовый при pH примерно 8,2–10. Растворитель индикатора упрощён.',{concentration:.0001,atoms:{C:20,H:14,O:4},molarMass:318.32}),
  copper: substance('copper','Медь','Cu','#c9794d','solid','Элементы','Красноватый металл. Не вытесняет железо или цинк из их солей; с разбавленной HCl не реагирует.',{molarVolume:.0071,atoms:{Cu:1},molarMass:63.546}),
  zinc: substance('zinc','Цинк','Zn','#adb6b4','solid','Элементы','Металлические гранулы. Вытесняют медь из раствора сульфата меди.',{molarVolume:.0092,atoms:{Zn:1},molarMass:65.38}),
  sodium_carbonate: substance('sodium_carbonate','Карбонат натрия','Na₂CO₃','#d1d8bf','aqueous','Соли','Водный раствор 0,3 моль/л. Щелочная среда; с солями кальция образует белый осадок.',{concentration:.3,atoms:{Na:2,C:1,O:3},molarMass:105.99}),
  calcium_chloride: substance('calcium_chloride','Хлорид кальция','CaCl₂','#b9c7b5','aqueous','Соли','Водный раствор 0,3 моль/л. Источник ионов кальция для реакции осаждения.',{concentration:.3,atoms:{Ca:1,Cl:2},molarMass:110.98}),
  iron_sulfate: substance('iron_sulfate','Сульфат железа(II)','FeSO₄','#91bba1','aqueous','Соли','Светло-зелёный водный раствор 0,2 моль/л. Со щёлочью образует зеленоватый осадок.',{concentration:.2,atoms:{Fe:1,S:1,O:4},molarMass:151.91,tint:3}),
  copper_oxide: substance('copper_oxide','Оксид меди(II)','CuO','#393d40','solid','Оксиды','Чёрный порошок. Основный оксид: растворяется в соляной кислоте.',{molarVolume:.0126,atoms:{Cu:1,O:1},molarMass:79.545}),
  magnesium_sulfate: substance('magnesium_sulfate','Сульфат магния','MgSO₄','#d2d9d3','aqueous','Соли','Водный раствор 0,2 моль/л. Со щёлочью образует белый осадок гидроксида магния.',{concentration:.2,atoms:{Mg:1,S:1,O:4},molarMass:120.37}),
  bromothymol_blue: substance('bromothymol_blue','Бромтимоловый синий','C₂₇H₂₈Br₂O₅S','#438b98','aqueous','Индикаторы','Индикатор: жёлтый в кислой среде, зелёный около нейтральной, синий в щелочной.',{concentration:.0001,atoms:{C:27,H:28,Br:2,O:5,S:1},molarMass:624.38,shortSymbol:'BTB'}),
};

const products = [
 ['copper_hydroxide','Гидроксид меди(II)','Cu(OH)₂','#69c6db','solid',{Cu:1,O:2,H:2},97.56,.0289],
 ['iron_hydroxide','Гидроксид железа(II)','Fe(OH)₂','#668a6b','solid',{Fe:1,O:2,H:2},89.86,.0264],
 ['magnesium_hydroxide','Гидроксид магния','Mg(OH)₂','#eeeadd','solid',{Mg:1,O:2,H:2},58.32,.0247],
 ['sodium_sulfate','Сульфат натрия','Na₂SO₄','#d8dfdb','aqueous',{Na:2,S:1,O:4},142.04],
 ['sodium_acetate','Ацетат натрия','CH₃COONa','#e4dcc7','aqueous',{C:2,H:3,O:2,Na:1},82.034],
 ['calcium_acetate','Ацетат кальция','Ca(CH₃COO)₂','#dedbc9','aqueous',{Ca:1,C:4,H:6,O:4},158.166],
 ['copper_chloride','Хлорид меди(II)','CuCl₂','#69b6b8','aqueous',{Cu:1,Cl:2},134.45],
 ['iron_chloride','Хлорид железа(II)','FeCl₂','#8eb39a','aqueous',{Fe:1,Cl:2},126.75],
 ['zinc_sulfate','Сульфат цинка','ZnSO₄','#d7dfe0','aqueous',{Zn:1,S:1,O:4},161.44],
 ['zinc_chloride','Хлорид цинка','ZnCl₂','#d5dfdf','aqueous',{Zn:1,Cl:2},136.28],
 ['carbon_dioxide','Углекислый газ','CO₂','#c1d2cf','gas',{C:1,O:2},44.01],
 ['hydrogen','Водород','H₂','#c9e1db','gas',{H:2},2.016],
 ['steam','Водяной пар','H₂O(g)','#c5d9d7','gas',{H:2,O:1},18.015],
];
for(const [id,name,formula,c,state,atoms,molarMass,molarVolume] of products) {
 SUBSTANCES[id] = substance(id,name,formula,c,state,'Продукты реакции','Продукт химической реакции.',{stock:false,atoms,molarMass,molarVolume,tint:state==='aqueous' && id.includes('copper')?4:1});
}

// Additional feedstocks and reachable products. No inert decorative product
// is marked as craftable: reachability is checked in the test suite.
const expanded = [
 ['sulfuric_acid','Серная кислота','H₂SO₄','#ced8b7','aqueous','Кислоты',{H:2,S:1,O:4},98.079,true,.25],
 ['magnesium','Магний','Mg','#c5ccd0','solid','Элементы',{Mg:1},24.305,true,0,.014],
 ['calcium_oxide','Оксид кальция','CaO','#dcd6b6','solid','Оксиды',{Ca:1,O:1},56.077,true,0,.0168],
 ['hydrogen_peroxide','Пероксид водорода','H₂O₂','#9ac9d0','aqueous','Особые реактивы',{H:2,O:2},34.015,true,.3],
 ['manganese_dioxide','Оксид марганца(IV)','MnO₂','#393735','solid','Оксиды',{Mn:1,O:2},86.937,true,0,.0173],
 ['iron3_oxide','Оксид железа(III)','Fe₂O₃','#a65e3d','solid','Оксиды',{Fe:2,O:3},159.687,true,0,.0305],
 ['potassium_hydroxide','Гидроксид калия','KOH','#b8d2c6','aqueous','Основания',{K:1,O:1,H:1},56.106,true,.5],
 ['phosphoric_acid','Ортофосфорная кислота','H₃PO₄','#d9d0a2','aqueous','Кислоты',{H:3,P:1,O:4},97.994,true,.2],
 ['silica','Диоксид кремния','SiO₂','#c9c3a9','solid','Оксиды',{Si:1,O:2},60.084,true,0,.0227],
 ['glucose','Глюкоза','C₆H₁₂O₆','#e1d9bb','aqueous','Органические вещества',{C:6,H:12,O:6},180.156,true,.2],
 ['potassium_chloride','Хлорид калия','KCl','#dce2d7','aqueous','Соли',{K:1,Cl:1},74.551,false],
 ['potassium_sulfate','Сульфат калия','K₂SO₄','#d7dfcd','aqueous','Соли',{K:2,S:1,O:4},174.259,false],
 ['magnesium_chloride','Хлорид магния','MgCl₂','#d1dbd5','aqueous','Соли',{Mg:1,Cl:2},95.211,false],
 ['magnesium_oxide','Оксид магния','MgO','#ece6d6','solid','Оксиды',{Mg:1,O:1},40.304,false,0,.0113],
 ['calcium_hydroxide','Гидроксид кальция','Ca(OH)₂','#e5e1ce','solid','Основания',{Ca:1,O:2,H:2},74.093,false,0,.0335],
 ['calcium_sulfate','Сульфат кальция','CaSO₄','#dedccc','solid','Соли',{Ca:1,S:1,O:4},136.14,false,0,.046],
 ['zinc_hydroxide','Гидроксид цинка','Zn(OH)₂','#d9e1dc','solid','Основания',{Zn:1,O:2,H:2},99.395,false,0,.0325],
 ['zinc_oxide','Оксид цинка','ZnO','#e6dfbf','solid','Оксиды',{Zn:1,O:1},81.379,false,0,.0145],
 ['iron3_chloride','Хлорид железа(III)','FeCl₃','#bfa448','aqueous','Соли',{Fe:1,Cl:3},162.204,false],
 ['iron3_hydroxide','Гидроксид железа(III)','Fe(OH)₃','#a36b42','solid','Основания',{Fe:1,O:3,H:3},106.866,false,0,.031],
 ['iron3_sulfate','Сульфат железа(III)','Fe₂(SO₄)₃','#c0a568','aqueous','Соли',{Fe:2,S:3,O:12},399.88,false],
 ['sodium_dihydrogen_phosphate','Дигидрофосфат натрия','NaH₂PO₄','#dce3cf','aqueous','Соли',{Na:1,H:2,P:1,O:4},119.977,false],
 ['disodium_hydrogen_phosphate','Гидрофосфат натрия','Na₂HPO₄','#d8dfcf','aqueous','Соли',{Na:2,H:1,P:1,O:4},141.958,false],
 ['trisodium_phosphate','Фосфат натрия','Na₃PO₄','#d4dfc8','aqueous','Соли',{Na:3,P:1,O:4},163.94,false],
 ['calcium_phosphate','Фосфат кальция','Ca₃(PO₄)₂','#ede5cd','solid','Соли',{Ca:3,P:2,O:8},310.174,false,0,.099],
 ['magnesium_phosphate','Фосфат магния','Mg₃(PO₄)₂','#e5e3d6','solid','Соли',{Mg:3,P:2,O:8},262.858,false,0,.122],
 ['oxygen','Кислород','O₂','#acd5df','gas','Газы',{O:2},31.998,false],
 ['copper_phosphate','Фосфат меди(II)','Cu₃(PO₄)₂','#5baebf','solid','Соли',{Cu:3,P:2,O:8},380.581,false,0,.096],
 ['zinc_phosphate','Фосфат цинка','Zn₃(PO₄)₂','#e7e2d6','solid','Соли',{Zn:3,P:2,O:8},386.081,false,0,.097],
 ['potassium_acetate','Ацетат калия','CH₃COOK','#e4ddc8','aqueous','Соли',{C:2,H:3,O:2,K:1},98.142,false],
 ['magnesium_acetate','Ацетат магния','Mg(CH₃COO)₂','#ddd9c6','aqueous','Соли',{Mg:1,C:4,H:6,O:4},142.393,false],
 ['zinc_acetate','Ацетат цинка','Zn(CH₃COO)₂','#dddccf','aqueous','Соли',{Zn:1,C:4,H:6,O:4},183.468,false],
 ['sodium_bisulfate','Гидросульфат натрия','NaHSO₄','#d6dac7','aqueous','Соли',{Na:1,H:1,S:1,O:4},120.06,false],
];
for(const [id,name,formula,c,state,category,atoms,molarMass,stock,concentration,molarVolume] of expanded) {
 SUBSTANCES[id]=substance(id,name,formula,c,state,category,'',{atoms,molarMass,stock,concentration,molarVolume,tint:id.startsWith('iron3_')&&state==='aqueous'?4:1});
}
// These salts/oxides now form a discovery chain rather than a cabinet shortcut.
for(const id of ['sodium_carbonate','calcium_chloride','iron_sulfate','copper_oxide','magnesium_sulfate'])SUBSTANCES[id].stock=false;

// Material colours, not decorative reagent-category tints. An aqueous salt's
// colour describes its solution; the colour of a dry residue is separate.
const CLEAR_COLOR='#e6f2f2';
const dissolvedColours={
 cuso4:['#268dcc',5.5],copper_chloride:['#388fc1',5.5],
 iron_sulfate:['#b7d2b2',2.2],iron_chloride:['#b7d2b2',2.2],
 iron3_chloride:['#c99a38',4],iron3_sulfate:['#c99a38',4]
};
const whiteSolids=['calcium_carbonate','magnesium_hydroxide','calcium_oxide','magnesium_oxide','calcium_hydroxide','calcium_sulfate','zinc_hydroxide','zinc_oxide','calcium_phosphate','magnesium_phosphate','zinc_phosphate','silica'];
for(const s of Object.values(SUBSTANCES)) {
 if(['aqueous','liquid','gas'].includes(s.state))s.color=CLEAR_COLOR;
 if(dissolvedColours[s.id]){[s.color,s.opticalStrength]=dissolvedColours[s.id];s.solutionColor=s.color;}
 if(whiteSolids.includes(s.id))s.color='#eeeDE7';
 if(s.state==='aqueous')s.residueColor=dissolvedColours[s.id]?s.color:'#eeeDE7';
}
SUBSTANCES.copper_hydroxide.color='#79bdda';
SUBSTANCES.iron_hydroxide.color='#94ab87';
SUBSTANCES.iron3_hydroxide.color='#a5673d';
SUBSTANCES.copper_phosphate.color='#6faec2';

const reaction = (id,title,equation,reactants,products,type='reaction',extra={}) => ({id,title,equation,reactants,products,type,aqueous:true,rate:2.2,...extra});
export const REACTIONS = [
 reaction('neutralization','Нейтрализация','HCl + NaOH → NaCl + H₂O',{hcl:1,naoh:1},{sodium_chloride:1,water:1},'reaction',{heat:57.1,description:'Кислота и щёлочь расходуются в отношении 1:1. Выделяется тепло.'}),
 reaction('acetate','Нейтрализация слабой кислоты','CH₃COOH + NaOH → CH₃COONa + H₂O',{acetic_acid:1,naoh:1},{sodium_acetate:1,water:1},'reaction',{heat:55,description:'Получается ацетат натрия. Вблизи точки нейтрализации раствор может оставаться слабощелочным.'}),
 reaction('carbonate_first','Протонирование карбоната','Na₂CO₃ + HCl → NaHCO₃ + NaCl',{sodium_carbonate:1,hcl:1},{sodium_bicarbonate:1,sodium_chloride:1},'reaction',{rate:3,description:'Первая ступень: карбонат переходит в гидрокарбонат.'}),
 reaction('bicarbonate_acid','Выделяется углекислый газ','NaHCO₃ + HCl → NaCl + CO₂↑ + H₂O',{sodium_bicarbonate:1,hcl:1},{sodium_chloride:1,carbon_dioxide:1,water:1},'gas',{rate:1.4,description:'Пузырьки CO₂ поднимаются через раствор. Газ уходит из открытого сосуда.'}),
 reaction('bicarbonate_acetic','Кислота и гидрокарбонат','NaHCO₃ + CH₃COOH → CH₃COONa + CO₂↑ + H₂O',{sodium_bicarbonate:1,acetic_acid:1},{sodium_acetate:1,carbon_dioxide:1,water:1},'gas',{rate:.7,description:'Слабая кислота расходуется, образуются ацетат натрия, вода и CO₂.'}),
 reaction('carbonate_acetic','Карбонат и слабая кислота','Na₂CO₃ + 2CH₃COOH → 2CH₃COONa + CO₂↑ + H₂O',{sodium_carbonate:1,acetic_acid:2},{sodium_acetate:2,carbon_dioxide:1,water:1},'gas',{rate:.5,description:'Карбонат расходует два кислотных эквивалента.'}),
 reaction('chalk_acid','Мел растворяется в кислоте','CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O',{calcium_carbonate:1,hcl:2},{calcium_chloride:1,carbon_dioxide:1,water:1},'gas',{rate:.25,description:'Твёрдый карбонат кальция уменьшается, на поверхности выделяется CO₂.'}),
 reaction('chalk_acetic','Карбонат кальция и слабая кислота','CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + CO₂↑ + H₂O',{calcium_carbonate:1,acetic_acid:2},{calcium_acetate:1,carbon_dioxide:1,water:1},'gas',{rate:.1,description:'Медленное растворение карбоната кальция с выделением газа.'}),
 reaction('bicarbonate_base','Гидрокарбонат превращается в карбонат','NaHCO₃ + NaOH → Na₂CO₃ + H₂O',{sodium_bicarbonate:1,naoh:1},{sodium_carbonate:1,water:1},'reaction',{description:'Основание отнимает протон у гидрокарбоната.'}),
 reaction('copper_precipitate','Голубой осадок','CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',{cuso4:1,naoh:2},{copper_hydroxide:1,sodium_sulfate:1},'precipitate',{description:'Образуется малорастворимый голубой гидроксид меди(II).',color:'#69c6db'}),
 reaction('copper_chloride_precipitate','Голубой осадок','CuCl₂ + 2NaOH → Cu(OH)₂↓ + 2NaCl',{copper_chloride:1,naoh:2},{copper_hydroxide:1,sodium_chloride:2},'precipitate',{color:'#69c6db'}),
 reaction('iron_precipitate','Зеленоватый осадок','FeSO₄ + 2NaOH → Fe(OH)₂↓ + Na₂SO₄',{iron_sulfate:1,naoh:2},{iron_hydroxide:1,sodium_sulfate:1},'precipitate',{description:'Образуется гидроксид железа(II). Дальнейшее окисление воздухом в этой версии не рассчитывается.',color:'#668a6b'}),
 reaction('magnesium_precipitate','Белый осадок','MgSO₄ + 2NaOH → Mg(OH)₂↓ + Na₂SO₄',{magnesium_sulfate:1,naoh:2},{magnesium_hydroxide:1,sodium_sulfate:1},'precipitate',{color:'#eeeadd'}),
 reaction('calcium_precipitate','Карбонат кальция выпадает в осадок','CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl',{calcium_chloride:1,sodium_carbonate:1},{calcium_carbonate:1,sodium_chloride:2},'precipitate',{description:'Два прозрачных раствора образуют белую взвесь.',color:'#e7dfc5'}),
 reaction('iron_copper','Железо вытесняет медь','Fe + CuSO₄ → FeSO₄ + Cu↓',{iron:1,cuso4:1},{iron_sulfate:1,copper:1},'precipitate',{rate:.12,heat:10,description:'На железе выделяется красноватая медь; голубая окраска раствора ослабевает.',color:'#c9794d'}),
 reaction('zinc_copper','Цинк вытесняет медь','Zn + CuSO₄ → ZnSO₄ + Cu↓',{zinc:1,cuso4:1},{zinc_sulfate:1,copper:1},'precipitate',{rate:.2,heat:20,description:'Выделяется металлическая медь. Раствор сульфата цинка бесцветен.',color:'#c9794d'}),
 reaction('copper_oxide_acid','Чёрный оксид растворяется','CuO + 2HCl → CuCl₂ + H₂O',{copper_oxide:1,hcl:2},{copper_chloride:1,water:1},'reaction',{rate:.2,description:'Основный оксид взаимодействует с кислотой; появляется окраска ионов меди.'}),
 reaction('copper_hydroxide_acid','Осадок растворяется','Cu(OH)₂ + 2HCl → CuCl₂ + 2H₂O',{copper_hydroxide:1,hcl:2},{copper_chloride:1,water:2},'reaction',{description:'Голубой гидроксид расходуется при добавлении кислоты.'}),
 reaction('iron_hydroxide_acid','Осадок железа растворяется','Fe(OH)₂ + 2HCl → FeCl₂ + 2H₂O',{iron_hydroxide:1,hcl:2},{iron_chloride:1,water:2}),
 reaction('iron_acid','Металл и кислота','Fe + 2HCl → FeCl₂ + H₂↑',{iron:1,hcl:2},{iron_chloride:1,hydrogen:1},'gas',{rate:.035,description:'Поверхность железа медленно реагирует с кислотой. Водород уходит из открытого сосуда.'}),
 reaction('zinc_acid','Металл и кислота','Zn + 2HCl → ZnCl₂ + H₂↑',{zinc:1,hcl:2},{zinc_chloride:1,hydrogen:1},'gas',{rate:.07,description:'Цинк расходуется с выделением водорода.'}),
 reaction('copper_hydroxide_heat','Термическое разложение осадка','Cu(OH)₂ → CuO + H₂O',{copper_hydroxide:1},{copper_oxide:1,water:1},'reaction',{aqueous:false,minTemp:85,rate:.12,description:'При нагревании голубой гидроксид меди темнеет: образуется чёрный оксид. Скорость условная.'}),
];

REACTIONS.push(
 reaction('sulfate_first','Первая ступень нейтрализации','H₂SO₄ + NaOH → NaHSO₄ + H₂O',{sulfuric_acid:1,naoh:1},{sodium_bisulfate:1,water:1},'reaction',{heat:55,description:'Один кислотный протон заменён натрием. Гидросульфат ещё способен отдавать протон.'}),
 reaction('sulfate_second','Образуется сульфат натрия','NaHSO₄ + NaOH → Na₂SO₄ + H₂O',{sodium_bisulfate:1,naoh:1},{sodium_sulfate:1,water:1},'reaction',{heat:55,blockedBy:['sulfuric_acid']}),
 reaction('potassium_neutralization','Образуется хлорид калия','KOH + HCl → KCl + H₂O',{potassium_hydroxide:1,hcl:1},{potassium_chloride:1,water:1},'reaction',{heat:57.1}),
 reaction('potassium_acetate','Образуется ацетат калия','KOH + CH₃COOH → CH₃COOK + H₂O',{potassium_hydroxide:1,acetic_acid:1},{potassium_acetate:1,water:1},'reaction',{heat:55}),
 reaction('potassium_sulfate','Образуется сульфат калия','2KOH + H₂SO₄ → K₂SO₄ + 2H₂O',{potassium_hydroxide:2,sulfuric_acid:1},{potassium_sulfate:1,water:2},'reaction',{heat:110,description:'Суммарное уравнение полной нейтрализации; промежуточный гидросульфат калия отдельно не моделируется.'}),
 reaction('lime_slaking','Гашение извести','CaO + H₂O → Ca(OH)₂',{calcium_oxide:1,water:1},{calcium_hydroxide:1},'reaction',{heat:65,rate:.5,description:'Оксид кальция связывает воду с выделением тепла. Получается малорастворимое основание.'}),
 reaction('lime_hcl','Гидроксид кальция растворяется','Ca(OH)₂ + 2HCl → CaCl₂ + 2H₂O',{calcium_hydroxide:1,hcl:2},{calcium_chloride:1,water:2},'reaction',{heat:110}),
 reaction('lime_sulfate','Образуется сульфат кальция','Ca(OH)₂ + H₂SO₄ → CaSO₄↓ + 2H₂O',{calcium_hydroxide:1,sulfuric_acid:1},{calcium_sulfate:1,water:2},'precipitate',{color:'#dedccc',description:'Малорастворимая соль остаётся в твёрдой фазе. Гидратные формы отдельно не учитываются.'}),
 reaction('calcium_sulfate_precipitate','Белый сульфатный осадок','CaCl₂ + Na₂SO₄ → CaSO₄↓ + 2NaCl',{calcium_chloride:1,sodium_sulfate:1},{calcium_sulfate:1,sodium_chloride:2},'precipitate',{color:'#dedccc',minConcentration:.02}),
 reaction('magnesium_hcl','Магний реагирует с кислотой','Mg + 2HCl → MgCl₂ + H₂↑',{magnesium:1,hcl:2},{magnesium_chloride:1,hydrogen:1},'gas',{rate:.25,description:'Магний переходит в раствор, выделяется водород.'}),
 reaction('magnesium_sulfate','Магний образует сульфат','Mg + H₂SO₄ → MgSO₄ + H₂↑',{magnesium:1,sulfuric_acid:1},{magnesium_sulfate:1,hydrogen:1},'gas',{rate:.2}),
 reaction('zinc_sulfate_acid','Цинк образует сульфат','Zn + H₂SO₄ → ZnSO₄ + H₂↑',{zinc:1,sulfuric_acid:1},{zinc_sulfate:1,hydrogen:1},'gas',{rate:.07}),
 reaction('iron_sulfate_acid','Железо образует сульфат','Fe + H₂SO₄ → FeSO₄ + H₂↑',{iron:1,sulfuric_acid:1},{iron_sulfate:1,hydrogen:1},'gas',{rate:.035}),
 reaction('copper_oxide_sulfate','Оксид превращается в сульфат','CuO + H₂SO₄ → CuSO₄ + H₂O',{copper_oxide:1,sulfuric_acid:1},{cuso4:1,water:1},'reaction',{rate:.18}),
 reaction('magnesium_hydroxide_hcl','Белый осадок растворяется','Mg(OH)₂ + 2HCl → MgCl₂ + 2H₂O',{magnesium_hydroxide:1,hcl:2},{magnesium_chloride:1,water:2}),
 reaction('magnesium_hydroxide_sulfate','Основание даёт сульфат','Mg(OH)₂ + H₂SO₄ → MgSO₄ + 2H₂O',{magnesium_hydroxide:1,sulfuric_acid:1},{magnesium_sulfate:1,water:2}),
 reaction('zinc_precipitate','Белый осадок цинка','ZnSO₄ + 2NaOH → Zn(OH)₂↓ + Na₂SO₄',{zinc_sulfate:1,naoh:2},{zinc_hydroxide:1,sodium_sulfate:1},'precipitate',{color:'#d9e1dc',description:'Образуется амфотерный гидроксид цинка. Его растворение в избытке щёлочи в этой модели пока не рассчитывается.'}),
 reaction('zinc_chloride_precipitate','Белый осадок цинка','ZnCl₂ + 2NaOH → Zn(OH)₂↓ + 2NaCl',{zinc_chloride:1,naoh:2},{zinc_hydroxide:1,sodium_chloride:2},'precipitate',{color:'#d9e1dc'}),
 reaction('zinc_hydroxide_hcl','Гидроксид цинка растворяется','Zn(OH)₂ + 2HCl → ZnCl₂ + 2H₂O',{zinc_hydroxide:1,hcl:2},{zinc_chloride:1,water:2}),
 reaction('zinc_hydroxide_sulfate','Образуется сульфат цинка','Zn(OH)₂ + H₂SO₄ → ZnSO₄ + 2H₂O',{zinc_hydroxide:1,sulfuric_acid:1},{zinc_sulfate:1,water:2}),
 reaction('zinc_hydroxide_heat','Гидроксид цинка теряет воду','Zn(OH)₂ → ZnO + H₂O',{zinc_hydroxide:1},{zinc_oxide:1,water:1},'reaction',{aqueous:false,dry:true,minTemp:180,rate:.15,description:'Нагрев сухого остатка даёт оксид цинка; температура начала в игре условная.'}),
 reaction('magnesium_hydroxide_heat','Образуется оксид магния','Mg(OH)₂ → MgO + H₂O',{magnesium_hydroxide:1},{magnesium_oxide:1,water:1},'reaction',{aqueous:false,dry:true,minTemp:350,rate:.12,description:'Сильное нагревание сухого гидроксида приводит к потере воды. Скорость и порог в игре приближённые.'}),
 reaction('magnesium_oxide_hcl','Оксид магния растворяется','MgO + 2HCl → MgCl₂ + H₂O',{magnesium_oxide:1,hcl:2},{magnesium_chloride:1,water:1},'reaction',{rate:.2}),
 reaction('magnesium_oxide_sulfate','Оксид магния даёт сульфат','MgO + H₂SO₄ → MgSO₄ + H₂O',{magnesium_oxide:1,sulfuric_acid:1},{magnesium_sulfate:1,water:1},'reaction',{rate:.2}),
 reaction('zinc_oxide_hcl','Оксид цинка растворяется','ZnO + 2HCl → ZnCl₂ + H₂O',{zinc_oxide:1,hcl:2},{zinc_chloride:1,water:1},'reaction',{rate:.2}),
 reaction('zinc_oxide_sulfate','Оксид цинка даёт сульфат','ZnO + H₂SO₄ → ZnSO₄ + H₂O',{zinc_oxide:1,sulfuric_acid:1},{zinc_sulfate:1,water:1},'reaction',{rate:.2}),
 reaction('iron3_oxide_hcl','Красный оксид растворяется','Fe₂O₃ + 6HCl → 2FeCl₃ + 3H₂O',{iron3_oxide:1,hcl:6},{iron3_chloride:2,water:3},'reaction',{rate:.025,description:'Основный оксид железа(III) растворяется в кислоте. Нагрев ускоряет процесс.'}),
 reaction('iron3_oxide_sulfate','Образуется сульфат железа(III)','Fe₂O₃ + 3H₂SO₄ → Fe₂(SO₄)₃ + 3H₂O',{iron3_oxide:1,sulfuric_acid:3},{iron3_sulfate:1,water:3},'reaction',{rate:.025}),
 reaction('iron3_chloride_precipitate','Бурый осадок','FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',{iron3_chloride:1,naoh:3},{iron3_hydroxide:1,sodium_chloride:3},'precipitate',{color:'#a36b42',description:'Железо(III) образует бурый гидратированный осадок; его состав здесь условно записан Fe(OH)₃.'}),
 reaction('iron3_sulfate_precipitate','Бурый гидроксид железа','Fe₂(SO₄)₃ + 6NaOH → 2Fe(OH)₃↓ + 3Na₂SO₄',{iron3_sulfate:1,naoh:6},{iron3_hydroxide:2,sodium_sulfate:3},'precipitate',{color:'#a36b42'}),
 reaction('iron3_hydroxide_hcl','Бурый осадок растворяется','Fe(OH)₃ + 3HCl → FeCl₃ + 3H₂O',{iron3_hydroxide:1,hcl:3},{iron3_chloride:1,water:3}),
 reaction('iron3_hydroxide_sulfate','Осадок даёт сульфат железа','2Fe(OH)₃ + 3H₂SO₄ → Fe₂(SO₄)₃ + 6H₂O',{iron3_hydroxide:2,sulfuric_acid:3},{iron3_sulfate:1,water:6}),
 reaction('iron3_hydroxide_heat','Бурый осадок обезвоживается','2Fe(OH)₃ → Fe₂O₃ + 3H₂O',{iron3_hydroxide:2},{iron3_oxide:1,water:3},'reaction',{aqueous:false,dry:true,minTemp:250,rate:.12,description:'Сухой гидратированный осадок при нагревании превращается в оксид; промежуточные оксигидроксиды не выделены.'}),
 reaction('peroxide_catalysis','Катализатор выделяет кислород','2H₂O₂ → 2H₂O + O₂↑',{hydrogen_peroxide:2},{water:2,oxygen:1},'gas',{catalysts:['manganese_dioxide'],rate:.4,heat:196,description:'MnO₂ ускоряет разложение пероксида и не расходуется в суммарном уравнении.'}),
 reaction('peroxide_heat','Нагрев ускоряет разложение','2H₂O₂ → 2H₂O + O₂↑',{hydrogen_peroxide:2},{water:2,oxygen:1},'gas',{minTemp:70,rate:.015,heat:196,description:'Пероксид водорода разлагается на воду и кислород. В игре учтён нагрев, но не все возможные примеси-катализаторы.'}),
 reaction('bicarbonate_heat','Сода теряет газ и воду','2NaHCO₃ → Na₂CO₃ + CO₂↑ + H₂O',{sodium_bicarbonate:2},{sodium_carbonate:1,carbon_dioxide:1,water:1},'gas',{aqueous:false,dry:true,minTemp:160,rate:.12,description:'После удаления растворителя нагрев сухого гидрокарбоната даёт карбонат.'}),
 reaction('phosphate_first','Первая фосфатная ступень','H₃PO₄ + NaOH → NaH₂PO₄ + H₂O',{phosphoric_acid:1,naoh:1},{sodium_dihydrogen_phosphate:1,water:1},'reaction',{heat:35}),
 reaction('phosphate_second','Вторая фосфатная ступень','NaH₂PO₄ + NaOH → Na₂HPO₄ + H₂O',{sodium_dihydrogen_phosphate:1,naoh:1},{disodium_hydrogen_phosphate:1,water:1},'reaction',{heat:35,blockedBy:['phosphoric_acid']}),
 reaction('phosphate_third','Третья фосфатная ступень','Na₂HPO₄ + NaOH → Na₃PO₄ + H₂O',{disodium_hydrogen_phosphate:1,naoh:1},{trisodium_phosphate:1,water:1},'reaction',{heat:25,blockedBy:['phosphoric_acid','sodium_dihydrogen_phosphate'],description:'Суммарная запись третьей нейтрализации. Гидролиз PO₄³⁻ делает раствор щелочным.'}),
 reaction('calcium_phosphate_precipitate','Фосфат кальция осаждается','3CaCl₂ + 2Na₃PO₄ → Ca₃(PO₄)₂↓ + 6NaCl',{calcium_chloride:3,trisodium_phosphate:2},{calcium_phosphate:1,sodium_chloride:6},'precipitate',{color:'#ede5cd',description:'В щелочной среде появляется белая твёрдая фаза. Разные гидратные и основные фосфаты объединены в учебную формулу.'}),
 reaction('magnesium_phosphate_precipitate','Фосфат магния осаждается','3MgSO₄ + 2Na₃PO₄ → Mg₃(PO₄)₂↓ + 3Na₂SO₄',{magnesium_sulfate:3,trisodium_phosphate:2},{magnesium_phosphate:1,sodium_sulfate:3},'precipitate',{color:'#e5e3d6'}),
 reaction('copper_phosphate_precipitate','Голубой фосфат меди','3CuSO₄ + 2Na₃PO₄ → Cu₃(PO₄)₂↓ + 3Na₂SO₄',{cuso4:3,trisodium_phosphate:2},{copper_phosphate:1,sodium_sulfate:3},'precipitate',{color:'#5baebf'}),
 reaction('zinc_phosphate_precipitate','Белый фосфат цинка','3ZnSO₄ + 2Na₃PO₄ → Zn₃(PO₄)₂↓ + 3Na₂SO₄',{zinc_sulfate:3,trisodium_phosphate:2},{zinc_phosphate:1,sodium_sulfate:3},'precipitate',{color:'#e7e2d6'}),
 reaction('magnesium_acetate','Образуется ацетат магния','Mg(OH)₂ + 2CH₃COOH → Mg(CH₃COO)₂ + 2H₂O',{magnesium_hydroxide:1,acetic_acid:2},{magnesium_acetate:1,water:2},'reaction',{rate:.4}),
 reaction('zinc_acetate','Образуется ацетат цинка','ZnO + 2CH₃COOH → Zn(CH₃COO)₂ + H₂O',{zinc_oxide:1,acetic_acid:2},{zinc_acetate:1,water:1},'reaction',{rate:.2}),
 reaction('calcium_phosphate_acid','Фосфат кальция растворяется','Ca₃(PO₄)₂ + 6HCl → 3CaCl₂ + 2H₃PO₄',{calcium_phosphate:1,hcl:6},{calcium_chloride:3,phosphoric_acid:2},'reaction',{rate:.2}),
 reaction('magnesium_phosphate_acid','Фосфат магния растворяется','Mg₃(PO₄)₂ + 6HCl → 3MgCl₂ + 2H₃PO₄',{magnesium_phosphate:1,hcl:6},{magnesium_chloride:3,phosphoric_acid:2},'reaction',{rate:.2}),
 reaction('copper_phosphate_acid','Фосфат меди растворяется','Cu₃(PO₄)₂ + 6HCl → 3CuCl₂ + 2H₃PO₄',{copper_phosphate:1,hcl:6},{copper_chloride:3,phosphoric_acid:2},'reaction',{rate:.2}),
 reaction('zinc_phosphate_acid','Фосфат цинка растворяется','Zn₃(PO₄)₂ + 6HCl → 3ZnCl₂ + 2H₃PO₄',{zinc_phosphate:1,hcl:6},{zinc_chloride:3,phosphoric_acid:2},'reaction',{rate:.2})
);

REACTIONS.push(
 reaction('sulfate_bicarbonate_first','Кислота выделяет CO₂','H₂SO₄ + NaHCO₃ → NaHSO₄ + CO₂↑ + H₂O',{sulfuric_acid:1,sodium_bicarbonate:1},{sodium_bisulfate:1,carbon_dioxide:1,water:1},'gas',{rate:1}),
 reaction('sulfate_bicarbonate_second','Гидросульфат выделяет CO₂','NaHSO₄ + NaHCO₃ → Na₂SO₄ + CO₂↑ + H₂O',{sodium_bisulfate:1,sodium_bicarbonate:1},{sodium_sulfate:1,carbon_dioxide:1,water:1},'gas',{rate:.8,blockedBy:['sulfuric_acid']}),
 reaction('phosphate_bicarbonate','Слабая кислота и гидрокарбонат','H₃PO₄ + NaHCO₃ → NaH₂PO₄ + CO₂↑ + H₂O',{phosphoric_acid:1,sodium_bicarbonate:1},{sodium_dihydrogen_phosphate:1,carbon_dioxide:1,water:1},'gas',{rate:.6}),
 reaction('chalk_sulfate','На меле появляется сульфат','CaCO₃ + H₂SO₄ → CaSO₄↓ + CO₂↑ + H₂O',{calcium_carbonate:1,sulfuric_acid:1},{calcium_sulfate:1,carbon_dioxide:1,water:1},'gas',{rate:.025,description:'Слой малорастворимой соли замедляет процесс; точная пассивация поверхности не рассчитывается.'}),
 reaction('phosphate_acid_first','Фосфат принимает протон','Na₃PO₄ + HCl → Na₂HPO₄ + NaCl',{trisodium_phosphate:1,hcl:1},{disodium_hydrogen_phosphate:1,sodium_chloride:1}),
 reaction('phosphate_acid_second','Гидрофосфат принимает протон','Na₂HPO₄ + HCl → NaH₂PO₄ + NaCl',{disodium_hydrogen_phosphate:1,hcl:1},{sodium_dihydrogen_phosphate:1,sodium_chloride:1},'reaction',{blockedBy:['trisodium_phosphate']}),
 reaction('phosphate_acid_third','Восстанавливается фосфорная кислота','NaH₂PO₄ + HCl → H₃PO₄ + NaCl',{sodium_dihydrogen_phosphate:1,hcl:1},{phosphoric_acid:1,sodium_chloride:1},'reaction',{blockedBy:['trisodium_phosphate','disodium_hydrogen_phosphate']})
);

// One shared reaction catalogue drives the encyclopedia's obtaining routes.
// Heat is J per mmol of reaction extent (= kJ per mol), positive when released.
// These values follow aqueous-ion standard formation enthalpies (OpenStax G),
// rather than arbitrary animation intensities. Counterions cancel in the sums.
const referenceHeats={iron_copper:153.87,zinc_copper:218.67,iron_acid:89.1,iron_sulfate_acid:89.1,zinc_acid:153.9,zinc_sulfate_acid:153.9,magnesium_hcl:466.9,magnesium_sulfate:466.9,bicarbonate_acid:-11.77};
for(const r of REACTIONS) {
 if(Object.hasOwn(referenceHeats,r.id)){r.heat=referenceHeats[r.id];r.heatBasis='Стандартные энтальпии образования ионов; идеальный разбавленный раствор, около 25 °C.';}
 if(r.type==='precipitate') {
  const solid=Object.keys(r.products).find(id=>SUBSTANCES[id].state==='solid');
  if(solid)r.color=SUBSTANCES[solid].color;
 }
 // Prevent an acid-rich mixture from continuously making and dissolving the
 // same hydroxide/phosphate merely because molecular bookkeeping lists both.
 const precipitatePH={copper_hydroxide:5.5,iron_hydroxide:7,magnesium_hydroxide:9,zinc_hydroxide:7,iron3_hydroxide:2.5,calcium_carbonate:7,calcium_phosphate:6,magnesium_phosphate:6,copper_phosphate:5,zinc_phosphate:6};
 if(r.type==='precipitate')for(const id of Object.keys(r.products))if(precipitatePH[id])r.minPH=precipitatePH[id];
 r.description ||= 'Изменение состава идёт в указанном стехиометрическом отношении.';
 r.conditions = [r.aqueous?'Водная среда':null,r.minPH?`Среда не кислее примерно pH ${r.minPH} (приближённый предел модели)`:null,r.minTemp?`Нагрев выше примерно ${r.minTemp} °C (игровой порог)`:null,r.dry?'Сначала удалить основную часть воды':null,r.catalysts?.length?'Катализатор: '+r.catalysts.map(id=>SUBSTANCES[id].formula).join(', '):null].filter(Boolean);
}

const ENCYCLOPEDIA = {
 water:['Полярный растворитель, в котором существуют и перемещаются ионы. Чистая вода бесцветна; при обычном атмосферном давлении кипит около 100 °C.','Вода входит в уравнения нейтрализации, гидратации и термического разложения. Её испарение увеличивает долю нелетучих компонентов.','Растворение и разбавление; наблюдение кипения и сухого остатка'],
 hcl:['Хлороводород в воде образует сильную кислоту. В растворе химически значимы кислотные протоны и хлорид-ионы.','Реагирует с основаниями, карбонатами и некоторыми металлами. Медь не вытесняет водород из разбавленной соляной кислоты.','Нейтрализация; растворение оксидов и осадков; получение хлоридов'],
 naoh:['Сильное основание, дающее в воде ионы Na⁺ и OH⁻. Раствор бесцветен, а его щелочность меняется при разбавлении.','Гидроксид-ионы связывают кислотные протоны и осаждают многие катионы металлов. Избыток щёлочи остаётся отдельным компонентом смеси.','Получение осадков; кислотно-основные переходы; фосфатная цепочка'],
 cuso4:['Раствор сульфата меди(II) голубой благодаря гидратированным ионам Cu²⁺. Сульфат-ионы часто выступают сопутствующими ионами.','Железо и цинк могут восстановить медь до металла. Щёлочь переводит Cu²⁺ в голубой гидроксид, а фосфат — в малорастворимую соль.','Вытеснение металлов; цветные осадки; наблюдение изменения состава'],
 iron:['Серый металл, способный отдавать электроны и переходить в раствор в виде Fe²⁺. Реакция начинается на поверхности металла.','Железо вытесняет медь из её соли и медленно реагирует с разбавленными неокисляющими кислотами. Настоящее ржавление требует кислорода и влаги и здесь отдельно не рассчитано.','Сравнение активности металлов; получение солей железа(II)'],
 sodium_bicarbonate:['Гидрокарбонат натрия — вещество пищевой соды. Его водный раствор слабощелочной.','С кислотой образует CO₂ и воду. Щёлочь переводит гидрокарбонат в карбонат; нагрев сухого вещества также даёт карбонат с потерей газа и воды.','Наблюдение газовыделения; карбонатная цепочка; термическое разложение'],
 acetic_acid:['Слабая одноосновная органическая кислота. Большая часть молекул в разбавленном растворе остаётся недиссоциированной.','Со щёлочью образует ацетаты, а с карбонатами выделяет CO₂. Уксусная кислота и ацетат могут образовывать буферную пару.','Получение ацетатов; сравнение сильной и слабой кислоты; буферы'],
 sodium_chloride:['Ионная соль натрия и хлора. Водный раствор содержит отдельные Na⁺ и Cl⁻, хотя состав записан формулой NaCl.','В модели соль не исчезает при выпаривании воды и не превращается в новое вещество от простого разбавления.','Контрольный раствор; продукт нейтрализации; исследование сухого остатка'],
 calcium_carbonate:['Малорастворимый карбонат, встречающийся в кальците, известняке и меле. В воде остаётся преимущественно твёрдым.','Кислота разрушает карбонат-ион с образованием CO₂. Для получения CaO из карбоната нужна высокотемпературная печь, поэтому такой путь обычной спиртовке не приписан.','Карбонатные осадки; газовыделение; растворение твёрдого вещества'],
 phenolphthalein:['Органический кислотно-основный индикатор. В кислой и нейтральной воде почти бесцветен, а в щелочной среде приобретает розовую окраску.','Переход наблюдается примерно при pH 8,2–10. В игре индикатор следовой и не считается заметным источником кислоты или основания.','Визуальное наблюдение нейтрализации; сравнение щелочности'],
 copper:['Красноватый металл, менее активный, чем железо, цинк и магний. Имеет высокую электропроводность.','Может выделяться на более активном металле из раствора Cu²⁺. С разбавленной HCl без окислителя эта реакционная модель не даёт водород.','Продукт вытеснения; сравнение активности металлов'],
 zinc:['Светлый металлический элемент, более активный, чем медь. Его распространённая степень окисления в этих реакциях — +2.','Цинк вытесняет медь и даёт водород с разбавленными кислотами. Его оксид и гидроксид амфотерны, но цинкатные комплексы в текущем каталоге не рассчитаны.','Получение солей цинка; окислительно-восстановительные превращения'],
 sodium_carbonate:['Соль с карбонат-ионом CO₃²⁻; раствор имеет щелочную реакцию вследствие гидролиза.','Карбонат получается из гидрокарбоната и реагирует с кислотой в две ступени. С кальцием образует малорастворимый CaCO₃.','Продолжение цепочки соды; карбонатное осаждение'],
 calcium_chloride:['Растворимая соль кальция, дающая Ca²⁺ и Cl⁻. Сам раствор бесцветный.','Ионы кальция связываются карбонатом, сульфатом и фосфатом в твёрдые продукты. Внешний вид реальных гидратов здесь не различается.','Кальциевые осадки; связующее звено цепочек извести и мела'],
 iron_sulfate:['Сульфат железа(II) содержит Fe²⁺ и обычно даёт бледно-зелёный раствор. Это не та же соль, что сульфат железа(III).','Образуется при вытеснении меди железом или реакции железа с разбавленной серной кислотой. Со щёлочью даёт зеленоватый гидроксид.','Сравнение степеней окисления; получение гидроксида железа(II)'],
 copper_oxide:['Чёрный основной оксид меди(II), практически нерастворимый в воде. Нагрев голубого гидроксида даёт заметное потемнение.','Кислоты превращают CuO в соответствующую соль и воду. Одно добавление воды не возвращает гидроксид.','Тепловые превращения; возврат меди из осадка в раствор'],
 magnesium_sulfate:['Растворимая соль магния. Бесцветный раствор содержит Mg²⁺ и SO₄²⁻.','Реальные кристаллы часто содержат воду кристаллизации, но модель хранит формулу без отдельного гидрата. Щёлочь и фосфат могут удалить Mg²⁺ в осадок.','Магниевые осадки; цепочка от металла к оксиду'],
 bromothymol_blue:['Органический индикатор с переходом около нейтральной области. Он жёлтый в кислой среде, зелёный в переходной и синий в щелочной.','Приблизительный диапазон перехода — pH 6,0–7,6. Индикатор показывает среду, но сам по себе не определяет химический состав.','Наблюдение среды около pH 7; сравнение индикаторов'],
 copper_hydroxide:['Малорастворимый голубой гидроксид меди(II), образующийся из Cu²⁺ при добавлении щёлочи.','Нагрев переводит его в чёрный CuO с потерей воды. Кислота растворяет осадок и возвращает медь в раствор.','Цветной осадок; термическое разложение; обратимое осаждение кислотой и основанием'],
 iron_hydroxide:['Зеленоватый малорастворимый гидроксид железа(II). Содержит железо в степени окисления +2.','На воздухе реальный осадок постепенно окисляется и буреет. Эта версия сохраняет Fe(OH)₂, пока не применено поддерживаемое правило.','Осаждение Fe²⁺; сравнение с бурым гидроксидом железа(III)'],
 magnesium_hydroxide:['Белое малорастворимое основание. В воде лишь малая доля вещества даёт растворённые ионы.','Кислоты растворяют осадок; сильное нагревание сухого вещества приводит к потере воды и образованию MgO.','Магниевая цепочка; растворение осадков; получение оксида'],
 sodium_sulfate:['Соль натрия и серной кислоты. В данной записи учитывается Na₂SO₄ без отдельной кристаллизационной воды.','Возникает при полной нейтрализации серной кислоты и как сопутствующий продукт многих осаждений из сульфатных растворов.','Продолжение нейтрализации; осаждение сульфата кальция'],
 sodium_acetate:['Натриевая соль уксусной кислоты. Ацетат-ион способен принимать протон, поэтому раствор слабощелочной.','Совместно с уксусной кислотой образует буферную пару; её pH зависит от отношения кислоты и ацетата.','Ацетатный буфер; продукт реакции соды и кислоты'],
 calcium_acetate:['Кальциевая соль уксусной кислоты с двумя ацетат-ионами на один Ca²⁺. Раствор в модели бесцветен.','Получается при растворении карбоната кальция в уксусной кислоте; газ при этом связан с карбонатом, а не с ацетатом.','Изучение слабой кислоты и твёрдого карбоната'],
 copper_chloride:['Растворимая соль меди(II). Оттенок реального раствора зависит от гидратации и хлоридных комплексов; игра показывает один условный сине-зелёный цвет.','Образуется при действии HCl на CuO, Cu(OH)₂ или фосфат меди. Со щёлочью вновь даёт гидроксид.','Цикл осаждения и растворения меди'],
 iron_chloride:['Хлорид железа(II), содержащий Fe²⁺. Его растворы могут иметь бледно-зелёный оттенок.','Получается из металлического железа и HCl, а также при растворении гидроксида железа(II). Окисление воздухом отдельно не вычисляется.','Продукт взаимодействия металла с кислотой'],
 zinc_sulfate:['Бесцветная растворимая соль цинка. Ионы Zn²⁺ не дают характерной видимой окраски, как Cu²⁺.','Из сульфата можно получить гидроксид или фосфат цинка; сульфатная часть остаётся в растворе натриевой солью.','Сравнение бесцветных и окрашенных солей; цинковая цепочка'],
 zinc_chloride:['Растворимая соль Zn²⁺ и Cl⁻. В реальной воде гидролиз влияет на кислотность; здесь pH только приближённый.','Получается из цинка, его оксида, гидроксида или фосфата при подходящей реакции с HCl.','Альтернативный путь к гидроксиду цинка'],
 carbon_dioxide:['Бесцветный углекислый газ. В игре он выходит из карбонатных реакций в виде пузырьков.','Открытая посуда выпускает газ; закрытая удерживает его и повышает давление. Растворение CO₂ и полное карбонатное равновесие отдельно не рассчитываются.','Наблюдение газовыделения; сравнение открытого и закрытого сосуда'],
 hydrogen:['Бесцветный газ из двухатомных молекул H₂. В этих цепочках образуется при вытеснении водорода из кислоты металлом.','Водород горюч, однако игра не вычисляет его смешивание с воздухом и воспламенение. Выход газа здесь обозначает именно химическое образование H₂.','Сравнение активности металлов; учёт газообразного продукта'],
 steam:['Газовая фаза воды. Сам водяной пар невидим; белое облако в реальности состоит преимущественно из сконденсированных капель.','При испарении вода покидает жидкую фазу, а нелетучие соли остаются. В закрытом сосуде пар участвует в росте давления.','Кипение; выпаривание; механическое действие давления'],
 sulfuric_acid:['В этой игре используется разбавленная двухосновная кислота. Её свойства не следует переносить на концентрированную H₂SO₄.','При постепенном добавлении NaOH сначала получается гидросульфат, затем сульфат. Для pH оба кислотных эквивалента учтены приближённо.','Сульфатные цепочки; ступенчатая нейтрализация; реакции разбавленной кислоты'],
 magnesium:['Лёгкий серебристый металл, более активный, чем цинк и железо. В выбранных солях образует Mg²⁺.','Реагирует с разбавленными HCl и H₂SO₄ с выделением водорода. Горение магния в воздухе в этом каталоге не моделируется.','Начало магниевой цепочки; сравнение скорости металлов'],
 calcium_oxide:['Основный оксид, известный как негашёная известь. С водой химически превращается в гидроксид кальция.','Гидратация сопровождается заметным выделением тепла. CaO хранится как исходный минерал: его промышленное получение из карбоната требует печи.','Экзотермическая гидратация; начало известковой цепочки'],
 hydrogen_peroxide:['Пероксид содержит кислород-кислородную связь и может разлагаться на воду и O₂. В шкафу находится разбавленный водный раствор.','MnO₂ ускоряет разложение и сохраняется как катализатор. Нагрев также увеличивает скорость; другие окислительно-восстановительные пути не охвачены.','Катализ; выделение кислорода; сравнение влияния температуры'],
 manganese_dioxide:['Тёмный оксид марганца в степени окисления +4. Используется как отдельный исходный катализатор.','Ускоряет разложение H₂O₂, не расходуясь в суммарном уравнении. Это не означает полной химической инертности MnO₂ вне данного каталога.','Наблюдение катализа без расхода катализатора'],
 iron3_oxide:['Красно-бурый основной оксид железа(III), связанный с минералом гематитом. В воде практически не растворяется.','Кислоты переводят его в соли Fe³⁺. Он также получается при обезвоживании бурого гидратированного осадка.','Исходный минеральный материал; цикл железа(III)'],
 potassium_hydroxide:['Сильное растворимое основание с ионами K⁺ и OH⁻. Химическая роль гидроксид-иона близка к NaOH.','В каталоге реализованы реакции KOH с соляной, серной и уксусной кислотами. Все аналоги натриевых реакций автоматически не подставляются.','Сравнение оснований; получение калиевых солей'],
 phosphoric_acid:['Трёхосновная кислота, способная последовательно отдавать три протона. Каждая следующая ступень слабее предыдущей.','Контролируемое добавление NaOH даёт дигидрофосфат, гидрофосфат и фосфат натрия. Промежуточные формы имеют различную кислотность.','Многоступенчатая нейтрализация; буферная пара; начало фосфатной цепочки'],
 silica:['Диоксид кремния образует пространственную сеть связей и встречается в кварце. В обычной воде и разбавленной HCl практически не реагирует.','Для превращений SiO₂ нужны иные условия, например высокотемпературные процессы. Эти пути не заменены в игре выдуманным смешиванием.','Контрольный твёрдый образец; сравнение инертного и основного оксида'],
 glucose:['Органическое соединение с шестью атомами углерода, растворимое в воде. В шкафу представлен готовый раствор.','Это не электролит, подобный NaCl. Сложные окислительные реакции, брожение и термическое разрушение глюкозы в текущем каталоге отсутствуют.','Сравнение раствора органического вещества с солями; контрольная проба'],
 potassium_chloride:['Калиевая соль соляной кислоты. В воде присутствуют K⁺ и Cl⁻.','Возникает при нейтрализации KOH; в рамках модели остаётся нелетучим компонентом после испарения растворителя.','Продукт нейтрализации; сравнение NaCl и KCl'],
 potassium_sulfate:['Соль с двумя ионами K⁺ на один сульфат-ион. Записывается без учёта отдельных ионных пар.','Получается по суммарному уравнению полной нейтрализации H₂SO₄ раствором KOH. Промежуточный KHSO₄ отдельно не представлен.','Сравнение одно- и двухосновных кислот'],
 magnesium_chloride:['Растворимая соль магния и соляной кислоты. Бесцветность не означает отсутствие растворённого вещества.','Образуется при действии HCl на магний, MgO, Mg(OH)₂ или фосфат магния. Модель не различает кристаллогидраты.','Прослеживание разных путей к одной соли'],
 magnesium_oxide:['Белый основной оксид магния, малорастворимый в воде. В игре получается сильным нагреванием сухого гидроксида.','Кислоты превращают MgO в растворимые соли. Медленная гидратация оксида водой в текущем наборе не рассчитывается.','Термическое обезвоживание; возврат оксида в раствор'],
 calcium_hydroxide:['Малорастворимое основание, известное как гашёная известь. Небольшая растворившаяся часть создаёт сильнощелочную среду.','Образуется из CaO и воды. С HCl даёт растворимый хлорид, с H₂SO₄ — малорастворимый сульфат.','Известковая цепочка; сравнение растворимых и малорастворимых оснований'],
 calcium_sulfate:['Малорастворимый сульфат кальция. В природе и технике важны его гидратные формы, включая гипс.','Игра хранит общий безводный состав CaSO₄ и не различает гипс, полугидрат и ангидрит. Осаждение включается только при достаточно заметных концентрациях.','Сульфатное осаждение; наблюдение твёрдой защитной фазы'],
 zinc_hydroxide:['Белый амфотерный гидроксид цинка. Осаждается из соли цинка при добавлении основания.','Реально способен растворяться и в кислоте, и в избытке сильной щёлочи. В игре реализованы кислотное растворение и нагрев, но не образование цинкатных комплексов.','Цепочка соль — гидроксид — оксид; сравнение осадков'],
 zinc_oxide:['Оксид цинка амфотерен. Обычно выглядит белым, а при нагревании может становиться желтоватым.','Получается из сухого Zn(OH)₂ при нагревании. Кислоты дают хлорид, сульфат или ацетат цинка; реакция с избытком щёлочи пока вне модели.','Тепловая цепочка цинка; получение ацетата'],
 iron3_chloride:['Хлорид железа(III), отличающийся от FeCl₂ и степенью окисления, и реакциями. Растворы часто желтоваты из-за гидролиза и комплексных форм.','Щёлочь образует бурый гидратированный осадок, записанный как Fe(OH)₃. Реальный состав раствора сложнее одной молекулярной формулы.','Бурые осадки; сравнение Fe²⁺ и Fe³⁺'],
 iron3_hydroxide:['Условная учебная запись бурого гидратированного осадка железа(III). Реальная твёрдая фаза может включать оксигидроксиды и переменное количество воды.','Растворяется в кислотах и после высушивания теряет воду при нагревании. Модель использует сбалансированную запись Fe(OH)₃ для отслеживания состава.','Цикл железа(III); сравнение гидратации и обезвоживания'],
 iron3_sulfate:['Сульфат железа(III) содержит два Fe³⁺ на три SO₄²⁻. Гидролиз делает реальный раствор кислым.','Может получаться из Fe₂O₃ или Fe(OH)₃ и разбавленной серной кислоты. Щёлочь снова выделяет бурый осадок.','Прослеживание противоиона; осаждение железа(III)'],
 sodium_dihydrogen_phosphate:['Кислая соль, сохранившая два атома водорода в фосфатной группе. Её водный раствор обычно слабокислый.','Это первая ступень нейтрализации H₃PO₄. Вместе с гидрофосфатом может участвовать в буферной системе.','Первая фосфатная ступень; переход к буферной паре'],
 disodium_hydrogen_phosphate:['Гидрофосфат содержит HPO₄²⁻ и два иона натрия. Может и отдавать, и принимать протон.','С дигидрофосфатом образует важную кислотно-основную пару. В игре дополнительная щёлочь ведёт к фосфату, а HCl возвращает более кислую форму.','Буферная пара; вторая ступень нейтрализации'],
 trisodium_phosphate:['Средняя соль ортофосфорной кислоты. Из-за гидролиза фосфат-иона раствор щелочной.','Формула Na₃PO₄ обозначает общий состав; в реальной воде часть PO₄³⁻ протонирована. С ионами нескольких металлов даёт малорастворимые продукты.','Фосфатные осадки; третья ступень нейтрализации'],
 calcium_phosphate:['Малорастворимый фосфат кальция с учебной формулой Ca₃(PO₄)₂. Семейство фосфатов кальция включает и другие важные твёрдые фазы.','В реальном осаждении pH и условия влияют на форму продукта. Игра объединяет эту сложность в одну сбалансированную реакцию, обратимую действием кислоты.','Сравнение фосфатных осадков; кислотное растворение'],
 magnesium_phosphate:['Малорастворимая соль магния и ортофосфорной кислоты. Представлена белой твёрдой фазой.','Получается из MgSO₄ и фосфата натрия в щелочной среде. Реальные гидратные формы и конкурирующий Mg(OH)₂ не рассчитываются полностью.','Продолжение магниевой и фосфатной цепочек'],
 oxygen:['Двухатомный газ O₂. Он поддерживает многие процессы горения, но сам не является горючим веществом.','В игре получается из H₂O₂ и уходит из открытой посуды. Смешивание газов комнаты и дальнейшее окисление веществ им пока не моделируются.','Продукт каталитического разложения; газовый баланс'],
 copper_phosphate:['Малорастворимый фосфат меди(II) с голубой или сине-зелёной окраской. Цвет связан с ионами меди в твёрдой фазе.','Образуется из CuSO₄ и фосфата натрия; HCl растворяет осадок. Гидратация и основные фосфатные формы отдельно не представлены.','Цветной фосфатный осадок; сопоставление разных солей меди'],
 zinc_phosphate:['Белый малорастворимый фосфат цинка. Не имеет голубого цвета, характерного для соответствующей соли меди.','Возникает при осаждении из ZnSO₄ фосфатом натрия. Кислота протонирует фосфатную часть и переводит цинк обратно в раствор.','Сравнение фосфатных осадков; обратное растворение'],
 potassium_acetate:['Калиевая соль уксусной кислоты. В растворе ацетат может принимать протон и создавать слабощелочную среду.','Получается нейтрализацией CH₃COOH раствором KOH. По кислотно-основной роли похож на ацетат натрия.','Сравнение противоионов в ацетатных растворах'],
 magnesium_acetate:['Магниевая соль с двумя ацетатными группами. В модели находится в растворённом состоянии.','Получается из малорастворимого Mg(OH)₂ и слабой уксусной кислоты: осадок расходуется, образуется вода.','Растворение основания слабой кислотой'],
 zinc_acetate:['Цинковая соль уксусной кислоты. Содержит один Zn²⁺ на два ацетат-иона.','В выбранной цепочке образуется при растворении ZnO уксусной кислотой. Это другой продукт, чем ZnCl₂ или ZnSO₄, несмотря на общий катион.','Финальная ветвь цинковой цепочки; сравнение солей одного металла'],
 sodium_bisulfate:['Кислая соль серной кислоты с ещё одним кислотным протоном. В воде HSO₄⁻ способен дополнительно диссоциировать.','Образуется после первого эквивалента NaOH и реагирует со следующим. Также может выделять CO₂ из гидрокарбоната.','Промежуточная ступень сульфатной цепочки'],
};

const stateNames={liquid:'Жидкость',aqueous:'Водный раствор',solid:'Твёрдое вещество',gas:'Газ'};
for(const s of Object.values(SUBSTANCES)) {
 const entry=ENCYCLOPEDIA[s.id];
 if(!entry)throw new Error('Missing encyclopedia metadata: '+s.id);
 const routes=REACTIONS.filter(r=>(r.products[s.id]||0)>0);
 s.description=entry[0];
 s.uses=entry[2].split('; ');
 s.originCategory=s.stock?(['phenolphthalein','bromothymol_blue','hydrogen_peroxide','manganese_dioxide','silica','glucose'].includes(s.id)?'special':'base'):(s.state==='gas'?'gas':'derived');
 s.synthesis=routes.map(r=>r.id);
 s.sourcing=s.stock?(s.originCategory==='special'?'Готовый специальный реактив из шкафа: его получение не моделируется простым смешиванием.':'Исходный реактив или минеральное сырьё из шкафа.'):(s.id==='steam'?'Образуется при испарении и кипении воды.':`Получается в игре: ${routes.map(r=>r.equation).slice(0,3).join('; ')}.`);
 s.properties={state:stateNames[s.state],molarMass:s.molarMass,molarMassUnit:'г/моль',solubility:s.state==='aqueous'?'В модели растворён в воде; насыщение отдельно не рассчитывается':s.state==='solid'?(s.id==='calcium_oxide'?'Реагирует с водой':s.id==='calcium_hydroxide'?'Малорастворим; растворённая доля создаёт щелочную среду':'Твёрдая фаза; подробное равновесие растворимости не рассчитывается'):s.state==='gas'?'Распределение газа между водой и воздухом отдельно не рассчитывается':'Смешивается с водными растворами'};
 if(s.stock&&s.state==='aqueous')s.properties.concentration=`${s.concentration||.2} моль/л`;
 s.details=[entry[1],`Состав формульной единицы: ${Object.entries(s.atoms).map(([atom,count])=>`${atom} — ${count}`).join(', ')}. Молярная масса ${s.molarMass.toLocaleString('ru-RU',{maximumFractionDigits:3})} г/моль.`,s.sourcing];
 if(s.stock&&s.state==='aqueous')s.details.push(`В шкафу находится водный раствор ${s.concentration||.2} моль/л. Вода учитывается отдельно; обозначение ${s.formula} не означает чистую жидкость.`);
}

export function createMixture(id, ml=80) {
 const mix={amounts:{},temperature:22,pressure:1,gasAmounts:{},escaped:{},activity:{},clock:0,lastEvents:{}};
 const s=SUBSTANCES[id];
 if(!s || !Number.isFinite(ml) || ml<=0) return mix;
 if(id==='water') mix.amounts.water=ml/WATER_ML;
 else if(s.state==='aqueous') {mix.amounts.water=ml/WATER_ML;mix.amounts[id]=ml*(s.concentration||.2);}
 else if(s.state==='solid') mix.amounts[id]=ml/(s.molarVolume||.03);
 else if(s.state==='gas') {
  mix.temperature=id==='steam'?100:22;
  mix.gasAmounts[id]=ml/(GAS_R*(mix.temperature+273.15));
  mix.gasSample=true;mix.gasHeadspaceMl=ml;
 }
 return mix;
}

function ensure(mix) {
 mix.amounts ||= {};mix.gasAmounts ||= {};mix.escaped ||= {};mix.activity ||= {};mix.lastEvents ||= {};mix.clock ||= 0;
 if(!Number.isFinite(mix.temperature))mix.temperature=22;
 if(!Number.isFinite(mix.pressure))mix.pressure=1;
 return mix;
}

export function volume(mix) {
 if(!mix?.amounts)return 0;
 const ml=Math.max(0,mix.amounts.water||0)*WATER_ML;
 let residue=0,solids=0;
 for(const [id,amount] of Object.entries(mix.amounts)) {
  const s=SUBSTANCES[id];
  if(s?.state==='solid')solids+=Math.max(0,amount)*(s.molarVolume||.03);
  else if(s?.state==='aqueous')residue+=Math.max(0,amount)*(s.molarMass||80)/2000;
 }
 // Dry residues must remain visible and transferable after water has boiled
 // away. A density of 2 g/mL is only a display-volume approximation.
 return Math.max(ml,residue)+solids;
}

export function transfer(source,target,requested) {
 if(!source||!target||source===target||!Number.isFinite(requested)||requested<=0)return 0;
 ensure(source);ensure(target);
 const from=volume(source),to=volume(target);
 if(from<EPS)return 0;
 const moved=Math.min(from,requested),fraction=moved/from;
 const sourceParts=Object.entries(source.amounts).filter(([,n])=>n*fraction>EPS).map(([id])=>id);
 const targetParts=new Set(Object.entries(target.amounts).filter(([,n])=>n>EPS).map(([id])=>id));
 const differentParts=sourceParts.length!==targetParts.size||sourceParts.some(id=>!targetParts.has(id));
 // This is preparation history, not a reaction. Include solvent here so
 // dilution differs from dispensing another portion of the same stock.
 target.physicallyMixed=source.physicallyMixed===true||(to>EPS&&(target.physicallyMixed===true||differentParts));
 const existing=new Set(Object.entries(target.amounts).filter(([id,n])=>id!=='water'&&n>EPS).map(([id])=>id));
 const incoming=Object.entries(source.amounts).filter(([id,n])=>id!=='water'&&n*fraction>EPS).map(([id])=>id);
 const sameComposition=incoming.every(id=>existing.has(id));
 const incomingProducts=Array.isArray(source.formedProducts)?source.formedProducts:null;
 // Dilution and moving the same material preserve its provenance. Adding an
 // unrelated solute resets the headline until another reaction actually runs.
 if(existing.size&&incoming.length&&!sameComposition)target.formedProducts=[];
 else if(!existing.size&&incomingProducts)target.formedProducts=[...incomingProducts];
 else if(!existing.size&&incoming.length)target.formedProducts=[];
 target.temperature=(target.temperature*to+source.temperature*moved)/(to+moved);
 for(const [id,amount] of Object.entries(source.amounts)) {
  const parcel=amount*fraction;
  target.amounts[id]=(target.amounts[id]||0)+parcel;
  source.amounts[id]-=parcel;
  if(source.amounts[id]<EPS)delete source.amounts[id];
 }
 // Carry the provenance of products along with their material. This is only
 // presentation metadata; composition remains the authority for every label.
 if(Array.isArray(target.formedProducts))target.formedProducts=target.formedProducts.filter(id=>(target.amounts[id]||0)>EPS);
 return moved;
}

/** Ideal charge-balance estimate for the supported acid/base families.
 * Acetate, carbonate and phosphate compete in ONE solution rather than being
 * chosen by whichever species happens to be listed first. Activity, gas
 * dissolution, metal complexation and full precipitation equilibria are absent.
 */
export function getPH(mix) {
 const a=mix?.amounts||{},water=(a.water||0)*WATER_ML;
 if(water<.01)return null;
 const acid=(a.hcl||0)+2*(a.sulfuric_acid||0)+(a.sodium_bisulfate||0),base=(a.naoh||0)+(a.potassium_hydroxide||0);
 const acetateSalts=(a.sodium_acetate||0)+(a.potassium_acetate||0)+2*((a.calcium_acetate||0)+(a.magnesium_acetate||0)+(a.zinc_acetate||0));
 const acetateTotal=((a.acetic_acid||0)+acetateSalts)/water;
 const carbonateTotal=((a.sodium_bicarbonate||0)+(a.sodium_carbonate||0))/water;
 const phosphateTotal=((a.phosphoric_acid||0)+(a.sodium_dihydrogen_phosphate||0)+(a.disodium_hydrogen_phosphate||0)+(a.trisodium_phosphate||0))/water;
 const fixedCharge=(base-acid+acetateSalts+(a.sodium_bicarbonate||0)+2*(a.sodium_carbonate||0)+(a.sodium_dihydrogen_phosphate||0)+2*(a.disodium_hydrogen_phosphate||0)+3*(a.trisodium_phosphate||0))/water;
 const solidBase=Math.min(.025,2*(a.calcium_hydroxide||0)/water)+Math.min(.0002,2*(a.magnesium_hydroxide||0)/water);
 if(acetateTotal+carbonateTotal+phosphateTotal<1e-10&&Math.abs(fixedCharge)+solidBase<1e-10){
  // Only qualitative hydrolysis baselines when no other acid/base family is present.
  if((a.iron3_sulfate||0)+(a.iron3_chloride||0)>EPS)return 2.5;
  if((a.cuso4||0)+(a.copper_chloride||0)>EPS)return 4.8;
  if((a.iron_sulfate||0)+(a.iron_chloride||0)>EPS)return 5.5;
  if((a.zinc_sulfate||0)+(a.zinc_chloride||0)>EPS)return 5.5;
  return 7;
 }
 const ka=1.74e-5,c1=4.47e-7,c2=4.68e-11,p1=7.1e-3,p2=6.3e-8,p3=4.5e-13;
 const balance=ph=>{
  const h=10**(-ph),h2=h*h,h3=h2*h;
  const acetateCharge=acetateTotal*ka/(ka+h);
  const carbonateCharge=carbonateTotal*(c1*h+2*c1*c2)/(h2+c1*h+c1*c2);
  const phosphateCharge=phosphateTotal*(p1*h2+2*p1*p2*h+3*p1*p2*p3)/(h3+p1*h2+p1*p2*h+p1*p2*p3);
  return h-1e-14/h+fixedCharge+solidBase-acetateCharge-carbonateCharge-phosphateCharge;
 };
 let lo=0,hi=14;
 for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(balance(mid)>0)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}

function hexRgb(hex) {return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function rgbHex(rgb){return '#'+rgb.map(n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0')).join('');}
export function appearance(mix) {
 const a=mix?.amounts||{},waterMl=Math.max(0,a.water||0)*WATER_ML,hasLiquid=waterMl>EPS;
 const ph=hasLiquid?getPH(mix):null,ml=Math.max(waterMl,.01);
 let optical=0,liquidRGB=[0,0,0],solidMl=0,solidRGB=[0,0,0];
 const pigment=(hex,weight)=>{if(weight<=0)return;const c=hexRgb(hex);optical+=weight;for(let k=0;k<3;k++)liquidRGB[k]+=c[k]*weight;};
 for(const [id,n] of Object.entries(a)) {
  const s=SUBSTANCES[id];if(!s||n<=EPS)continue;
  if(s.state==='solid'||(!hasLiquid&&s.state==='aqueous')) {
   const v=n*(s.state==='solid'?(s.molarVolume||.03):s.molarMass/2000),c=hexRgb(s.residueColor||s.color);
   solidMl+=v;for(let k=0;k<3;k++)solidRGB[k]+=c[k]*v;
  } else if(hasLiquid&&s.solutionColor)pigment(s.solutionColor,n/ml*s.opticalStrength);
 }
 // Indicator concentration matters: a vanishing trace cannot repaint a vessel.
 if(ph!==null&&(a.phenolphthalein||0)>EPS) {
  const transition=clamp((ph-8.2)/1.8,0,1);
  pigment('#eb55ac',(a.phenolphthalein/ ml)*250000*transition);
 }
 if(ph!==null&&(a.bromothymol_blue||0)>EPS) {
  const t=clamp((ph-6)/1.6,0,1),c=t<.5?blend('#e1c94c','#63b995',t*2):blend('#63b995','#458ed1',(t-.5)*2);
  pigment(c,(a.bromothymol_blue/ml)*180000);
 }
 return {liquidColor:optical>EPS?rgbHex(liquidRGB.map(n=>n/optical)):CLEAR_COLOR,liquidOpacity:hasLiquid?.1+.65*(1-Math.exp(-optical)):0,solidColor:solidMl>EPS?rgbHex(solidRGB.map(n=>n/solidMl)):'#eeede7',solidFraction:clamp(solidMl/Math.max(volume(mix),EPS),0,1),hasLiquid};
}
function blend(a,b,t){const x=hexRgb(a),y=hexRgb(b);return rgbHex(x.map((n,i)=>n+(y[i]-n)*t));}
export function color(mix) {const look=appearance(mix);return look.hasLiquid?look.liquidColor:look.solidColor;}

export function components(mix) {
 const dry=(mix?.amounts?.water||0)*WATER_ML<.01;
 return Object.entries(mix?.amounts||{}).filter(([,v])=>v>EPS).map(([id,amount])=>({id,name:SUBSTANCES[id]?.name||id,formula:SUBSTANCES[id]?.formula||id,state:dry&&SUBSTANCES[id]?.state==='aqueous'?'solid':SUBSTANCES[id]?.state||'unknown',amount})).sort((a,b)=>(a.id==='water')-(b.id==='water')||b.amount-a.amount);
}
export function describe(mix) {
 const list=components(mix).filter(s=>s.id!=='water');
 if(!list.length)return (mix?.amounts?.water||0)>EPS?'Дистиллированная вода':'Пустой сосуд';
 return list.map(s=>s.formula+(s.state==='solid'?' ↓':'')).join(' · ');
}

/** Identify what is actually present, keeping excess reagents in the name.
 * Water is omitted from a wet mixture's short formula only as solvent.
 */
export function identifyMixture(mix) {
 const entries=components(mix),nonwater=entries.filter(s=>s.id!=='water');
 const largest=Math.max(0,...nonwater.map(s=>s.amount));
 const threshold=Math.max(1e-5,largest*1e-4);
 const significant=nonwater.filter(s=>s.amount>threshold);
 const traceIds=nonwater.filter(s=>s.amount<=threshold).map(s=>s.id);
 if(!significant.length) {
  if((mix?.amounts?.water||0)>EPS)return {name:'Дистиллированная вода',formula:'H₂O',description:SUBSTANCES.water.description,ids:['water'],status:'single'};
  const gases=Object.entries(mix?.gasAmounts||{}).filter(([id,n])=>SUBSTANCES[id]&&n>EPS).map(([id])=>id);
  if(gases.length)return {name:gases.length===1?SUBSTANCES[gases[0]].name:'Газовая смесь: '+gases.map(id=>SUBSTANCES[id].name.toLocaleLowerCase('ru-RU')).join(' + '),formula:gases.map(id=>SUBSTANCES[id].formula).join(' + '),description:'Газ удерживается закрытым сосудом. '+(gases.length===1?SUBSTANCES[gases[0]].description:'Состав включает несколько газообразных веществ.'),ids:gases,gasIds:gases,status:gases.length===1?'single':'mixture'};
  return {name:'Пустой сосуд',formula:'',description:'В сосуде нет учтённых веществ.',ids:[],status:'empty'};
 }
 const wet=(mix?.amounts?.water||0)*WATER_ML>.01;
 if(significant.length===1) {
  const part=significant[0],s=SUBSTANCES[part.id];
  if(wet&&mix.physicallyMixed===true)return {name:'Смесь веществ',formula:s.formula+' + H₂O',description:(s.state==='solid'?'Твёрдое вещество в воде. ':'Водный раствор. ')+'Образец получен физическим смешиванием; это не новое химическое соединение. '+s.description,ids:[s.id],traceIds,status:'mixture'};
  return {name:s.name,formula:s.formula,description:(wet?(s.state==='solid'?'Твёрдое вещество в воде. ':'Водный раствор. '):'')+s.description+(traceIds.length?' Есть следовые компоненты, не включённые в короткое название.':''),ids:[s.id],traceIds,status:'single'};
 }
 return {name:'Смесь: '+significant.map(s=>s.name.toLocaleLowerCase('ru-RU')).join(' + '),formula:significant.map(s=>s.formula).join(' + '),description:'Несколько компонентов'+(wet?' в воде':'')+': '+significant.map(s=>s.name.toLocaleLowerCase('ru-RU')).join(', ')+'. Это смесь, а не индивидуальное соединение.'+(traceIds.length?' Следовые компоненты опущены только в коротком названии.':''),ids:significant.map(s=>s.id),traceIds,status:'mixture'};
}

/** Name an actual reaction product without pretending the whole vessel is pure. */
export function identifyProduct(mix) {
 const identity=identifyMixture(mix),ids=new Set(identity.ids);
 const legacy=REACTIONS.filter(r=>Number.isFinite(mix?.lastEvents?.[r.id])).sort((a,b)=>mix.lastEvents[b.id]-mix.lastEvents[a.id]).flatMap(r=>Object.keys(r.products).sort((a,b)=>(SUBSTANCES[b]?.state==='solid')-(SUBSTANCES[a]?.state==='solid')));
 const products=(Array.isArray(mix?.formedProducts)?mix.formedProducts:legacy).filter(id=>id!=='water'&&ids.has(id)&&Object.hasOwn(SUBSTANCES,id));
 const id=products[0];
 if(!id)return null;
 const s=SUBSTANCES[id];
 return {id,name:s.name,formula:s.formula,description:s.description,mixed:identity.status==='mixture',otherIds:identity.ids.filter(other=>other!==id)};
}

function emit(mix,events,key,event,interval=5) {
 if(mix.lastEvents[key]===undefined||mix.clock-mix.lastEvents[key]>interval) {
  events.push(event);mix.lastEvents[key]=mix.clock;
 }
}
function gas(mix,id,amount,sealed){
 const destination=sealed?mix.gasAmounts:mix.escaped;
 destination[id]=(destination[id]||0)+amount;
}

// NIST Antoine fits, pressure in bar converted to atm, valid below 100°C.
// Above that, use a continuous Clausius–Clapeyron approximation; this is not
// a high-pressure steam equation of state.
function waterVapourPressure(celsius) {
 const t=Math.max(273.15,celsius+273.15);
 if(t>373.15)return Math.exp(40650/8.3144626*(1/373.15-1/t));
 const [A,B,C]=t<=303?[5.40221,1838.675,-31.737]:t<=333?[5.20389,1733.926,-39.485]:t<=363?[5.0768,1659.793,-45.854]:[5.08354,1663.125,-45.622];
 return 10**(A-B/(t+C))/1.01325;
}

export function stepChemistry(mix,dt,options={}) {
 if(!mix)return [];
 ensure(mix);
 if(!Number.isFinite(dt)||dt<=0)return [];
 dt=Math.min(dt,.25);
 mix.clock+=dt;
 const events=[],a=mix.amounts,sealed=!!options.sealed,heating=clamp(options.heating||0,0,1);
 for(const key of Object.keys(mix.activity))mix.activity[key]*=Math.exp(-dt*3);
 if(!sealed) {
  for(const [id,n]of Object.entries(mix.gasAmounts))mix.escaped[id]=(mix.escaped[id]||0)+n;
  mix.gasAmounts={};mix.pressure=1;mix.ruptured=false;
  mix.gasSample=false;
 }
 const ml=volume(mix),waterMl=(a.water||0)*WATER_ML;
 // Thermal time is accelerated x4. Heat capacity and latent heat are water-like.
 const capacity=Math.max(18,waterMl*4.18+Math.max(0,ml-waterMl)*1.2);
 const heat=(heating*450-(mix.temperature-22)*.55)*dt*4;
 mix.temperature=Math.max(0,mix.temperature+heat/capacity);
 const wet=waterMl>.02;
 for(const r of REACTIONS) {
  if(r.aqueous&&!wet)continue;
  if(r.dry&&waterMl>.1)continue;
  if(r.minTemp&&mix.temperature<r.minTemp)continue;
  if(r.catalysts?.some(id=>(a[id]||0)<1e-5))continue;
  if(r.blockedBy?.some(id=>(a[id]||0)>EPS))continue;
  if(r.minConcentration&&Object.keys(r.reactants).some(id=>SUBSTANCES[id]?.state==='aqueous'&&(a[id]||0)/Math.max(waterMl,.01)<r.minConcentration))continue;
  if(Object.keys(r.reactants).some(id=>(a[id]||0)<EPS))continue;
  if(r.minPH&&getPH(mix)<r.minPH)continue;
  const limit=Math.min(...Object.entries(r.reactants).map(([id,n])=>a[id]/n));
  const tempRate=Math.exp(clamp((mix.temperature-22)/70,0,1.6));
  const extent=limit<1e-5?limit:limit*(1-Math.exp(-r.rate*tempRate*dt));
  if(extent<EPS)continue;
  mix.physicallyMixed=false; // The latest change is now an actual reaction.
  for(const [id,n]of Object.entries(r.reactants)){a[id]-=n*extent;if(a[id]<EPS)delete a[id];}
  let gasAmount=0;
  for(const [id,n]of Object.entries(r.products)){
   if(SUBSTANCES[id].state==='gas'){gas(mix,id,n*extent,sealed);gasAmount+=n*extent;}
   else a[id]=(a[id]||0)+n*extent;
  }
  mix.formedProducts=[...new Set([...Object.keys(r.products).filter(id=>id!=='water'&&SUBSTANCES[id].state!=='gas').sort((a,b)=>(SUBSTANCES[b].state==='solid')-(SUBSTANCES[a].state==='solid')),...(mix.formedProducts||[])])].slice(0,64);
  if(r.heat)mix.temperature+=extent*r.heat/capacity;
  mix.activity[r.type]=Math.max(mix.activity[r.type]||0,clamp(extent/dt*.5,0,1));
  const event={type:r.type,title:r.title,equation:r.equation,description:r.description||'Продукты образуются в стехиометрическом отношении.',intensity:clamp(extent/dt*.5,.1,1),color:r.color||color(mix),reactionId:r.id,amount:gasAmount};
  emit(mix,events,r.id,event,8);
 }
 // Open-water boiling removes solvent, retaining nonvolatile dissolved species.
 const boilingPoint=sealed?100+Math.max(0,(mix.pressure-1)*22):100;
 if((a.water||0)>EPS&&mix.temperature>=boilingPoint) {
  const surplus=(mix.temperature-boilingPoint)*capacity;
  const evap=Math.min(a.water,Math.max(0,surplus)/40.65);
  if(evap>0){a.water-=evap;gas(mix,'steam',evap,sealed);}
  const remainingHeat=Math.max(0,surplus-evap*40.65);
  mix.temperature=(a.water||0)<EPS?boilingPoint+remainingHeat/Math.max(18,volume(mix)*1.2):boilingPoint;
  mix.activity.boil=heating;
  if(heating>0)emit(mix,events,'boil',{type:'boil',title:'Вода кипит',equation:'H₂O(l) → H₂O(g)',description:'Испаряется растворитель; нелетучие вещества остаются в сосуде.',intensity:heating,color:'#bfd9d5'},12);
 }
 if(sealed) {
  const headspace=Math.max(5,(options.capacity||mix.gasHeadspaceMl||150)-volume(mix));
  // Supersaturated steam condenses as the sample cools. Condensation returns
  // precisely the same H2O molecules and releases their latent heat.
  const steam=mix.gasAmounts.steam||0;
  const saturated=waterVapourPressure(mix.temperature)*headspace/(GAS_R*(mix.temperature+273.15));
  if(steam>saturated) {
   const condensed=(steam-saturated)*(1-Math.exp(-dt*2));
   mix.gasAmounts.steam-=condensed;a.water=(a.water||0)+condensed;
   mix.temperature+=condensed*40.65/capacity;
   mix.activity.condensation=clamp(condensed/dt,0,1);
  }
  const gasMmol=Object.values(mix.gasAmounts).reduce((x,y)=>x+y,0);
  const airPressure=mix.gasSample?0:(mix.temperature+273.15)/295.15;
  mix.pressure=Math.max(0,airPressure+gasMmol*GAS_R*(mix.temperature+273.15)/headspace);
  if(mix.pressure>3&&!mix.ruptured) {
   mix.ruptured=true;
   events.push({type:'explosion',title:'Сосуд разорвало давлением',equation:'P ↑',description:'Запертый газ и пар повысили давление. Это механическое разрушение, а не горение. Порог прочности в игре условный.',intensity:clamp(mix.pressure/5,.5,1),color:'#d3e7df',pressure:mix.pressure});
  }
 }
 for(const id of Object.keys(a))if(a[id]<EPS)delete a[id];
 mix.precipitate=components(mix).filter(s=>s.state==='solid').reduce((sum,s)=>sum+s.amount,0);
 return events;
}

export const MODEL_NOTES = `Учебная модель: ${Object.keys(SUBSTANCES).length} веществ, ${Object.values(SUBSTANCES).filter(s=>s.stock).length} исходных и специальных реактивов, ${REACTIONS.length} заданных реакций. Производные продукты достижимы от исходного набора. Количество вещества — ммоль, объём — мл; скорости и нагрев ускорены. pH приблизительный, давление и прочность условные. Не рассчитываются все равновесия, комплексообразование, растворимость, летучесть кислот и окисление воздухом. Гидраты и сложные осадки представлены упрощёнными формулами. Отсутствие реакции в игре не доказывает её отсутствие в природе.`;
