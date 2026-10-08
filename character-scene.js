import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RGBShiftShader} from 'three/addons/shaders/RGBShiftShader.js';

const mount=document.querySelector('#character-scene');
const status=document.querySelector('#character-status');
const windowElement=document.querySelector('.hero-orbit .reference-window');
const stage=document.querySelector('.orbit-stage');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const mobile=matchMedia('(max-width:640px)');
const narrow=matchMedia('(max-width:1000px)');
// Pick once per page load: resizing must not download a second character.
const compact=innerWidth<=900||matchMedia('(pointer:coarse)').matches||navigator.deviceMemory<=4||navigator.connection?.saveData;
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
const stops=['focus-start','focus-1','focus-2','focus-3','focus-4','focus-5','focus-works'];
// Five deliberately different shots: high right, right profile, low frontal,
// left profile, and high frontal. No repeated diagonal seesaw.
const angles={'focus-start':0,'focus-1':-.7,'focus-2':-1.25,'focus-3':.10,'focus-4':1.12,'focus-5':.18,'focus-works':.55};
const elevations={'focus-start':0,'focus-1':.48,'focus-2':.04,'focus-3':-.30,'focus-4':.06,'focus-5':.38,'focus-works':.2};
const distances={'focus-start':5,'focus-1':4.4,'focus-2':5.4,'focus-3':4.65,'focus-4':5.5,'focus-5':4.5,'focus-works':5.5};
const framingX={'focus-start':.5,'focus-1':.32,'focus-2':.27,'focus-3':.24,'focus-4':.27,'focus-5':.25,'focus-works':.25};
const framingY={'focus-start':.70,'focus-1':.78,'focus-2':.74,'focus-3':.80,'focus-4':.74,'focus-5':.77,'focus-works':.77};
let scrollState={from:'focus-start',to:'focus-1',progress:0};
addEventListener('portfolio:scene',e=>{if(!stage.classList.contains('focused'))scrollState=e.detail;});
let renderer;
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:compact?'low-power':'default'});}
catch{document.documentElement.classList.add('character-fallback');status.textContent='Character preview';throw new Error('WebGL unavailable');}
renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
mount.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);
camera.position.z=5;
// Avoid multiple full-screen, multisampled HDR buffers on phones/tablets.
// Desktop keeps the subtle zoom effect, without multisampled HDR buffers.
const composer=compact?null:new EffectComposer(renderer,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType}));
const chromatic=compact?null:new ShaderPass(RGBShiftShader);
if(composer){composer.addPass(new RenderPass(scene,camera));chromatic.uniforms.amount.value=0;chromatic.uniforms.angle.value=.35;composer.addPass(chromatic);composer.addPass(new OutputPass());}
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xfff5e7,0xc6c9d3,1.5));
const key=new THREE.DirectionalLight(0xfff4e6,2.2);key.position.set(-3,4,5);scene.add(key);
const fill=new THREE.DirectionalLight(0xe8efff,.8);fill.position.set(3,1,3);scene.add(fill);
const turn=new THREE.Group(),normalized=new THREE.Group();turn.add(normalized);scene.add(turn);
const eyes=[];
let heroRect={x:.5,y:.4,h:.58},loaded=false;
function resize(){
 const pixelBudget=compact?1400000:2800000;
 const dpr=Math.min(devicePixelRatio,compact?1.6:2,Math.sqrt(pixelBudget/(innerWidth*innerHeight)));
 renderer.setPixelRatio(dpr);composer?.setPixelRatio(dpr);
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
 composer?.setSize(innerWidth,innerHeight);
 const rect=windowElement.getBoundingClientRect();
 heroRect={x:(rect.left+rect.width/2)/innerWidth,y:(rect.top+scrollY+rect.height/2)/innerHeight,h:rect.height/innerHeight};
}
addEventListener('resize',resize);new ResizeObserver(resize).observe(windowElement);resize();
let pointer={x:0,y:0};
addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'||reduced.matches)return;
 pointer={x:clamp(e.clientX/innerWidth*2-1,-1,1),y:clamp(1-e.clientY/innerHeight*2,-1,1)};
},{passive:true});
document.addEventListener('mouseleave',()=>{pointer={x:0,y:0};});
addEventListener('blur',()=>{pointer={x:0,y:0};});
const draco=new DRACOLoader();draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');
const loader=new GLTFLoader();loader.setDRACOLoader(draco);
function sphereCenter(eye){
 // Fit the original sphere from the hemisphere vertices. A bounding-box center
 // lies halfway inside the visible hemisphere and makes the eye swing outward.
 const rows=Array.from({length:4},()=>Array(5).fill(0)),p=new THREE.Vector3();
 eye.traverse(mesh=>{
  if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   p.fromBufferAttribute(positions,i);mesh.localToWorld(p);eye.worldToLocal(p);
   const a=[2*p.x,2*p.y,2*p.z,1],b=p.lengthSq();
   for(let j=0;j<4;j++){for(let k=0;k<4;k++)rows[j][k]+=a[j]*a[k];rows[j][4]+=a[j]*b;}
  }
 });
 for(let i=0;i<4;i++){
  let best=i;for(let j=i+1;j<4;j++)if(Math.abs(rows[j][i])>Math.abs(rows[best][i]))best=j;
  [rows[i],rows[best]]=[rows[best],rows[i]];
  const divisor=rows[i][i];if(Math.abs(divisor)<1e-10)return new THREE.Vector3();
  for(let k=i;k<5;k++)rows[i][k]/=divisor;
  for(let j=0;j<4;j++)if(j!==i){const factor=rows[j][i];for(let k=i;k<5;k++)rows[j][k]-=factor*rows[i][k];}
 }
 return new THREE.Vector3(rows[0][4],rows[1][4],rows[2][4]);
}
try{
 const gltf=await loader.loadAsync(compact?'assets/Khubaib-balanced-mobile.glb':'assets/Khubaib-balanced.glb',e=>{
  status.textContent=e.total?`Loading Khubaib… ${Math.round(e.loaded/e.total*100)}%`:'Loading Khubaib…';
 });
 const model=gltf.scene;model.updateMatrixWorld(true);
 // Recenter each eyeball around its own geometric center. Both exported
 // eye origins share a position, so rotating those original origins would drift.
 for(const name of ['Left Eye','Right Eye']){
  const eye=model.getObjectByName(name)||model.getObjectByName(name.replaceAll(' ','_'));if(!eye)continue;
  const parent=eye.parent;
  const parentCenter=eye.localToWorld(sphereCenter(eye));
  parent.worldToLocal(parentCenter);
  // glTF may represent an eye with several material primitives as a group.
  // Wrap the entire eye so the iris and sclera rotate together.
  const pivot=new THREE.Group();pivot.position.copy(parentCenter);eye.parent.add(pivot);
  eye.position.sub(parentCenter);pivot.add(eye);eyes.push(pivot);
 }
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),height=box.getSize(new THREE.Vector3()).y;
 model.position.sub(center);normalized.add(model);normalized.scale.setScalar(2/height);
 // This export faces +X; turn it toward the viewer's +Z camera.
 normalized.rotation.y=-Math.PI/2;
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.envMapIntensity=.45;}});
 loaded=true;status.hidden=true;mount.dataset.loaded='true';mount.dataset.quality=compact?'compact':'desktop';mount.dataset.eyes=String(eyes.length);draco.dispose();
 window.dispatchEvent(new Event('portfolio:character-ready'));
}catch(error){document.documentElement.classList.add('character-fallback');status.textContent='Character preview';mount.dataset.error=error.message;console.error('Character scene:',error);}
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();loaded=false;mount.dataset.loaded='false';document.documentElement.classList.add('character-fallback');status.hidden=false;status.textContent='Character preview';});

