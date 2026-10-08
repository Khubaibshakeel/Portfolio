export const palettes = {
  sand: {name:'Cream & sand', colors:['#faf6ee','#eddfcb','#f3eadc']},
  sage: {name:'Cream & sage', colors:['#f4f1e5','#d4ddcb','#e9e1ce']},
  blue: {name:'Ivory & dusty blue', colors:['#f3efe6','#d2dfe7','#e7ddcf']}
};
const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform float time, organic, patternStrength;
uniform vec3 paper, ribbon, edge;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
}
float field(vec2 p){return .62*noise(p)+.26*noise(p*2.03)+.12*noise(p*4.07);}
void main(){
  if(organic>.5){
    vec2 p=gl_FragCoord.xy/resolution.y*3.2;
    vec2 warp=vec2(field(p*.85+time*.028),field(p*.85+vec2(5.2,1.3)-time*.023));
    float cloud=field(p+warp*1.7+vec2(time*.016,-time*.012));
    float flow=smoothstep(.30,.68,cloud);
    vec3 color=mix(paper,edge,flow*.4);
    color=mix(color,ribbon,smoothstep(.25,.9,flow)*.7);
    // A regular fine dot screen fades in and out with the flowing cloud field.
    vec2 dotUV=fract(gl_FragCoord.xy/4.)-.5;
    float radius=mix(.03,.39,flow);
    float dotMask=1.-smoothstep(radius-.055,radius+.055,length(dotUV));
    vec3 ink=mix(ribbon,vec3(.35,.37,.32),.19);
    color=mix(color,ink,dotMask*flow*.58);
    float grain=hash(gl_FragCoord.xy+floor(time*5.)*vec2(17.,29.))-.5;
    color=mix(paper,color,patternStrength);
    gl_FragColor=vec4(clamp(color+grain*.035,0.,1.),1.);return;
  }
  vec2 p=gl_FragCoord.xy / resolution.y * 3.0;
  p+=vec2(.085*sin(time*.15), time*.014);
  vec2 cell=floor(p), uv=fract(p);
  if(hash(cell+vec2(4.7,2.1))>.5)uv.x=1.-uv.x;
  float distanceToArc=min(abs(length(uv)-.5),abs(length(uv-1.)-.5));
  float width=.105+.012*sin(time*.3)+(1.-patternStrength)*.14;
  float halo=exp(-pow(distanceToArc/(width*1.75),2.));
  float core=exp(-pow(distanceToArc/width,2.));
  vec3 color=mix(paper,edge,halo*.77);
  color=mix(color,ribbon,core*.89);
  color=mix(paper,color,patternStrength);
  // Fine luminance grain: slower refresh than motion, with no texture downloads.
  float grain=hash(gl_FragCoord.xy+floor(time*8.)*vec2(17.,29.))-.5;
  color+=grain*.19;
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`;
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export function createGrain(canvas, palette='sand') {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
  if(!gl){canvas.style.background=`linear-gradient(135deg,${palettes[palette].colors.join(',')})`;return;}
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','time','paper','ribbon','edge','organic','patternStrength'].map(k=>[k,gl.getUniformLocation(program,k)]));
  gl.uniform1f(uniforms.organic,palette==='sand'?0:1);
  palettes[palette].colors.forEach((color,i)=>gl.uniform3fv(uniforms[['paper','ribbon','edge'][i]],rgb(color)));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame, visible=true, last=0, lost=false;
  let strength=1;
  if(canvas.classList.contains('grain-canvas')){
    window.addEventListener('portfolio:texture',event=>{strength=event.detail.strength;if(reduced.matches){last=0;start();}});
  }
  function draw(time=0){
    frame=null;if(lost||document.hidden||!visible)return;
    if(time-last>65 || reduced.matches || !last){
      // Grain is intentionally fine but doesn't need a retina-sized framebuffer.
      const bounds=canvas.getBoundingClientRect(), scale=Math.min(devicePixelRatio||1,innerWidth<=900?1.25:1.5,Math.sqrt(1600000/(bounds.width*bounds.height)));
      const w=Math.max(1,Math.round(bounds.width*scale)),h=Math.max(1,Math.round(bounds.height*scale));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      gl.uniform2f(uniforms.resolution,w,h);gl.uniform1f(uniforms.patternStrength,strength);gl.uniform1f(uniforms.time,reduced.matches?0:time/1000);gl.drawArrays(gl.TRIANGLES,0,6);last=time;
    }
    if(!reduced.matches)frame=requestAnimationFrame(draw);
  }
  function start(){if(frame===null||frame===undefined)frame=requestAnimationFrame(draw);}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();}).observe(canvas);
  new ResizeObserver(()=>{last=0;start();}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
  reduced.addEventListener('change',()=>{last=0;start();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);canvas.hidden=true;canvas.style.display='none';});
  // Keep the page usable if the browser discards this decorative context.
  canvas.addEventListener('webglcontextrestored',()=>{canvas.style.background=palettes[palette].colors[0];});
  start();
}

// Cream and sand is the default; a palette URL previews other options.
const selected=new URLSearchParams(location.search).get('palette') || 'sand';
if(palettes[selected] && document.querySelector('.scene-bg')){
  const canvas=document.createElement('canvas');canvas.className='grain-canvas';canvas.setAttribute('aria-hidden','true');
  document.querySelector('.scene-bg').prepend(canvas);document.documentElement.classList.add('grain-active');createGrain(canvas,selected);
  window.dispatchEvent(new Event('portfolio:texture-ready'));
}

