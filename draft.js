import { groups } from './projects.js?v=motion-5';
import { projectGalleries } from './project-gallery.js?v=motion-5';
import { loadModelViewer } from './model-runtime.js';
document.documentElement.classList.add('js');
const track = document.querySelector('.wk-track');
const dialog = document.querySelector('.project-dialog');
const image = document.querySelector('#project-image');
const video = document.querySelector('#project-video');
const toggle = document.querySelector('.view-toggle');
const modelButton=document.querySelector('#project-3d-toggle');
let modelViewer=null,modelActive=false;
const modelSources={'Sveston Paxton — Gold':'assets/sveston.glb','AirPods Max Scene':'assets/airpodsmax.glb'};
function releaseProjectModel(){if(modelViewer){modelViewer.src=null;modelViewer.remove();modelViewer=null;}modelActive=false;}
let current = null, viewport = false;
const node = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text) el.textContent = text; return el; };
for (const group of groups) {
  const card = node('article','wk-card');
  const head = node('header','wk-card-head');
  head.append(node('span','wk-card-no',group.no),node('h3','wk-card-title',group.title),node('span','wk-card-tagline',group.note));
  const cover = node('div','wk-card-cover');
  const coverImage = document.createElement('img'); coverImage.src = group.cover; coverImage.alt = ''; coverImage.loading = 'lazy'; cover.append(coverImage);
  const body = node('div','wk-card-body');
  const list = node('ul','wk-list');
  group.items.forEach(item => {
    const li = node('li','wk-line'), button = node('button','wk-line-btn');
    button.type = 'button'; button.setAttribute('aria-haspopup','dialog');
    button.append(node('span','wk-line-name',item.title),node('span','wk-line-meta',item.type === 'video' ? 'Motion ↗' : 'Explore ↗'));
    button.addEventListener('click',()=>openProject(item,group.title));
    li.append(button); list.append(li);
  });
  body.append(list);card.append(head,cover,body);track.append(card);
}
function openProject(item,category) {
  current=item; viewport=false;
  releaseProjectModel();
  modelButton.hidden=!modelSources[item.title];modelButton.textContent='Explore in 3D ↗';
  document.querySelector('#project-title').textContent=item.title;
  document.querySelector('.project-category').textContent=category;
  document.querySelector('#project-description').textContent=item.description;
  const group=groups.find(group=>group.title===category);
  const tags=document.querySelector('.project-tags');tags.replaceChildren();
  (group?.note.split(' · ')||[]).forEach(tag=>tags.append(node('span','project-tag',tag)));
  const stillItem=item.type==='video'?groups.flatMap(group=>group.items).find(other=>other.type==='img'&&other.title===item.title.replace(' — Animation','')):item;
  const banner=stillItem?.src||group.cover;
  image.hidden=false;video.hidden=true;
  toggle.hidden=!item.viewport;toggle.textContent='Show viewport';toggle.setAttribute('aria-pressed','false');
  image.src=banner;image.alt=item.title;
  const gallery=document.querySelector('.project-gallery');gallery.replaceChildren();
  gallery.append(node('h4','',item.type==='video'?'In motion':'Selected views'));
  if(item.type==='video'){
    video.hidden=false;video.src=item.src;gallery.append(video);video.play().catch(()=>{});
  }
  const pictures=[...(projectGalleries[stillItem?.title]||[])];
  if(stillItem?.viewport)pictures.push({src:stillItem.viewport,caption:'Blender viewport — behind the render'});
  for(const picture of pictures){
    const figure=node('figure','project-figure'),img=document.createElement('img');
    img.src=picture.src;img.alt=`${stillItem?.title||item.title} — ${picture.caption}`;img.loading='lazy';img.decoding='async';
    figure.append(img,node('figcaption','',picture.caption));gallery.append(figure);
  }
  const more=item.type==='video'||pictures.length>0;
  gallery.hidden=!more;
  document.querySelector('.project-scroll-hint').hidden=!more;
  dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
  measureProject();
}

