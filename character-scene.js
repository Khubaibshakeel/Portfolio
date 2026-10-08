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
// Continuous cubic tangents carry the camera through each orbit, instead of
// interpolating azimuth and height along a separate straight line per stop.
function samplePath(values,index,t){
 const v=i=>values[stops[clamp(i,0,stops.length-1)]];
 const a=v(index-1),b=v(index),c=v(index+1),d=v(index+2);
 return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
}
const stops=['focus-start','focus-1','focus-2','focus-3','focus-4','focus-5','focus-works'];
// Five deliberately different shots: high right, right profile, low frontal,
// left profile, and high frontal. No repeated diagonal seesaw.
const angles={'focus-start':0,'focus-1':-.64,'focus-2':-1.15,'focus-3':.28,'focus-4':1.08,'focus-5':-.12,'focus-works':.4};
const elevations={'focus-start':0,'focus-1':.32,'focus-2':-.08,'focus-3':-.26,'focus-4':.18,'focus-5':.40,'focus-works':.12};
const distances={'focus-start':5,'focus-1':4.45,'focus-2':5.15,'focus-3':4.65,'focus-4':5.35,'focus-5':4.6,'focus-works':5.8};
const rolls={'focus-start':0,'focus-1':-.035,'focus-2':.045,'focus-3':-.055,'focus-4':.035,'focus-5':-.025,'focus-works':.12};
const framingX={'focus-start':.5,'focus-1':.32,'focus-2':.27,'focus-3':.24,'focus-4':.27,'focus-5':.25,'focus-works':.25};
const framingY={'focus-start':.70,'focus-1':.78,'focus-2':.74,'focus-3':.80,'focus-4':.74,'focus-5':.77,'focus-works':.77};
let scrollState={from:'focus-start',to:'focus-1',progress:0};
addEventListener('portfolio:scene',e=>{if(!stage.classList.contains('focused'))scrollState=e.detail;});
let renderer;
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:compact?'low-power':'default'});}
catch{document.documentElement.classList.add('character-fallback');status.textContent='Character preview';throw new Error('WebGL unavailable');}
renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
renderer.shadowMap.enabled=!compact;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
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
scene.add(new THREE.HemisphereLight(0xfff6e9,0x605b53,.85));
const key=new THREE.DirectionalLight(0xffe4c8,2.35);key.position.set(-3.8,5,4);scene.add(key);
key.castShadow=!compact;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.camera.near=.5;key.shadow.camera.far=25;key.shadow.normalBias=.04;key.shadow.bias=-.0001;key.shadow.radius=3;
const fill=new THREE.DirectionalLight(0xdfeaff,1.05);fill.position.set(4,2,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffe7c7,1.5);rim.position.set(2,3,-4);scene.add(rim);
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
  if(e.total)window.portfolioBoot?.progress(e.loaded/e.total*100);
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
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=true;o.castShadow=!compact;o.receiveShadow=!compact;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.envMapIntensity=.55;}});
 await renderer.compileAsync(scene,camera);
 loaded=true;status.hidden=true;mount.dataset.loaded='true';mount.dataset.quality=compact?'compact':'desktop';mount.dataset.eyes=String(eyes.length);draco.dispose();
 window.dispatchEvent(new Event('portfolio:character-ready'));
}catch(error){document.documentElement.classList.add('character-fallback');status.textContent='Character preview';mount.dataset.error=error.message;window.portfolioBoot?.fail('scene');window.portfolioBoot?.fail('products');console.error('Character scene:',error);}
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();loaded=false;mount.dataset.loaded='false';document.documentElement.classList.add('character-fallback');status.hidden=false;status.textContent='Character preview';});

