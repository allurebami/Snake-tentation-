(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnakeEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MODES = {
    easy: { name: 'Initiation', delay: 185, rocks: 0 },
    normal: { name: 'Audace', delay: 155, rocks: 12 },
    hard: { name: 'Vertige', delay: 125, rocks: 22 }
  };
  const same = (a, b) => a.x === b.x && a.y === b.y;
  class Game {
    constructor(mode = 'normal', random = Math.random) {
      this.mode = MODES[mode] ? mode : 'normal'; this.random = random;
      this.size = 24; this.snake = [{x:6,y:14},{x:5,y:14},{x:4,y:14},{x:3,y:14}];
      this.dir = {x:1,y:0}; this.queue = []; this.chest = {x:11,y:3};
      this.coins = []; this.rocks = []; this.wallet = 0; this.bank = 0;
      this.collected = 0; this.deposits = 0; this.lost = 0; this.elapsed = 0;
      this.duration = 120000; this.greed = false; this.rage = 0; this.cooldown = 0;
      this.pride = null; this.prideCooldown = 0; this.prideWins = 0; this.maxLength = 4;
      this.status = 'ready'; this.reason = ''; this.events = [];
      const candidates = [];
      for (let y=2;y<22;y++) for(let x=2;x<22;x++) {
        if (y !== 14 && (x<9 || x>14) && !this.isChest({x,y})) candidates.push({x,y});
      }
      for(let i=candidates.length-1;i>0;i--) {
        const j=Math.floor(this.random()*(i+1)); [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
      }
      this.rocks = candidates.slice(0,MODES[this.mode].rocks);
      this.coins.push({x:9,y:14}); this.fillCoins();
    }
    isChest(p) { return p.x>=this.chest.x && p.x<=this.chest.x+1 && p.y>=this.chest.y && p.y<=this.chest.y+1; }
    emit(type, data = {}) { this.events.push({type,...data}); }
    drain() { const events=this.events; this.events=[]; return events; }
    start() { if(this.status==='ready') this.status='playing'; }
    pause() { if(this.status==='playing') this.status='paused'; }
    resume() { if(this.status==='paused') this.status='playing'; }
    turn(x,y) {
      if(this.status!=='playing' || Math.abs(x)+Math.abs(y)!==1 || this.queue.length>=2) return false;
      const last=this.queue.length?this.queue[this.queue.length-1]:this.dir;
      if ((last.x===x && last.y===y) || (last.x===-x && last.y===-y)) return false;
      this.queue.push({x,y}); return true;
    }
    toggleGreed() { if(this.status==='playing') { this.greed=!this.greed; this.emit('greed',{on:this.greed}); } }
    activateRage() {
      if(this.status!=='playing' || this.cooldown>0) return false;
      this.rage=3000; this.cooldown=15000; this.emit('rage'); return true;
    }
    challenge() {
      if(this.status!=='playing'||this.pride||this.prideCooldown>0) return false;
      this.pride={count:0,remaining:25000,target:8}; this.emit('pride'); return true;
    }
    get delay() {
      const heavy=Math.min(40,Math.floor(this.wallet/40)*5);
      return Math.max(65,(MODES[this.mode].delay+heavy)*(this.pride?0.8:1)*(this.rage>0?0.65:1));
    }
    advance(ms) {
      if(this.status!=='playing') return;
      this.elapsed+=ms; this.rage=Math.max(0,this.rage-ms); this.cooldown=Math.max(0,this.cooldown-ms);
      this.prideCooldown=Math.max(0,this.prideCooldown-ms);
      if(this.pride) { this.pride.remaining-=ms; if(this.pride.remaining<=0) this.cancelPride('time'); }
      if(this.elapsed>=this.duration) this.finish('time');
    }
    cancelPride(reason) { this.pride=null; this.prideCooldown=10000; this.emit('prideFail',{reason}); }
    fillCoins() {
      while(this.coins.length<5) {
        const free=[];
        for(let y=0;y<this.size;y++) for(let x=0;x<this.size;x++) {
          const p={x,y};
          if(!this.isChest(p)&&!this.snake.some(q=>same(p,q))&&!this.rocks.some(q=>same(p,q))&&!this.coins.some(q=>same(p,q))) free.push(p);
        }
        if(!free.length) break;
        this.coins.push(free[Math.floor(this.random()*free.length)]);
      }
    }
    step() {
      if(this.status!=='playing') return;
      if(this.queue.length) this.dir=this.queue.shift();
      const head={x:this.snake[0].x+this.dir.x,y:this.snake[0].y+this.dir.y};
      if(head.x<0||head.y<0||head.x>=this.size||head.y>=this.size) { this.finish('wall'); return; }
      const ci=this.coins.findIndex(p=>same(p,head)); const eating=ci!==-1;
      // The last segment moves away on non-growing steps.
      const body=eating?this.snake:this.snake.slice(0,-1);
      if(body.some(p=>same(p,head))) { this.finish('body'); return; }
      const ri=this.rocks.findIndex(p=>same(p,head));
      if(ri!==-1) {
        if(this.rage<=0) { this.finish('rock'); return; }
        this.rocks.splice(ri,1); this.emit('break',{at:head});
      }
      this.snake.unshift(head);
      if(!eating) this.snake.pop();
      else {
        this.coins.splice(ci,1); const value=this.greed?20:10;
        this.wallet+=value; this.collected++;
        if(this.greed) this.snake.push({...this.snake[this.snake.length-1]});
        this.maxLength=Math.max(this.maxLength,this.snake.length); this.emit('coin',{value,at:head});
        if(this.pride) {
          this.pride.count++;
          if(this.pride.count>=this.pride.target) {
            this.wallet+=80; this.prideWins++; this.pride=null; this.prideCooldown=10000; this.emit('prideWin',{value:80});
          }
        }
      }
      if(this.isChest(head)&&this.wallet>0) {
        const value=this.wallet; this.bank+=value; this.wallet=0; this.deposits++;
        this.snake=this.snake.slice(0,4);
        if(this.pride) this.cancelPride('deposit');
        this.emit('deposit',{value,at:head});
      }
      if(eating) this.fillCoins();
    }
    finish(reason) {
      if(this.status==='over') return;
      this.status='over'; this.reason=reason; this.lost=this.wallet; this.wallet=0;
      this.emit('over',{reason,lost:this.lost,bank:this.bank});
    }
  }
  return {Game,MODES,same};
});