const projectIntro=document.querySelector('.project-intro');
const projectOpening=document.querySelector('.project-opening');
const projectGallery=document.querySelector('.project-gallery');
let projectFrame=0;
function measureProject(){
  if(!dialog.open)return;
  dialog.style.setProperty('--panel-height',`${dialog.clientHeight}px`);
  const extra=projectGallery.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches?0:dialog.clientHeight*.65;
  projectOpening.style.height=`${projectIntro.offsetHeight+extra}px`;
  projectGallery.style.marginTop=`${-extra}px`;
  paintProject();
}
function paintProject(){
  projectFrame=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const range=projectOpening.offsetHeight-projectIntro.offsetHeight;
  const t=reduced||!range?0:Math.max(0,Math.min(1,dialog.scrollTop/range));
  const eased=t*t*(3-2*t);
  projectIntro.style.opacity=String(1-eased);
  projectIntro.style.filter=`blur(${eased*14}px)`;
  projectIntro.style.pointerEvents=t>.95?'none':'';
  projectIntro.inert=t>.95;
  projectGallery.style.opacity=String(reduced||!range?1:Math.max(0,Math.min(1,(t-.12)/.7)));
}
dialog.addEventListener('scroll',()=>{if(!projectFrame)projectFrame=requestAnimationFrame(paintProject);},{passive:true});
addEventListener('resize',measureProject);
image.addEventListener('load',measureProject);
document.fonts.ready.then(measureProject);
toggle.addEventListener('click',()=>{
  releaseProjectModel();image.hidden=false;modelButton.textContent='Explore in 3D ↗';
  viewport=!viewport;image.src=viewport?current.viewport:current.src;
  toggle.textContent=viewport?'Show final render':'Show viewport';toggle.setAttribute('aria-pressed',String(viewport));
});
modelButton.addEventListener('click',async()=>{
  if(modelActive){releaseProjectModel();image.hidden=false;modelButton.textContent='Explore in 3D ↗';return;}
  const project=current;modelButton.disabled=true;modelButton.textContent='Loading 3D…';
  try{
    await loadModelViewer();
    if(!dialog.open||current!==project)return;
    if(!modelViewer){modelViewer=document.createElement('model-viewer');modelViewer.setAttribute('camera-controls','');modelViewer.setAttribute('touch-action','pan-y');modelViewer.setAttribute('shadow-intensity','1');modelViewer.addEventListener('error',()=>{modelViewer.hidden=true;image.hidden=false;modelActive=false;modelButton.textContent='Retry 3D viewer';});document.querySelector('.project-media').append(modelViewer);}
    modelViewer.setAttribute('alt',`${project.title} — drag to rotate and pinch to zoom`);
    modelViewer.setAttribute('environment-image','neutral');modelViewer.setAttribute('exposure','.65');modelViewer.setAttribute('shadow-intensity','.3');modelViewer.setAttribute('shadow-softness','1');
    modelViewer.setAttribute('camera-orbit',project.title.startsWith('Sveston')?'30deg 25deg auto':'0deg 75deg auto');
    modelViewer.src=modelSources[project.title];modelViewer.hidden=false;image.hidden=true;modelActive=true;modelButton.textContent='Back to render';
  }catch{modelButton.textContent='Retry 3D viewer';}finally{modelButton.disabled=false;}
});
dialog.querySelector('.wk-detail-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=> {if(e.target === dialog) {const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();releaseProjectModel();document.body.style.overflow='';});

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width:640px), (max-height:600px) and (max-width:1000px)');
const gallery = document.querySelector('.wk-gallery');
const hero = document.querySelector('.hero');
const about = document.querySelector('.about');
const title = document.querySelector('.about-title');
const chrome = document.querySelector('.hero-chrome');
const rail = document.querySelector('.glass-rail');
const scrim = document.querySelector('.scrim');
const fog = document.querySelector('.stage-fog');
const cue = document.querySelector('.scroll-cue');
const progress = document.querySelector('.wk-progress-fill');
const hint = document.querySelector('.wk-hint');
const entries = [...document.querySelectorAll('.tl-entry')];
let range = 0, scheduled = false;
const clamp = x => Math.max(0, Math.min(1,x));
function measure() {
  range = Math.max(0,track.scrollWidth-innerWidth);
  gallery.style.height = mobile.matches || reduced.matches ? 'auto' : `${innerHeight+range}px`;
  paint();
}

