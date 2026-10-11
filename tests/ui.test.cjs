const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

// Exercise app lifecycle without a browser. Rendering still needs device QA.
function ui(){
  const elements=new Map(),modes=[],skins=[],stored=new Map();
  class Element{
    constructor(id){this.id=id;this.style={};this.dataset={};this.listeners=new Map();this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),add:name=>this.classes.add(name),remove:name=>this.classes.delete(name)};this.hidden=false;this.disabled=false;this.open=false;}
    set innerHTML(value){this.html=value;parse(value);}
    get innerHTML(){return this.html;}
    setAttribute(name,value){this[name]=value;}
    addEventListener(name,fn){this.listeners.set(name,fn);}
    removeEventListener(name){this.listeners.delete(name);}
    emit(name,event={}){this.listeners.get(name)?.(event);}
    click(){if(this.disabled)return;this.onclick?.();this.emit('click');}
    focus(){}
    showModal(){this.open=true;}
    close(){this.open=false;this.emit('close');}
    replaceChildren(){}
    append(){}
    getBoundingClientRect(){return {left:0,top:0,width:110,height:110};}
    getContext(){return {};}
  }
  function parse(html){
    for(const match of html.matchAll(/<[^>]+>/g)){
      const tag=match[0],id=/\bid="([^"]+)"/.exec(tag)?.[1];
      const element=new Element(id);if(id)elements.set(id,element);
      for(const [attr,list] of [['mode',modes],['skin',skins]]){const value=new RegExp('data-'+attr+'="([^"]+)"').exec(tag)?.[1];if(value){element.dataset[attr]=value;list.push(element);}}
    }
  }
  parse(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  const document={body:new Element(),hidden:false,getElementById:id=>{assert.ok(elements.has(id),'Missing DOM element: '+id);return elements.get(id);},querySelectorAll:selector=>selector==='[data-mode]'?modes:skins,createElement:()=>new Element(),listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);}};
  const context=vm.createContext({document,navigator:{maxTouchPoints:1},matchMedia:()=>({matches:false}),localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},window:{addEventListener(){}},location:{protocol:'https:'},requestAnimationFrame(){},setTimeout(){return 1;},clearTimeout(){}});
  for(const file of ['engine.js','touch.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return {get:id=>document.getElementById(id),read:code=>vm.runInContext(code,context),modes,skins,document,stored};
}
test('settings pauses the same run and closing resumes without score or time loss',()=>{
  const u=ui();u.get('start').click();u.read('game.wallet=30;game.bank=20;game.advance(500);stats()');
  u.get('settings').click();assert.equal(u.read('game.status'),'paused');assert.equal(u.get('settings-dialog').open,true);
  u.read('game.advance(10000)');assert.equal(u.read('game.elapsed'),500);assert.ok(u.modes.every(b=>b.disabled));
  u.get('settings-ok').click();assert.equal(u.read('game.status'),'playing');assert.equal(u.read('game.wallet'),30);assert.equal(u.read('game.bank'),20);assert.equal(u.read('game.elapsed'),500);assert.equal(u.get('overlay').hidden,true);
});
test('a manually paused run stays paused after opening and closing help or settings',()=>{
  const u=ui();u.get('start').click();u.get('pause').click();
  for(const [trigger,ok] of [['help','help-ok'],['settings','settings-ok']]){u.get(trigger).click();u.get(ok).click();assert.equal(u.read('game.status'),'paused');}
  u.get('resume').click();assert.equal(u.read('game.status'),'playing');
});
test('difficulty selection before a run affects the next game; powers work once',()=>{
  const u=ui();u.get('settings').click();u.modes.find(b=>b.dataset.mode==='easy').click();u.get('settings-ok').click();assert.match(u.get('overlay-content').innerHTML,/Facile/);
  u.get('start').click();assert.equal(u.read('game.mode'),'easy');assert.equal(u.read('game.rocks.length'),0);
  u.get('greed').click();assert.equal(u.read('game.greed'),true);assert.equal(u.get('greed')['aria-pressed'],'true');
  u.get('pride').click();assert.equal(u.read('game.pride.count'),0);assert.equal(u.get('pride').disabled,true);
  u.get('rage').click();assert.equal(u.read('game.rage'),3000);assert.equal(u.get('rage').disabled,true);
});
test('closing a menu while the page is hidden does not restart the game',()=>{
  const u=ui();u.get('start').click();u.get('settings').click();u.document.hidden=true;u.get('close-settings').click();assert.equal(u.read('game.status'),'paused');
});
test('finished runs save records and replay starts with an empty wallet',()=>{
  const u=ui();u.get('start').click();u.read("game.bank=50;game.wallet=30;game.finish('wall');processEvents();stats()");
  assert.equal(u.read('saved.best'),50);assert.equal(u.read('saved.records[0].score'),50);assert.match(u.get('overlay-content').innerHTML,/Rejouer/);assert.ok(u.stored.size);
  u.get('restart').click();assert.equal(u.read('game.status'),'playing');assert.equal(u.read('game.wallet'),0);assert.equal(u.read('game.bank'),0);
});
