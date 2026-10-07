const models={watch:{title:'Sveston Paxton',src:'assets/sveston.glb',orbit:'30deg 25deg auto'},airpods:{title:'AirPods Max',src:'assets/airpodsmax.glb',orbit:'60deg 75deg auto'}};
const stage=document.querySelector('.orbit-stage'),controls=document.querySelector('.focus-controls'),instruction=document.querySelector('#instruction');
let selected=null;const viewers={};
let savedScroll=0;
function lockScroll(){
 savedScroll=scrollY;
 document.documentElement.style.overflow='hidden';
 document.body.style.position='fixed';document.body.style.top=`-${savedScroll}px`;
 document.body.style.width='100%';
}
function unlockScroll(){
 document.documentElement.style.overflow='';
 document.body.style.position='';document.body.style.top='';document.body.style.width='';
 scrollTo({top:savedScroll,behavior:'instant'});
}
function resetAngle(key){const viewer=viewers[key];viewer.removeAttribute('camera-orbit');requestAnimationFrame(()=>viewer.setAttribute('camera-orbit',models[key].orbit));}
function returnToWorld(){
  if(!selected)return;const previous=selected;
  viewers[previous].removeAttribute('camera-controls');resetAngle(previous);
  stage.classList.remove('focused');document.querySelector(`[data-slot="${previous}"]`).classList.remove('selected');
  document.querySelectorAll('[data-slot]').forEach(slot=>slot.inert=false);
  document.querySelector(`[data-select="${previous}"]`).hidden=false;controls.hidden=true;selected=null;
  unlockScroll();
  instruction.textContent='Two floating objects. Pick one to explore.';document.querySelector(`[data-select="${previous}"]`).focus({preventScroll:true});
}
document.querySelector('#return').addEventListener('click',returnToWorld);addEventListener('keydown',e=>{if(e.key==='Escape')returnToWorld();});
document.querySelector('#reset').addEventListener('click',()=>{if(selected)resetAngle(selected);});
document.querySelectorAll('[data-select]').forEach(button=>button.addEventListener('click',()=>{
  selected=button.dataset.select;lockScroll();stage.classList.add('focused');document.querySelector(`[data-slot="${selected}"]`).classList.add('selected');button.hidden=true;
  document.querySelectorAll('[data-slot]').forEach(slot=>slot.inert=slot.dataset.slot!==selected);
  viewers[selected].setAttribute('camera-controls','');controls.hidden=false;
  instruction.textContent=`${models[selected].title} — drag to rotate · scroll or pinch to zoom · Back to scroll resumes the page`;document.querySelector('#return').textContent='← Back to scroll';document.querySelector('#return').focus({preventScroll:true});
}));
try{
  await import('https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js');
  for(const [key,object] of Object.entries(models)){
    const viewer=document.createElement('model-viewer');viewers[key]=viewer;
    for(const [name,value] of Object.entries({'environment-image':'neutral','exposure':'.65','shadow-intensity':'.2','shadow-softness':'1','camera-orbit':object.orbit,'interaction-prompt':'none','touch-action':'pan-y','alt':object.title}))viewer.setAttribute(name,value);
    const button=document.querySelector(`[data-select="${key}"]`);
    viewer.addEventListener('load',()=>{button.disabled=false;button.querySelector('i').textContent='Click to come closer ↗';});
    viewer.addEventListener('error',()=>{button.querySelector('i').textContent='Model could not load';});
    viewer.src=object.src;document.querySelector(`[data-viewer="${key}"]`).append(viewer);
  }
}catch{instruction.textContent='Could not load the 3D viewer. Refresh to try again.';}

