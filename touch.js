(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SnakeTouch=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function direction(dx,dy,deadzone=12){
    if(Math.max(Math.abs(dx),Math.abs(dy))<deadzone)return null;
    return Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
  }
  function attach(element,options){
    const {active,onDirection,joystick=false,onPosition=()=>{}}=options;
    const pointer=options.pointerEvents===undefined?typeof PointerEvent!=='undefined':options.pointerEvents;
    let owner=null,anchor=null,lastDirection=null;
    const listeners=[];
    function listen(name,fn){element.addEventListener(name,fn,{passive:false});listeners.push([name,fn]);}
    function reset(){owner=null;anchor=null;lastDirection=null;onPosition(0,0,false);}
    function prevent(event){if(event.cancelable!==false)event.preventDefault();}
    function move(x,y,event){
      if(!active()){reset();return;}
      prevent(event);
      const dx=x-anchor.x,dy=y-anchor.y;
      const next=direction(dx,dy,joystick?12:10);
      if(joystick){const distance=Math.hypot(dx,dy),scale=distance>32?32/distance:1;onPosition(dx*scale,dy*scale,true);}
      if(!next)return;
      const key=next.join(',');
      if(!joystick||key!==lastDirection)onDirection(...next);
      lastDirection=key;
      if(!joystick)anchor={x,y};
    }
    function begin(id,x,y,event){
      if(owner!==null||!active())return false;
      owner=id;lastDirection=null;prevent(event);
      if(joystick){const rect=element.getBoundingClientRect();anchor={x:rect.left+rect.width/2,y:rect.top+rect.height/2};onPosition(0,0,true);move(x,y,event);}
      else anchor={x,y};
      return true;
    }
    if(pointer){
      listen('pointerdown',event=>{
        if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
        if(begin(event.pointerId,event.clientX,event.clientY,event))try{element.setPointerCapture(event.pointerId);}catch{}
      });
      listen('pointermove',event=>{if(event.pointerId===owner)move(event.clientX,event.clientY,event);});
      const end=event=>{if(event.pointerId!==owner)return;prevent(event);reset();};
      listen('pointerup',end);listen('pointercancel',end);listen('lostpointercapture',end);
    }else{
      listen('touchstart',event=>{const touch=event.changedTouches[0];if(touch)begin(touch.identifier,touch.clientX,touch.clientY,event);});
      listen('touchmove',event=>{const touch=Array.from(event.touches).find(t=>t.identifier===owner);if(touch)move(touch.clientX,touch.clientY,event);});
      const end=event=>{if(Array.from(event.changedTouches).some(t=>t.identifier===owner)){prevent(event);reset();}};
      listen('touchend',end);listen('touchcancel',end);
    }
    return {reset,destroy(){listeners.forEach(([name,fn])=>element.removeEventListener(name,fn));reset();}};
  }
  return {direction,attach};
});