// A renderer can subscribe later without changing the page or scroll behavior.
// The five data-point entries are the camera's stops; focus-works is the final stop.
export function registerSceneController(controller) {
  const listener = e => controller(e.detail);
  window.addEventListener('portfolio:scene',listener);
  schedule();
  return () => window.removeEventListener('portfolio:scene',listener);
}
function paint() {
  scheduled=false;
  const y=scrollY, vh=innerHeight;
  const heroProgress=clamp(y/Math.max(1,hero.offsetHeight*.6));
  const galleryTop=gallery.getBoundingClientRect().top+y;
  const galleryProgress=range?clamp((y-galleryTop)/range):0;
  const entrance=clamp((y-galleryTop+vh)/(vh*.85));
  const fade=entrance*entrance*(3-2*entrance);
  window.dispatchEvent(new CustomEvent('portfolio:texture',{detail:{strength:1-fade}}));
  chrome.style.opacity=String(1-clamp(y/280));
  cue.style.opacity=String(1-clamp(y/160));
  rail.style.opacity=String(clamp((y-vh*.5)/(vh*.6))*(1-fade));
  scrim.style.opacity=String(clamp(y/520)*.4*(1-fade));
  fog.style.opacity='0';
  if (!reduced.matches) {
    about.style.opacity=String(1-clamp(heroProgress*1.4));
    about.style.filter=`blur(${heroProgress*16}px)`;
    title.style.transform=`translateY(${-heroProgress*96}px)`;
    title.style.letterSpacing=`${.01+heroProgress*.41}em`;
  } else {about.style.opacity='1';about.style.filter='none';title.style.transform='none';title.style.letterSpacing='.01em';}
  if (!mobile.matches && !reduced.matches) track.style.transform=`translateX(${-galleryProgress*range}px)`;else track.style.transform='none';
  progress.style.transform=`scaleX(${galleryProgress})`;
  hint.style.opacity=String(1-clamp((galleryProgress-.85)/.15));
  const stops=[{name:'focus-start',y:0},...entries.map(el=>({name:el.dataset.point,y:el.getBoundingClientRect().top+y-vh*.3})),{name:'focus-works',y:galleryTop}];
  let index=0;while(index<stops.length-2&&y>stops[index+1].y)index++;
  const from=stops[index],to=stops[index+1];
  const t=clamp((y-from.y)/Math.max(1,to.y-from.y));
  window.dispatchEvent(new CustomEvent('portfolio:scene',{detail:{from:from.name,to:to.name,progress:reduced.matches?0:t,reducedMotion:reduced.matches}}));
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(paint);}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);
addEventListener('portfolio:texture-ready',schedule);
mobile.addEventListener('change',measure);reduced.addEventListener('change',measure);
new ResizeObserver(measure).observe(track);
const reveals = new IntersectionObserver(list=>list.forEach(({target,isIntersecting})=>{if(isIntersecting){target.classList.add('visible');reveals.unobserve(target);}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>reveals.observe(el));
document.fonts.ready.then(measure);measure();

// Bring a keyboard-focused project into view in the pinned horizontal gallery.
track.addEventListener('focusin',e=> {
  if(mobile.matches||reduced.matches)return;
  const card=e.target.closest('.wk-card');if(!card)return;
  const left=card.getBoundingClientRect().left,right=card.getBoundingClientRect().right;
  if(left<0||right>innerWidth){const top=gallery.getBoundingClientRect().top+scrollY;scrollTo({top:top+card.offsetLeft,behavior:'instant'});}
});

