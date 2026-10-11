'use strict';
const $ = id => document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d');
const touchDevice=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch-device',touchDevice);
const storageKey='snake-tentations-v1';
let saved={total:0,best:0,records:[],skin:'jade',sound:false};
try{const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(data&&typeof data==='object'){saved.total=Math.max(0,Number(data.total)||0);saved.best=Math.max(0,Number(data.best)||0);saved.skin=['jade','amber','ice'].includes(data.skin)?data.skin:'jade';saved.sound=data.sound===true;saved.records=Array.isArray(data.records)?data.records.filter(r=>r&&Number.isFinite(r.score)&&SnakeEngine.MODES[r.mode]).slice(0,5):[];}}catch{}
let storageAvailable=true;
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{storageAvailable=false;}}
let mode='normal',game=new SnakeEngine.Game(mode),last=0,acc=0,particles=[],audio=null,toastTimer=null,installPrompt=null,lastStats=0,runBestAtStart=saved.best;
const palettes={jade:['#a7edab','#4d8450'],amber:['#edc47d','#9b6d35'],ice:['#92d9ea','#397e94']};
const requirements={jade:0,amber:250,ice:1000};
if(saved.total<requirements[saved.skin])saved.skin='jade';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function tone(freq=440,length=.08){if(!saved.sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
function stats(){
  $('bank').textContent=game.bank;$('wallet').textContent=game.wallet;
  const seconds=Math.ceil(Math.max(0,game.duration-game.elapsed)/1000);$('time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  $('time').style.color=seconds<=15?'#e78f7b':'';
  const playing=game.status==='playing';$('pause').disabled=!playing&&game.status!=='paused';$('pause').textContent=game.status==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',game.status==='paused'?'Reprendre la partie':'Mettre en pause');
  $('greed').disabled=!playing;$('greed').setAttribute('aria-pressed',String(game.greed));$('greed-state').textContent=game.greed?'Actif ×2':'Gains ×2';
  $('pride').disabled=!playing||!!game.pride||game.prideCooldown>0;$('pride').classList.toggle('active',!!game.pride);$('pride-state').textContent=game.pride?`${game.pride.count}/8 · ${Math.ceil(game.pride.remaining/1000)} s`:game.prideCooldown>0?`${Math.ceil(game.prideCooldown/1000)} s`:'Défi +80';
  $('rage').disabled=!playing||game.cooldown>0;$('rage').classList.toggle('active',game.rage>0);$('rage-state').textContent=game.rage>0?`Actif · ${Math.ceil(game.rage/1000)} s`:game.cooldown>0?`${Math.ceil(game.cooldown/1000)} s`:'Brise les rochers';
  document.querySelectorAll('[data-mode]').forEach(b=>{b.disabled=playing||game.status==='paused';b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
  document.querySelectorAll('[data-skin]').forEach(b=>{b.classList.toggle('locked',saved.total<requirements[b.dataset.skin]);b.classList.toggle('selected',saved.skin===b.dataset.skin);b.setAttribute('aria-pressed',String(saved.skin===b.dataset.skin));});
  $('all-best').textContent=saved.best;$('total-label').textContent=`${saved.total.toLocaleString('fr-FR')} PTS`;
  const next=saved.total<250?250:1000;
  $('unlock-label').textContent=saved.total>=1000?'Toutes les couleurs sont débloquées.':`Encore ${next-saved.total} points déposés pour ${next===250?'Ambre':'Glace'}.`;
  $('sound').textContent=saved.sound?'Son : activé':'Son : désactivé';$('sound').setAttribute('aria-pressed',String(saved.sound));$('sound').setAttribute('aria-label',saved.sound?'Couper le son':'Activer le son');
}
function records(){const ol=$('records');ol.replaceChildren();if(!saved.records.length){const li=document.createElement('li');li.textContent='Ton histoire commence avec une première partie.';ol.append(li);}else saved.records.forEach((r,i)=>{const li=document.createElement('li'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=`${String(i+1).padStart(2,'0')} · ${SnakeEngine.MODES[r.mode].name}`;strong.textContent=`${r.score} pts`;li.append(span,strong);ol.append(li);});}
function showStart(){
  $('overlay').hidden=false;$('overlay-content').innerHTML='<h2>Prêt à tenter ?</h2><p>Récolte les diamants.<br>Reviens au coffre pour garder tes points.</p><button class="primary" id="start">Jouer</button><small>2 minutes · '+{easy:'Facile',normal:'Moyen',hard:'Difficile'}[mode]+'</small>';
  $('start').addEventListener('click',start);
}
function start(){runBestAtStart=saved.best;game=new SnakeEngine.Game(mode);game.start();acc=0;last=0;particles=[];swipeControls.reset();joystickControls.reset();$('overlay').hidden=true;canvas.focus({preventScroll:true});tone(440);stats();}
function pause(){if(game.status==='playing'){game.pause();swipeControls.reset();joystickControls.reset();$('overlay').hidden=false;$('overlay-content').innerHTML='<h2>Pause</h2><button id="resume" class="primary">Reprendre</button><br><button id="quit" class="secondary">Terminer la partie</button>';$('resume').onclick=resume;$('quit').onclick=()=>{game.finish('quit');processEvents();stats();};stats();}else if(game.status==='paused')resume();}
function resume(){game.resume();acc=0;last=0;swipeControls.reset();joystickControls.reset();$('overlay').hidden=true;canvas.focus({preventScroll:true});stats();}
function end(){
  const newRecord=game.bank>runBestAtStart;saved.best=Math.max(saved.best,game.bank);saved.records.unshift({score:game.bank,mode:game.mode});saved.records=saved.records.slice(0,5);persist();records();
  const reasons={wall:'Le mur a eu le dernier mot.',body:'Ton serpent a croisé son propre chemin.',rock:'Un obstacle a arrêté ta course.',time:'Les deux minutes sont écoulées.',quit:'Tu as terminé la partie.'};
  $('overlay').hidden=false;$('overlay-content').innerHTML=`<h2>${newRecord?'Nouveau record !':'Partie terminée'}</h2><p>${reasons[game.reason]||'La partie est terminée.'}</p><div class="result-stats"><div><strong>${game.bank}</strong><small>AU COFFRE</small></div><div><strong>${game.lost}</strong><small>PERDU</small></div></div><button id="restart" class="primary">Rejouer</button><small>${game.deposits} dépôt${game.deposits>1?'s':''} · ${game.collected} trésors récoltés<br>${storageAvailable?'Ta progression est sauvegardée sur cet appareil.':'La sauvegarde locale est indisponible dans ce navigateur.'}</small>`;$('restart').onclick=start;tone(160,.25);stats();
}
function burst(at,color){if(reduced||!at)return;for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2;particles.push({x:(at.x+.5)*30,y:(at.y+.5)*30,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,life:1,color});}}
function processEvents(){game.drain().forEach(e=>{if(e.type==='coin'){tone(600+Math.min(game.collected,15)*15);burst(e.at,'#e5c487');}if(e.type==='deposit'){saved.total+=e.value;saved.best=Math.max(saved.best,game.bank);persist();toast(`Coffre +${e.value} · Butin sécurisé`);burst(e.at,'#a7edab');tone(950,.16);}if(e.type==='greed')toast(e.on?'Avarice : gains ×2, croissance ×2.':'Avarice désactivée.');if(e.type==='rage'){toast('Colère : 3 secondes pour traverser les obstacles.');tone(220,.12);}if(e.type==='break')burst(e.at,'#e78f7b');if(e.type==='pride')toast('Orgueil : 8 trésors en 25 s. Évite le coffre !');if(e.type==='prideWin'){toast('Défi réussi : +80 à déposer au coffre.');tone(1050,.2);}if(e.type==='prideFail')toast(e.reason==='deposit'?'Dépôt effectué : défi interrompu.':'Défi expiré. Ton butin reste à risque.');if(e.type==='over')end();});}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function draw(now){
  ctx.clearRect(0,0,720,720);ctx.fillStyle='#131d14';ctx.fillRect(0,0,720,720);
  ctx.strokeStyle='#243023';ctx.lineWidth=.6;ctx.beginPath();for(let i=1;i<24;i++){ctx.moveTo(i*30,0);ctx.lineTo(i*30,720);ctx.moveTo(0,i*30);ctx.lineTo(720,i*30);}ctx.stroke();
  const c=game.chest,x=c.x*30,y=c.y*30;ctx.fillStyle='#3b3420';roundRect(x+2,y+2,56,56,8);ctx.strokeStyle='#c7a464';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#e5c487';roundRect(x+12,y+20,36,25,4);ctx.fillStyle='#6d522b';ctx.fillRect(x+12,y+29,36,3);ctx.fillStyle='#f4dfab';roundRect(x+27,y+26,6,12,2);ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillStyle='#b69e6f';ctx.fillText('COFFRE',x+30,y-7);
  game.rocks.forEach(r=>{ctx.fillStyle='#45503d';roundRect(r.x*30+4,r.y*30+4,22,22,5);ctx.fillStyle='#64745a';ctx.fillRect(r.x*30+7,r.y*30+6,14,2);ctx.strokeStyle='#2a3626';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(r.x*30+10,r.y*30+10);ctx.lineTo(r.x*30+16,r.y*30+15);ctx.lineTo(r.x*30+12,r.y*30+23);ctx.stroke();});
  game.coins.forEach((p,i)=>{const px=(p.x+.5)*30,py=(p.y+.5)*30,pulse=reduced?1:1+Math.sin(now/450+i)*.08;ctx.save();ctx.translate(px,py);ctx.scale(pulse,pulse);ctx.shadowBlur=reduced?0:12;ctx.shadowColor='#e5c48755';ctx.fillStyle='#e5c487';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(8,0);ctx.lineTo(0,9);ctx.lineTo(-8,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fbebbc';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,1);ctx.lineTo(-8,0);ctx.closePath();ctx.fill();ctx.restore();});
  const colors=palettes[saved.skin];
  for(let i=game.snake.length-1;i>=0;i--){const p=game.snake[i];ctx.fillStyle=game.rage>0?(i===0?'#ffc49d':'#b96345'):i===0?colors[0]:colors[1];roundRect(p.x*30+2,p.y*30+2,26,26,i===0?9:6);if(i===0){ctx.fillStyle='#172117';const d=game.dir,px=p.x*30+15,py=p.y*30+15;const eye1={x:px+d.x*6-d.y*5,y:py+d.y*6+d.x*5},eye2={x:px+d.x*6+d.y*5,y:py+d.y*6-d.x*5};ctx.beginPath();ctx.arc(eye1.x,eye1.y,2.5,0,Math.PI*2);ctx.arc(eye2.x,eye2.y,2.5,0,Math.PI*2);ctx.fill();}}
  if(!reduced){particles.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);});ctx.globalAlpha=1;}
  ctx.strokeStyle=game.greed?'#8f7b4b':'#3c4b35';ctx.lineWidth=4;ctx.strokeRect(2,2,716,716);
}
function frame(now){
  const dt=last?Math.min(80,now-last):0;last=now;
  if(game.status==='playing'){game.advance(dt);acc+=dt;let steps=0;while(acc>=game.delay&&game.status==='playing'&&steps<3){const delay=game.delay;game.step();acc-=delay;steps++;}processEvents();if(now-lastStats>100){stats();lastStats=now;}}
  if(game.status!=='paused'){particles.forEach(p=>{p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.life-=dt/500;});particles=particles.filter(p=>p.life>0);}
  draw(now);requestAnimationFrame(frame);
}
const keys={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],z:[0,-1],s:[0,1],a:[-1,0],q:[-1,0],d:[1,0]};
document.addEventListener('keydown',e=>{if($('help-dialog').open||$('settings-dialog').open)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(keys[k]&&game.status==='playing'){e.preventDefault();game.turn(...keys[k]);}if((k==='p'||k==='Escape')&&(game.status==='playing'||game.status==='paused')){e.preventDefault();pause();}if(e.code==='Space'&&game.status==='playing'&&e.target===canvas){e.preventDefault();game.activateRage();processEvents();stats();}});
const touchOptions={active:()=>game.status==='playing',onDirection:(x,y)=>game.turn(x,y)};
const swipeControls=SnakeTouch.attach(canvas,touchOptions);
const joystickControls=SnakeTouch.attach($('joystick'),{...touchOptions,joystick:true,onPosition:(x,y,held)=>{
  $('joystick-knob').style.transform=`translate(${x}px, ${y}px)`;
  $('joystick').classList.toggle('held',held);
}});
$('pause').onclick=pause;$('greed').onclick=()=>{game.toggleGreed();processEvents();stats();};$('pride').onclick=()=>{game.challenge();processEvents();stats();};
function rage(){game.activateRage();processEvents();stats();canvas.focus({preventScroll:true});}$('rage').onclick=rage;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(game.status==='playing'||game.status==='paused')return;mode=b.dataset.mode;game=new SnakeEngine.Game(mode);$('mode-note').textContent={easy:'Sans rochers. Vitesse lente.',normal:'12 obstacles. Vitesse normale.',hard:'22 obstacles. Vitesse élevée.'}[mode];showStart();stats();});
document.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{const skin=b.dataset.skin;if(saved.total<requirements[skin]){toast(`Encore ${requirements[skin]-saved.total} points à déposer pour cette couleur.`);return;}saved.skin=skin;persist();stats();});
$('sound').onclick=()=>{saved.sound=!saved.sound;persist();tone(550,.1);stats();};
function bindDialog(trigger,id,close,ok){
  const dialog=$(id);let resumeOnClose=false;
  $(trigger).onclick=()=>{resumeOnClose=game.status==='playing';if(resumeOnClose)pause();dialog.showModal();};
  $(close).onclick=$(ok).onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{if(resumeOnClose&&game.status==='paused'&&!document.hidden)resume();resumeOnClose=false;});
}
bindDialog('help','help-dialog','close-help','help-ok');
bindDialog('settings','settings-dialog','close-settings','settings-ok');
$('control-hint').textContent=touchDevice?'Glisse sur le terrain ou le joystick.':'Flèches / ZQSD · P : pause';
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='playing')pause();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;$('install').hidden=true;};window.addEventListener('appinstalled',()=>{$('install').hidden=true;installPrompt=null;});
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
showStart();records();stats();requestAnimationFrame(frame);
