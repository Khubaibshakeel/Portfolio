let ready;
// One shared import; no viewer bundle is needed for the mobile opening scene.
export function loadModelViewer(){
 return ready??=import('https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js').then(()=>{
  const Viewer=customElements.get('model-viewer');
  Viewer.modelCacheSize=innerWidth<=900||matchMedia('(pointer:coarse)').matches||navigator.deviceMemory<=4?1:2;
  Viewer.minimumRenderScale=.5;
 });
}
