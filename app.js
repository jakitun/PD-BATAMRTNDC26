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
 $('#podium').innerHTML=[['Champion','CHAMPIONS'],['Runner-up','RUNNERS-UP'],['Joint 3rd','JOINT THIRD']].map(([key,title])=>{const rs=results.filter(r=>r.finish===key);return rs.length?`<div class="award"><small>${title}</small><strong>${rs.map(r=>r.players.map(escape).join(' & ')).join('<br>')}</strong><p>${rs[0].points} points per player</p></div>`:'';}).join('');
 const groups=[['RR-A','ROUND ROBIN · GROUP A'],['RR-B','ROUND ROBIN · GROUP B'],['SF','SEMIFINALS'],['Final','FINAL']];
 const rendered=new Set();let html='';
 for(const [prefix,title]of groups){const list=matches.filter(m=>m.id.startsWith(prefix));if(!list.length)continue;html+=`<h3 class="match-heading">${title}</h3>`;for(const m of list){rendered.add(m.id);html+=matchHTML(m);}}
 const other=matches.filter(m=>!rendered.has(m.id));if(other.length)html+='<h3 class="match-heading">MATCHES</h3>'+other.map(matchHTML).join('');$('#matches').innerHTML=html;
}
function matchHTML(m){return `<div class="match"><span class="${m.aw>m.bw?'winner':''}">${m.a.map(escape).join(' / ')}</span><span class="score">${m.aw} : ${m.bw}</span><span class="${m.bw>m.aw?'winner':''}">${m.b.map(escape).join(' / ')}</span></div>`;}
function profile(name){const p=players.find(p=>p.name===name);if(!p)return;const mean=a=>a.length?(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2):'—';
 let history='';for(const stage of p.stages){const r=data.results.find(r=>r.stage===stage&&r.players.includes(name));history+=`<h3 class="match-heading">STAGE ${stage} · ${escape(r.finish)} · +${r.points} PTS</h3>`;
 for(const m of getMatches(stage).filter(m=>[...m.a,...m.b].includes(name))){const a=m.a.includes(name),own=a?m.a:m.b,opp=a?m.b:m.a,w=a?m.aw:m.bw,l=a?m.bw:m.aw;history+=`<div class="profile-match"><span>${m.id.startsWith('RR')?'Round robin':m.id.startsWith('SF')?'Semifinal':m.id.startsWith('Final')?'Final':escape(m.id)} · with ${escape(own.find(n=>n!==name))}<br><small>vs ${opp.map(escape).join(' / ')}</small></span><b>${w>l?'W':'L'} &nbsp; ${w}–${l}</b></div>`;}}
 $('#profile-content').innerHTML=`<p class="eyebrow">RANK ${p.rank}</p><h2>${escape(name)}</h2><div class="stats"><div class="stat"><b>${p.points}</b><small>POINTS</small></div><div class="stat"><b>${p.w}–${p.l}</b><small>LEGS W–L</small></div><div class="stat"><b>${mean(p.ppd)}${p.pendingPPD?'*':''}</b><small>AVG. PPD</small></div><div class="stat"><b>${mean(p.mpr)}${p.pendingMPR?'*':''}</b><small>AVG. MPR</small></div></div>${p.pending?'<p class="badge">* Includes a stat awaiting confirmation.</p>':''}<p class="note">${p.ppd.length} 701 legs · ${p.mpr.length} Cricket legs.<br>Each recorded leg counts equally in the averages.<br>PPD: points per dart. MPR: marks per round.</p>${history}`;
 $('#profile').showModal();
}
async function fetchData(url){const response=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error('Feed unavailable');const d=await response.json();if(d.schemaVersion!==1||!Array.isArray(d.results)||!Array.isArray(d.legs)||!Array.isArray(d.publishedStages))throw Error('Invalid feed');return d;}
async function load(){const url=window.PRIME_CONFIG.feedUrl;let live=false,failed=false;
 try{data=await fetchData(url||'data.json');live=!!url;}catch(e){if(!url){$('#status').textContent='Unable to load results. Please refresh.';return;}data=await fetchData('data.json');failed=true;}
 players=aggregate(data);const updated=new Date(data.updatedAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'});
 $('#status').textContent=`${live?'Last checked':failed?'Could not refresh · showing saved results':'Saved results'} · ${updated} WIB`;
 $('.stage-track').innerHTML=dates.map((d,i)=>`<div class="stage-step ${data.publishedStages.includes(i+1)?'done':''}"><small>STAGE ${String(i+1).padStart(2,'0')}</small><b>${label(d)} <span>· ${i===4?'SAT':'SUN'}</span></b></div>`).join('');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}),next=dates.findIndex(d=>d>=today&&!data.publishedStages.includes(dates.indexOf(d)+1));
 if(next>=0){$('.next .eyebrow').textContent=`NEXT · STAGE ${String(next+1).padStart(2,'0')}`;$('.next strong').innerHTML=`${dates[next].slice(-2)}<span>${next===5?'NOV':'OCT'} / ${next===4?'SAT':'SUN'}</span>`;}else{$('.next').innerHTML='<span class="eyebrow">CHAMPIONSHIP</span><strong>14–15<span>NOV 2026</span></strong><p>Northern Darts Championship</p>';}
 const chosen=+$('#stage-select').value;$('#stage-select').innerHTML=data.publishedStages.map(s=>`<option value="${s}">${s} · ${label(dates[s-1])}</option>`).join('');$('#stage-select').value=data.publishedStages.includes(chosen)?chosen:data.publishedStages.at(-1);renderBoard();renderResults();
}
$('#search').addEventListener('input',renderBoard);$('#stage-select').addEventListener('change',renderResults);$('#board').addEventListener('click',e=>{const b=e.target.closest('[data-name]');if(b)profile(b.dataset.name);});$('.close').onclick=()=>$('#profile').close();$('#profile').addEventListener('click',e=>{if(e.target===$('#profile')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const tabs=[...document.querySelectorAll('[role=tab]')];function activate(t){$('.section-head h2').textContent=t.id==='tab-results'?'Stage results':'Individual standings';tabs.forEach(b=>{const on=b===t;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!on;});}
tabs.forEach((t,i)=>{t.onclick=()=>activate(t);t.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;activate(tabs[n]);tabs[n].focus();}};});
load().catch(()=>{$('#status').textContent='Results unavailable. Please refresh.';});if(window.PRIME_CONFIG.feedUrl)setInterval(()=>load().catch(()=>{$('#status').textContent='Could not refresh · showing previous results';}),300000);
