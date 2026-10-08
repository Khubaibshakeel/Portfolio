// Track real readiness, including the character's first rendered frame.
(() => {
 const overlay=document.querySelector('#site-loader'),label=document.querySelector('#loader-label');
 const compact=innerWidth<=900||matchMedia('(pointer:coarse)').matches||navigator.deviceMemory<=4||navigator.connection?.saveData;
 const pending=new Set(['fonts','scene','texture','previews',...compact?[]:['products']]);
 overlay.dataset.pending=[...pending].join(',');
 const started=performance.now();let released=false;
 function release(){
  if(released||pending.size)return;released=true;
  const delay=Math.max(0,450-(performance.now()-started));
  setTimeout(()=>{
   document.documentElement.classList.remove('is-loading');
   document.documentElement.classList.add('is-revealing');
   document.querySelector('#main').inert=false;
   document.body.removeAttribute('aria-busy');
   overlay.classList.add('ready');label.textContent='Ready';
   addEventListener('transitionend',function finish(event){
    if(event.target!==overlay)return;overlay.remove();removeEventListener('transitionend',finish);
   });
   dispatchEvent(new Event('portfolio:site-ready'));
  },delay);
 }
 window.portfolioBoot={
  ready(part){pending.delete(part);overlay.dataset.pending=[...pending].join(',');release();},
  progress(value){label.textContent=value<100?`Loading your world · ${Math.round(value)}%`:'Preparing your world…';},
  fail(part){pending.delete(part);overlay.dataset.pending=[...pending].join(',');release();}
 };
 const fontsReady=()=>requestAnimationFrame(()=>document.fonts.ready.then(()=>window.portfolioBoot.ready('fonts')));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fontsReady,{once:true});else fontsReady();
 // A failed dependency must leave a usable site, never an endless spinner.
 addEventListener('error',()=>{if(document.querySelector('#character-scene')?.dataset.loaded!=='true')document.documentElement.classList.add('character-fallback');pending.clear();release();},{once:true});
 const escapeTimer=setTimeout(()=>{if(document.querySelector('#character-scene')?.dataset.loaded!=='true')document.documentElement.classList.add('character-fallback');pending.clear();release();},45000);
 addEventListener('portfolio:site-ready',()=>clearTimeout(escapeTimer),{once:true});
 addEventListener('keydown',event=>{if(document.documentElement.classList.contains('is-loading')&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))event.preventDefault();});
})();
