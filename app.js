const $ = s => document.querySelector(s);
const escape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, players;
const dates=['2026-10-04','2026-10-11','2026-10-18','2026-10-25','2026-10-31','2026-11-01'];
const label = date => new Date(date+'T12:00:00+07:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'Asia/Jakarta'}).toUpperCase();
function aggregate(d){
 const map=new Map();
 for(const result of d.results)for(const name of result.players){
  if(!map.has(name))map.set(name,{name,points:0,stages:[],w:0,l:0,ppd:[],mpr:[],pending:false,pendingPPD:false,pendingMPR:false});
  const p=map.get(name);p.points+=result.points;p.stages.push(result.stage);
 }
 for(const leg of d.legs)leg.players.forEach((name,i)=>{
  const p=map.get(name);if(!p)return;p[leg.result.toLowerCase()]++;
  if(Number.isFinite(leg.stats[i]))p[leg.game==='CR MPR'?'mpr':'ppd'].push(leg.stats[i]);
  if(leg.provisionalPlayers?.includes(name)){p.pending=true;p[leg.game==='CR MPR'?'pendingMPR':'pendingPPD']=true;}
 });
 const list=[...map.values()].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
 list.forEach(p=>p.rank=1+list.filter(q=>q.points>p.points).length);return list;
}
function renderBoard(){const q=$('#search').value.trim().toLowerCase(),shown=players.filter(p=>p.name.toLowerCase().includes(q));
 $('#count').textContent=`${players.length} PLAYERS · ${data.publishedStages.length} / 6 STAGES`;
 $('#board').innerHTML=shown.map(p=>`<tr class="${p.rank===1?'top':''}"><td>${String(p.rank).padStart(2,'0')}</td><td><button class="player-link" data-name="${escape(p.name)}"><span class="avatar" aria-hidden="true">${escape(p.name.slice(0,2).toUpperCase())}</span>${escape(p.name)}</button></td><td>${p.stages.length}</td><td>${p.w} – ${p.l}</td><td>${Math.round(p.w/(p.w+p.l)*100)||0}%</td><td>${p.points}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No player found.</td></tr>';
}
function getMatches(stage){const map=new Map();for(const l of data.legs.filter(l=>l.stage===stage)){
 const key=l.match;if(!map.has(key))map.set(key,{id:key,a:l.players,b:l.opponents,aw:0,bw:0});
 const m=map.get(key);if(l.players.join('|')===m.a.join('|')){m[l.result==='W'?'aw':'bw']++;}
 }return [...map.values()];}
function renderResults(){const stage=+$('#stage-select').value;if(!data.publishedStages.length){$('#match-count').textContent='No published stages yet';$('#podium').innerHTML='';$('#matches').innerHTML='<p class="empty">Results will appear after the first stage is published.</p>';return;}const results=data.results.filter(r=>r.stage===stage),matches=getMatches(stage);
 $('#match-count').textContent=`${matches.length} MATCHES · ${label(dates[stage-1])} 2026`;
 $('#podium').innerHTML=[['Champion','CHAMPIONS'],['Runner-up','RUNNERS-UP'],['Joint 3rd','JOINT THIRD'],['3rd','THIRD'],['4th','FOURTH']].map(([key,title])=>{const rs=results.filter(r=>r.finish===key);return rs.length?`<div class="award"><small>${title}</small><strong>${rs.map(r=>r.players.map(escape).join(' & ')).join('<br>')}</strong><p>${rs[0].points} points per player</p></div>`:'';}).join('');
 const groups=[['RR-A','ROUND ROBIN · GROUP A'],['RR-B','ROUND ROBIN · GROUP B'],['SF','SEMIFINALS'],['UB1','UPPER BRACKET · ROUND 1'],['UB2','UPPER BRACKET · ROUND 2'],['UB Final','UPPER BRACKET FINAL'],['LB1','LOWER BRACKET · ROUND 1'],['LB2','LOWER BRACKET · ROUND 2'],['LB3','LOWER BRACKET · ROUND 3'],['LB Final','LOWER BRACKET FINAL'],['Grand final','GRAND FINAL'],['Final reset','FINAL RESET'],['Final','FINAL']];
 const rendered=new Set();let html='';
 for(const [prefix,title]of groups){const list=matches.filter(m=>!rendered.has(m.id)&&m.id.startsWith(prefix));if(!list.length)continue;html+=`<h3 class="match-heading">${title}</h3>`;for(const m of list){rendered.add(m.id);html+=matchHTML(m);}}
 const other=matches.filter(m=>!rendered.has(m.id));if(other.length)html+='<h3 class="match-heading">MATCHES</h3>'+other.map(matchHTML).join('');$('#matches').innerHTML=html;
}
function matchHTML(m){return `<div class="match"><span class="${m.aw>m.bw?'winner':''}">${m.a.map(escape).join(' / ')}</span><span class="score">${m.aw} : ${m.bw}</span><span class="${m.bw>m.aw?'winner':''}">${m.b.map(escape).join(' / ')}</span></div>`;}
const mean = values => values.length ? (values.reduce((sum,value)=>sum+value,0)/values.length).toFixed(2) : '—';
function roundLabel(id){
 const group=id.match(/^RR-([A-Z])/i);if(group)return `Round robin · Group ${group[1].toUpperCase()}`;
 if(/^RR/i.test(id))return 'Round robin';
 if(/^SF/i.test(id))return 'Semifinal';
 if(/^Grand final/i.test(id))return 'Grand final';
 if(/^Final reset/i.test(id))return 'Final reset';
 if(/^Final/i.test(id))return 'Final';
 if(/^UB Final/i.test(id))return 'Upper bracket final';
 if(/^LB Final/i.test(id))return 'Lower bracket final';
 const bracket=id.match(/^(UB|LB)(\d+)/i);if(bracket)return `${bracket[1].toUpperCase()==='UB'?'Upper':'Lower'} bracket · Round ${bracket[2]}`;
 return id;
}
function matchOrder(match){
 const id=match.id,number=id.match(/#(\d+)/);
 if(/^RR/i.test(id))return [0,0];
 if(number)return [1,Number(number[1])];
 if(/^(UB|LB)(\d+)/i.test(id))return [1,Number(id.match(/\d+/)[0])*2+(/^LB/i.test(id)?1:0)];
 if(/^UB Final/i.test(id))return [1,90];
 if(/^LB Final/i.test(id))return [1,91];
 if(/^SF/i.test(id))return [2,0];
 if(/^Grand final/i.test(id))return [3,0];
 if(/^Final reset/i.test(id))return [4,0];
 if(/^Final/i.test(id))return [3,0];
 return [1,0];
}
function profileMatch(stage,match,name){
 const ownA=match.a.includes(name),own=ownA?match.a:match.b,opponents=ownA?match.b:match.a;
 const won=ownA?match.aw:match.bw,lost=ownA?match.bw:match.aw,partner=own.find(n=>n!==name);
 const legs=data.legs.filter(l=>l.stage===stage&&l.match===match.id&&l.players.includes(name)).sort((a,b)=>a.leg-b.leg);
 const stat=(leg,player)=>{const value=leg.stats[leg.players.indexOf(player)];return Number.isFinite(value)?`${value.toFixed(2)}${leg.provisionalPlayers?.includes(player)?'*':''}`:'—';};
 const averages=['701 PPD','CR MPR'].map(game=>{const records=legs.filter(l=>l.game===game),values=records.map(l=>l.stats[l.players.indexOf(name)]).filter(Number.isFinite);return `${mean(values)}${records.some(l=>l.provisionalPlayers?.includes(name))?'*':''} ${game==='701 PPD'?'PPD':'MPR'}`;});
 const rows=legs.map(leg=>`<tr><td><span>${leg.leg} · ${leg.game==='CR MPR'?'Cricket':'701'}</span><small>${leg.game==='CR MPR'?'MPR':leg.game==='701 PPR'?'PPR':'PPD'}</small></td><td class="leg-result ${leg.result==='W'?'leg-won':''}">${escape(leg.result)}</td><td class="own-stat">${stat(leg,name)}</td><td>${stat(leg,partner)}</td></tr>`).join('');
 const sequence=legs.map(l=>`<span class="leg-chip ${l.result==='W'?'leg-won':'leg-lost'}" aria-hidden="true">${escape(l.result)}</span>`).join('');
 const sequenceLabel=legs.map(l=>l.result==='W'?'win':'loss').join(', ');
 return `<article class="profile-match"><div class="profile-match-head"><div><h4>${escape(roundLabel(match.id))} · with ${escape(partner)}</h4><p>vs ${opponents.map(escape).join(' / ')}</p></div><b class="profile-score">${won>lost?'W':'L'} &nbsp; ${won}–${lost}</b></div><details class="leg-details"><summary aria-label="Pair leg results: ${sequenceLabel}. Leg stats against ${opponents.map(escape).join(' / ')}"><span class="leg-sequence">${sequence}</span><span class="leg-toggle"><span class="when-closed">View legs <span aria-hidden="true">+</span></span><span class="when-open">Hide legs <span aria-hidden="true">−</span></span></span></summary><div class="leg-table-wrap"><table class="leg-table"><caption class="sr-only">${escape(name)} and ${escape(partner)}: leg statistics</caption><thead><tr><th scope="col">Leg / game</th><th scope="col">Pair</th><th scope="col">${escape(name)}</th><th scope="col">${escape(partner)}</th></tr></thead><tbody>${rows}</tbody></table></div><p class="match-averages">${escape(name)} this match <span>${averages.join(' · ')}</span></p>${legs.some(l=>l.provisionalPlayers?.length)?'<p class="leg-note">* Estimated or unconfirmed stat.</p>':''}</details></article>`;
}
function profile(name){const p=players.find(p=>p.name===name);if(!p)return;
 let history='';for(const stage of [...p.stages].sort((a,b)=>a-b)){
  const result=data.results.find(r=>r.stage===stage&&r.players.includes(name));
  history+=`<h3 class="match-heading">STAGE ${stage} · ${escape(result.finish)} · +${result.points} PTS</h3>`;
  const matches=getMatches(stage).filter(m=>[...m.a,...m.b].includes(name)).sort((a,b)=>{const x=matchOrder(a),y=matchOrder(b);return x[0]-y[0]||x[1]-y[1];});
  history+=matches.map(match=>profileMatch(stage,match,name)).join('');
 }
 $('#profile-content').innerHTML=`<p class="eyebrow">RANK ${p.rank}</p><h2>${escape(name)}</h2><div class="stats"><div class="stat"><b>${p.points}</b><small>POINTS</small></div><div class="stat"><b>${p.w}–${p.l}</b><small>LEGS W–L</small></div><div class="stat"><b>${mean(p.ppd)}${p.pendingPPD?'*':''}</b><small>AVG. PPD</small></div><div class="stat"><b>${mean(p.mpr)}${p.pendingMPR?'*':''}</b><small>AVG. MPR</small></div></div>${p.pending?'<p class="badge">* Includes an estimated or unconfirmed stat.</p>':''}<p class="note">${p.ppd.length} 701 legs · ${p.mpr.length} Cricket legs.<br>Each recorded leg counts equally in the averages.<br>PPD: points per dart. MPR: marks per round.</p>${history}`;
 $('#profile').showModal();
}
const ratingBands={
 ppd:[0,10.65,11.90,13.15,14.40,15.65,16.90,18.15,19.45,20.75,22.05,23.35,24.65,25.95,27.30,28.65,30.00,31.35,32.70,34.05,35.40,36.80,38.20,39.60,41.00,42.40,43.80,45.20,46.60,48.00],
 mpr:[0,1.10,1.20,1.31,1.46,1.61,1.76,1.91,2.06,2.21,2.36,2.51,2.66,2.81,2.96,3.11,3.26,3.41,3.56,3.71,3.86,4.07,4.28,4.49,4.70,4.96,5.22,5.48,5.74,6.00]
};
function ratingFor(value,game){
 if(!Number.isFinite(value)||value<0)return null;
 const bands=ratingBands[game];let rating=1;
 for(let i=1;i<bands.length;i++){if(value<bands[i])break;rating=i+1;}
 if(rating===bands.length)return rating;
 const lower=bands[rating-1],upper=bands[rating];
 return rating+(value-lower)/(upper-lower);
}
function performanceStats(player){
 const ppd=player.ppd.length?player.ppd.reduce((sum,value)=>sum+value,0)/player.ppd.length:null,mpr=player.mpr.length?player.mpr.reduce((sum,value)=>sum+value,0)/player.mpr.length:null;
 const legs=player.w+player.l,rt01=ratingFor(ppd,'ppd'),rtCr=ratingFor(mpr,'mpr');
 const estimatedRating=rt01===null||rtCr===null?null:(rt01+rtCr)/2;
 return {...player,ppd,mpr,estimatedRating,ppdLegs:player.ppd.length,mprLegs:player.mpr.length,rt01,rtCr,legs,difference:player.w-player.l,winRate:legs?player.w/legs:null,stagesPlayed:player.stages.length};
}
let performanceSort={key:'estimatedRating',direction:'desc'};
function renderPerformance(){
 const query=$('#performance-search').value.trim().toLowerCase(),minimum=Number($('#minimum-legs').value);
 const list=players.map(performanceStats).filter(p=>p.name.toLowerCase().includes(query)&&p.legs>=minimum);
 const {key,direction}=performanceSort;
 list.sort((a,b)=>{const x=a[key],y=b[key];if(x==null&&y==null)return a.name.localeCompare(b.name);if(x==null)return 1;if(y==null)return -1;const compared=key==='name'?x.localeCompare(y):x-y;return (direction==='asc'?compared:-compared)||a.name.localeCompare(b.name);});
 $('#performance-count').textContent=`${list.length} / ${players.length} PLAYERS`;
 document.querySelectorAll('.performance-table th[data-sort]').forEach(th=>{const active=th.dataset.sort===key;th.setAttribute('aria-sort',active?(direction==='asc'?'ascending':'descending'):'none');th.querySelector('.sort-arrow').textContent=active?(direction==='asc'?' ↑':' ↓'):'';});
 const number=(value,pending=false)=>value==null?'—':`${value.toFixed(2)}${pending?'*':''}`;
 $('#performance-body').innerHTML=list.map(p=>`<tr><td><button class="player-link" data-name="${escape(p.name)}">${escape(p.name)}</button></td><td><b>${number(p.ppd,p.pendingPPD)}</b><small>${p.ppdLegs} legs</small></td><td><b>${number(p.mpr,p.pendingMPR)}</b><small>${p.mprLegs} legs</small></td><td><b>${number(p.estimatedRating,p.pendingPPD||p.pendingMPR)}</b></td><td>${p.legs}</td><td>${p.w}–${p.l}</td><td>${p.winRate===null?'—':Math.round(p.winRate*100)+'%'}</td><td>${p.stagesPlayed}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">No players match these filters.</td></tr>';
 $('#performance-estimates').hidden=!list.some(p=>p.pending);
}
async function fetchData(url){const response=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error('Feed unavailable');const d=await response.json();if(d.schemaVersion!==1||!Array.isArray(d.results)||!Array.isArray(d.legs)||!Array.isArray(d.publishedStages))throw Error('Invalid feed');return d;}
async function load(){const url=window.PRIME_CONFIG.feedUrl;let live=false,failed=false;
 try{data=await fetchData(url||'data.json');live=!!url;}catch(e){if(!url){$('#status').textContent='Unable to load results. Please refresh.';return;}data=await fetchData('data.json');failed=true;}
 players=aggregate(data);const updated=new Date(data.updatedAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'});
 $('#status').textContent=`${live?'Last checked':failed?'Could not refresh · showing saved results':'Saved results'} · ${updated} WIB`;
 $('.stage-track').innerHTML=dates.map((d,i)=>`<div class="stage-step ${data.publishedStages.includes(i+1)?'done':''}"><small>STAGE ${String(i+1).padStart(2,'0')}</small><b>${label(d)} <span>· ${i===4?'SAT':'SUN'}</span></b></div>`).join('');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}),next=dates.findIndex(d=>d>=today&&!data.publishedStages.includes(dates.indexOf(d)+1));
 if(next>=0){$('.next .eyebrow').textContent=`NEXT · STAGE ${String(next+1).padStart(2,'0')}`;$('.next strong').innerHTML=`${dates[next].slice(-2)}<span>${next===5?'NOV':'OCT'} / ${next===4?'SAT':'SUN'}</span>`;}else{$('.next').innerHTML='<span class="eyebrow">CHAMPIONSHIP</span><strong>14–15<span>NOV 2026</span></strong><p>Northern Darts Championship</p>';}
 const chosen=+$('#stage-select').value;$('#stage-select').innerHTML=data.publishedStages.map(s=>`<option value="${s}">${s} · ${label(dates[s-1])}</option>`).join('');$('#stage-select').value=data.publishedStages.includes(chosen)?chosen:data.publishedStages.at(-1);renderBoard();renderResults();renderPerformance();
}
$('#search').addEventListener('input',renderBoard);$('#stage-select').addEventListener('change',renderResults);$('#board').addEventListener('click',e=>{const b=e.target.closest('[data-name]');if(b)profile(b.dataset.name);});$('.close').onclick=()=>$('#profile').close();$('#profile').addEventListener('click',e=>{if(e.target===$('#profile')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#performance-search').addEventListener('input',renderPerformance);$('#minimum-legs').addEventListener('change',renderPerformance);
document.querySelector('.performance-table thead').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const key=button.closest('th').dataset.sort;performanceSort={key,direction:performanceSort.key===key?(performanceSort.direction==='desc'?'asc':'desc'):(key==='name'?'asc':'desc')};renderPerformance();});
$('#performance-body').addEventListener('click',event=>{const button=event.target.closest('[data-name]');if(button)profile(button.dataset.name);});
const tabs=[...document.querySelectorAll('[role=tab]')];function activate(t){$('.section-head h2').textContent=({'tab-results':'Stage results','tab-performance':'Performance','tab-standings':'Individual standings'})[t.id];tabs.forEach(b=>{const on=b===t;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!on;});}
tabs.forEach((t,i)=>{t.onclick=()=>activate(t);t.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;activate(tabs[n]);tabs[n].focus();}};});
load().catch(()=>{$('#status').textContent='Results unavailable. Please refresh.';});if(window.PRIME_CONFIG.feedUrl)setInterval(()=>load().catch(()=>{$('#status').textContent='Could not refresh · showing previous results';}),300000);