let last=performance.now(),lastDraw=0,sceneProgress=0,yaw=0,elevation=0,distance=5,eyeX=0,eyeY=0;
const cameraDirection=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),target=new THREE.Vector3();
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden||!loaded||stage.classList.contains('focused')||document.querySelector('.project-dialog').open){last=now;return;}
 if(compact&&now-lastDraw<32)return;
 const dt=Math.min((now-last)/1000,.05);last=now;lastDraw=now;
 if(scrollState.from==='focus-works'){mount.style.opacity='0';return;}
 // Smooth a single continuous path coordinate, including framing and scale,
 // so fast wheel gestures cannot snap those values while the camera catches up.
 const requested=clamp(Math.max(0,stops.indexOf(scrollState.from))+clamp(scrollState.progress,0,1),0,stops.length-1);
 sceneProgress=reduced.matches?requested:lerp(sceneProgress,requested,1-Math.exp(-dt*4));
 const segment=Math.min(Math.floor(sceneProgress),stops.length-2);
 const from=stops[segment],to=stops[segment+1],t=smooth(clamp(sceneProgress-segment,0,1));
 const enter=from==='focus-start'?t:1;
 // Preserve the original Works fade timing: visibility follows actual scroll,
 // independently of the slower, smoothed camera path.
 const fadeEase=t=>t*t*(3-2*t);
 const fadeProgress=fadeEase(clamp(scrollState.progress,0,1));
 const exit=scrollState.to==='focus-works'?fadeEase(clamp((fadeProgress-.25)/.75,0,1)):scrollState.from==='focus-works'?1:0;
 yaw=lerp(angles[from]??0,angles[to]??0,t);
 elevation=lerp(elevations[from]??0,elevations[to]??0,t);
 distance=lerp(distances[from]??5,distances[to]??5,t);
 // Orbit the actual camera: each résumé stop has its own azimuth, elevation
 // and dolly distance. Offset the aim in camera space to preserve the layout.
 cameraDirection.set(-Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
 camera.position.copy(cameraDirection).multiplyScalar(distance);camera.lookAt(0,0,0);
 right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
 const visibleHeight=2*5*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 const shotX=lerp(from==='focus-start'?heroRect.x:framingX[from]??.25,framingX[to]??.25,t);
 const shotY=lerp(framingY[from]??.76,framingY[to]??.76,t);
 // Sen uses a full-height character behind broad mobile timeline cards,
 // with a modest camera pullback rather than a miniature side column.
 const portrait=narrow.matches&&innerHeight>innerWidth;
 const x=portrait?lerp(.5,mobile.matches?.43:.32,enter):shotX;
 const y=portrait?lerp(.69,shotY,enter):shotY;
 const heroHeight=portrait?Math.min(1.3,camera.aspect*2.55):1.15;
 const resumeHeight=portrait?Math.min(1.32,camera.aspect*2.8):1.25*Math.min(1,camera.aspect/1.05);
 const height=lerp(heroHeight,resumeHeight,enter);
 target.copy(right).multiplyScalar(-((x-.5)*visibleHeight*camera.aspect)).addScaledVector(up,-((.5-y)*visibleHeight));
 camera.position.add(target);camera.lookAt(target);
 turn.position.set(0,0,0);
 turn.scale.setScalar(height*visibleHeight/2);
 if(portrait&&eyes.length){
  // Aim the portrait around the actual face, rather than the whole torso's
  // bounding-box center. Profile shots must not push the nose off-screen.
  scene.updateMatrixWorld(true);
  const face=new THREE.Vector3(),eyePosition=new THREE.Vector3();
  for(const eye of eyes)face.add(eye.getWorldPosition(eyePosition));
  face.divideScalar(eyes.length);
  const projected=face.clone().project(camera);
  const desiredX=lerp(.5,mobile.matches?.48:.28,enter);
  const desiredY=lerp(.38,.34,enter);
  const depth=face.clone().sub(camera.position).dot(cameraDirection.clone().negate());
  const faceHeight=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const correction=right.clone().multiplyScalar((projected.x-(desiredX*2-1))*faceHeight*camera.aspect/2).addScaledVector(up,(projected.y-(1-desiredY*2))*faceHeight/2);
  camera.position.add(correction);target.add(correction);camera.lookAt(target);
 }
 mount.style.opacity=String((1-exit)*(stage.classList.contains('focused')?0:1));
 // Keep the torso below the viewport; softly clear the introduction over it.
 const heroBottom=(heroRect.y+heroRect.h/2)*100;
 const fadeStart=lerp(portrait?66:62,90,enter),fadeEnd=lerp(portrait?94:85,100,enter);
 mount.style.maskImage=`linear-gradient(to bottom,#000 ${fadeStart}%,transparent ${fadeEnd}%)`;
 // These exported eyes are open hemispheres. Keep their rims behind the lids.
 const trackingStrength=Math.max(0,Math.cos(yaw));
 eyeX=lerp(eyeX,reduced.matches?0:pointer.x*.065*trackingStrength,1-Math.exp(-dt*10));
 eyeY=lerp(eyeY,reduced.matches?0:pointer.y*.045*trackingStrength,1-Math.exp(-dt*10));
 for(const eye of eyes)eye.rotation.set(0,eyeX,eyeY,'YZX');
 mount.dataset.angle=yaw.toFixed(3);mount.dataset.gaze=`${eyeX.toFixed(3)},${eyeY.toFixed(3)}`;
 mount.dataset.camera=`${yaw.toFixed(3)},${elevation.toFixed(3)},${distance.toFixed(3)}`;
 // Less than one CSS pixel of color separation, only in the closer shots.
 // The effect stays inside the character canvas; page text remains crisp.
 const zoomStrength=reduced.matches?0:smooth(clamp((5-distance)/.6,0,1));
 if(chromatic)chromatic.uniforms.amount.value=zoomStrength*.85/innerWidth;
 mount.dataset.aberration=zoomStrength.toFixed(3);
 if(exit<1){if(composer)composer.render(dt);else renderer.render(scene,camera);}
}
requestAnimationFrame(frame);
