const signature=document.querySelector('#site-loader');
let started=false;
let observer;
let timeout;
function finishPortrait(ready){
  clearTimeout(timeout);
  signature.hidden=true;
  document.documentElement.classList.toggle('portrait-ready',ready);
  if(ready)dispatchEvent(new Event('portfolio:site-ready'));
}
window.portfolioBoot={
  ready(part){if(part==='scene')finishPortrait(true);},
  fail(part){if(part==='scene')finishPortrait(false);}
};
function loadPortrait(){
  if(started)return;
  started=true;observer?.disconnect();
  signature.hidden=false;
  timeout=setTimeout(()=>finishPortrait(false),12000);
  import('./character-scene.js?v=usable-33').catch(()=>finishPortrait(false));
}
// The poster and navigation render without waiting for fonts or WebGL.
requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(/^#(?:works|work-|contact)/.test(location.hash)&&'IntersectionObserver' in window){
    observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))loadPortrait();});
    for(const section of document.querySelectorAll('#about,#resume'))observer.observe(section);
  }else loadPortrait();
}));
