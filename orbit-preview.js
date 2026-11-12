import {loadModelViewer} from './model-runtime.js';
const models={watch:{title:'Sveston Paxton',src:'assets/sveston.glb',orbit:'30deg 25deg auto'},airpods:{title:'AirPods Max',src:'assets/airpodsmax.glb',orbit:'60deg 75deg auto'}};
const stage=document.querySelector('.orbit-stage'),controls=document.querySelector('.focus-controls'),instruction=document.querySelector('#instruction');
const compact=innerWidth<=900||matchMedia('(pointer:coarse)').matches||navigator.deviceMemory<=4||navigator.connection?.saveData;
let selected=null,savedScroll=0;const viewers={},pending={};
function lockScroll(){savedScroll=scrollY;document.documentElement.style.overflow='hidden';document.body.style.position='fixed';document.body.style.top=`-${savedScroll}px`;document.body.style.width='100%';}
function unlockScroll(){document.documentElement.style.overflow='';document.body.style.position='';document.body.style.top='';document.body.style.width='';scrollTo({top:savedScroll,behavior:'instant'});}
function resetAngle(key){const viewer=viewers[key];if(viewer){viewer.setAttribute('camera-orbit',models[key].orbit);viewer.jumpCameraToGoal();}}
function release(key){const viewer=viewers[key];if(viewer){viewer.src=null;viewer.remove();delete viewers[key];}delete pending[key];document.querySelector(`[data-viewer="${key}"] img`).hidden=false;}
async function ensureViewer(key){
 if(pending[key])return pending[key];
 pending[key]=(async()=>{
  await loadModelViewer();const object=models[key],viewer=document.createElement('model-viewer');viewers[key]=viewer;
  for(const [name,value] of Object.entries({'environment-image':'neutral','exposure':'.65','shadow-intensity':'0','camera-orbit':object.orbit,'interaction-prompt':'none','touch-action':'pan-y','alt':object.title}))viewer.setAttribute(name,value);
  if(selected===key)viewer.setAttribute('camera-controls','');
  const slot=document.querySelector(`[data-viewer="${key}"]`),button=document.querySelector(`[data-select="${key}"]`);
  viewer.style.opacity='0';slot.append(viewer);
  await new Promise((resolve,reject)=>{viewer.addEventListener('load',resolve,{once:true});viewer.addEventListener('error',reject,{once:true});viewer.src=object.src;});
  viewer.style.opacity='1';slot.querySelector('img').hidden=true;button.querySelector('i').textContent='Explore in 3D';
  return viewer;
 })().catch(error=>{release(key);instruction.hidden=false;instruction.textContent='Could not load 3D. Go back and tap to retry.';throw error;});
 return pending[key];
}
function returnToWorld(){
 if(!selected)return;const previous=selected;selected=null;
 viewers[previous]?.removeAttribute('camera-controls');resetAngle(previous);
 stage.classList.remove('focused');document.querySelector(`[data-slot="${previous}"]`).classList.remove('selected');
 document.querySelectorAll('[data-slot]').forEach(slot=>slot.inert=false);
 document.querySelector(`[data-select="${previous}"]`).hidden=false;controls.hidden=true;unlockScroll();
 if(compact)pending[previous]?.then(()=>{if(selected!==previous)release(previous);}).catch(()=>{});
 instruction.textContent='';instruction.hidden=true;document.querySelector(`[data-select="${previous}"]`).focus({preventScroll:true});
}
document.querySelector('#return').addEventListener('click',returnToWorld);addEventListener('keydown',e=>{if(e.key==='Escape')returnToWorld();});
document.querySelector('#reset').addEventListener('click',()=>{if(selected)resetAngle(selected);});
for(const [key,object] of Object.entries(models)){
 const button=document.querySelector(`[data-select="${key}"]`);button.disabled=false;button.querySelector('i').textContent='Explore in 3D';
 button.addEventListener('click',async()=>{
  selected=key;lockScroll();stage.classList.add('focused');document.querySelector(`[data-slot="${key}"]`).classList.add('selected');button.hidden=true;
  document.querySelectorAll('[data-slot]').forEach(slot=>slot.inert=slot.dataset.slot!==key);controls.hidden=false;
  document.querySelector('#character-scene').style.opacity='0';
  instruction.hidden=false;instruction.textContent=`Loading ${object.title} in 3D…`;
  const readyMessage=`${object.title} — drag to rotate · pinch to zoom · Back to scroll resumes the page`;
  document.querySelector('#return').textContent='← Back to scroll';document.querySelector('#return').focus({preventScroll:true});
  try{const viewer=await ensureViewer(key);if(selected===key){viewer.setAttribute('camera-controls','');instruction.textContent=readyMessage;}}catch{}
 });
}