let last=performance.now(),lastDraw=0,sceneProgress=0,yaw=0,elevation=0,distance=5,eyeX=0,eyeY=0,firstFrame=false;
const cameraDirection=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),target=new THREE.Vector3();
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden||!loaded||stage.classList.contains('focused')||document.querySelector('.project-dialog').open){last=now;return;}
 if(compact&&now-lastDraw<32)return;
 const dt=Math.min((now-last)/1000,.05);last=now;lastDraw=now;
 if(scrollState.from==='focus-works'){
  mount.style.opacity='0';
  if(!firstFrame){renderer.render(scene,camera);firstFrame=true;mount.dataset.rendered='true';window.portfolioBoot?.ready('scene');}
  return;
 }
 // Smooth a single continuous path coordinate, including framing and scale,
 // so fast wheel gestures cannot snap those values while the camera catches up.
 const requested=clamp(Math.max(0,stops.indexOf(scrollState.from))+clamp(scrollState.progress,0,1),0,stops.length-1);
 sceneProgress=reduced.matches?requested:lerp(sceneProgress,requested,1-Math.exp(-dt*5.5));
 const segment=Math.min(Math.floor(sceneProgress),stops.length-2);
 const from=stops[segment],to=stops[segment+1];
 // Reach each pose before its card crosses the focus line, then briefly dwell.
 const t=smooth(clamp((sceneProgress-segment)/.88,0,1));
 const enter=from==='focus-start'?t:1;
 // Preserve the original Works fade timing: visibility follows actual scroll,
 // independently of the slower, smoothed camera path.
 const fadeEase=t=>t*t*(3-2*t);
 const fadeProgress=fadeEase(clamp(scrollState.progress,0,1));
 const exit=scrollState.to==='focus-works'?fadeEase(clamp((fadeProgress-.25)/.75,0,1)):scrollState.from==='focus-works'?1:0;
 yaw=samplePath(angles,segment,t);
 elevation=samplePath(elevations,segment,t);
 distance=samplePath(distances,segment,t);
 const rawExit=scrollState.to==='focus-works'?clamp(scrollState.progress,0,1):0;
 const exitTurn=reduced.matches?0:smooth(clamp(rawExit/.78,0,1));
 // Orbit the actual camera: each résumé stop has its own azimuth, elevation
 // and dolly distance. Offset the aim in camera space to preserve the layout.
 cameraDirection.set(-Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
 camera.position.copy(cameraDirection).multiplyScalar(distance);camera.lookAt(0,0,0);
 const roll=reduced.matches?0:samplePath(rolls,segment,t);
 camera.rotateZ(roll);
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
 camera.position.add(target);
 camera.updateMatrixWorld(true);
 turn.position.set(0,0,0);
 turn.rotation.set(0,exitTurn*Math.PI*1.12,-exitTurn*.20);
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
  const desiredY=lerp(.38,.34,enter)+exitTurn*.08;
  const depth=face.clone().sub(camera.position).dot(cameraDirection.clone().negate());
  const faceHeight=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const correction=right.clone().multiplyScalar((projected.x-(desiredX*2-1))*faceHeight*camera.aspect/2).addScaledVector(up,(projected.y-(1-desiredY*2))*faceHeight/2);
  camera.position.add(correction);target.add(correction);
 }
 mount.style.opacity=String((1-exit)*(stage.classList.contains('focused')?0:1));
 // Let the torso continue beyond the viewport, without a chest fade.
 mount.style.maskImage='none';
 // These exported eyes are open hemispheres. Keep their rims behind the lids.
 const trackingStrength=Math.max(0,Math.cos(yaw));
 eyeX=lerp(eyeX,reduced.matches?0:pointer.x*.065*trackingStrength,1-Math.exp(-dt*10));
 eyeY=lerp(eyeY,reduced.matches?0:pointer.y*.045*trackingStrength,1-Math.exp(-dt*10));
 for(const eye of eyes)eye.rotation.set(0,eyeX,eyeY,'YZX');
 mount.dataset.angle=yaw.toFixed(3);mount.dataset.gaze=`${eyeX.toFixed(3)},${eyeY.toFixed(3)}`;
 mount.dataset.camera=`${yaw.toFixed(3)},${elevation.toFixed(3)},${distance.toFixed(3)}`;
 mount.dataset.roll=roll.toFixed(3);mount.dataset.exitTurn=exitTurn.toFixed(3);
 // Slow, continuous studio sweep: highlight movement, never a flashing light.
 const phase=reduced.matches?0:now*.0004+sceneProgress*.65;
 key.position.set(-3.8+Math.sin(phase)*1.2,5,4+Math.cos(phase)*.8);
 key.intensity=2.35+(reduced.matches?0:Math.sin(phase)*.22);
 rim.position.set(2+Math.cos(phase*.8)*1.3,3,-4);
 rim.intensity=1.5+(reduced.matches?0:Math.sin(phase+.8)*.28);
 // Less than one CSS pixel of color separation, only in the closer shots.
 // The effect stays inside the character canvas; page text remains crisp.
 const zoomStrength=reduced.matches?0:smooth(clamp((5-distance)/.6,0,1));
 if(chromatic)chromatic.uniforms.amount.value=zoomStrength*.85/innerWidth;
 mount.dataset.aberration=zoomStrength.toFixed(3);
 if(exit<1||!firstFrame){
  if(composer)composer.render(dt);else renderer.render(scene,camera);
  if(!firstFrame){firstFrame=true;mount.dataset.rendered='true';window.portfolioBoot?.ready('scene');}
 }
}
requestAnimationFrame(frame);
