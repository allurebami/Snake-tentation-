const {test}=require('node:test');
const assert=require('node:assert/strict');
const {attach,direction}=require('../touch.js');
function harness(options={}){
  const listeners=new Map(),turns=[],positions=[],captured=[];
  let playing=true;
  const element={
    addEventListener(name,fn,opts){assert.equal(opts.passive,false);listeners.set(name,fn);},
    removeEventListener(name){listeners.delete(name);},
    getBoundingClientRect(){return {left:20,top:40,width:132,height:132};},
    setPointerCapture(id){captured.push(id);}
  };
  const control=attach(element,{active:()=>playing,onDirection:(...d)=>turns.push(d),onPosition:(...p)=>positions.push(p),pointerEvents:true,...options});
  function emit(name,values={}){const event={pointerId:1,clientX:86,clientY:106,pointerType:'touch',button:0,cancelable:true,prevented:false,preventDefault(){this.prevented=true;},...values};listeners.get(name)?.(event);return event;}
  return {control,turns,positions,captured,listeners,emit,setActive(value){playing=value;}};
}
test('dominant axis and deadzone give four unambiguous directions',()=>{
  assert.equal(direction(3,8),null);
  assert.deepEqual(direction(20,4),[1,0]);
  assert.deepEqual(direction(-20,4),[-1,0]);
  assert.deepEqual(direction(4,-20),[0,-1]);
  assert.deepEqual(direction(4,20),[0,1]);
});
test('continuous swipe changes direction without lifting the finger',()=>{
  const h=harness();assert.equal(h.emit('pointerdown').prevented,true);
  h.emit('pointermove',{clientX:90});assert.equal(h.turns.length,0);
  for(const [clientX,clientY] of [[106,106],[106,86],[86,86],[86,106]])assert.equal(h.emit('pointermove',{clientX,clientY}).prevented,true);
  assert.deepEqual(h.turns,[[1,0],[0,-1],[-1,0],[0,1]]);assert.deepEqual(h.captured,[1]);
});
test('secondary fingers cannot hijack or end the gesture',()=>{
  const h=harness();h.emit('pointerdown');
  h.emit('pointerdown',{pointerId:2,isPrimary:false});h.emit('pointermove',{pointerId:2,clientX:150});h.emit('pointerup',{pointerId:2});
  h.emit('pointermove',{clientY:126});assert.deepEqual(h.turns,[[0,1]]);
});
test('release, cancellation and lost capture stop the old gesture',()=>{
  for(const end of ['pointerup','pointercancel','lostpointercapture']){
    const h=harness();h.emit('pointerdown');h.emit(end);h.emit('pointermove',{clientX:120});assert.deepEqual(h.turns,[]);
    h.emit('pointerdown');h.emit('pointermove',{clientX:120});assert.deepEqual(h.turns,[[1,0]]);
  }
});
test('pause and explicit reset require a fresh gesture',()=>{
  const h=harness();h.setActive(false);assert.equal(h.emit('pointerdown').prevented,false);
  h.setActive(true);h.emit('pointermove',{clientX:120});assert.equal(h.turns.length,0);
  h.emit('pointerdown');h.setActive(false);h.emit('pointermove',{clientX:120});h.setActive(true);h.emit('pointermove',{clientY:150});assert.equal(h.turns.length,0);
  h.emit('pointerdown');h.control.reset();h.emit('pointermove',{clientX:120});assert.equal(h.turns.length,0);
});
test('joystick clamps the knob and sends direction changes only',()=>{
  const h=harness({joystick:true});h.emit('pointerdown');assert.equal(h.turns.length,0);
  h.emit('pointermove',{clientX:91});assert.equal(h.turns.length,0);
  h.emit('pointermove',{clientX:150});h.emit('pointermove',{clientX:170});
  assert.deepEqual(h.turns,[[1,0]]);assert.ok(Math.hypot(...h.positions.at(-1).slice(0,2))<=32);
  h.emit('pointermove',{clientY:20});assert.deepEqual(h.turns,[[1,0],[0,-1]]);
  h.emit('pointerup');assert.deepEqual(h.positions.at(-1),[0,0,false]);
});
test('non-primary mouse button is ignored and destroy removes all handlers',()=>{
  const h=harness();h.emit('pointerdown',{pointerType:'mouse',button:2});h.emit('pointermove',{clientX:120});assert.equal(h.turns.length,0);
  h.control.destroy();assert.equal(h.listeners.size,0);
});
test('TouchEvents fallback owns one finger and handles cancellation',()=>{
  const h=harness({pointerEvents:false});const finger=(identifier,clientX,clientY)=>({identifier,clientX,clientY});
  assert.equal(h.emit('touchstart',{changedTouches:[finger(7,50,50)]}).prevented,true);
  h.emit('touchstart',{changedTouches:[finger(8,100,100)]});
  h.emit('touchmove',{touches:[finger(8,130,100),finger(7,50,70)]});assert.deepEqual(h.turns,[[0,1]]);
  h.emit('touchend',{changedTouches:[finger(8,130,100)]});
  h.emit('touchmove',{touches:[finger(7,70,70)]});assert.deepEqual(h.turns,[[0,1],[1,0]]);
  h.emit('touchcancel',{changedTouches:[finger(7,70,70)]});h.emit('touchmove',{touches:[finger(7,70,100)]});assert.equal(h.turns.length,2);
});
