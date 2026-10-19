import {Vector2} from 'three';

// A single inexpensive pass keeps the focal decal clear while softly defocusing
// the rest of the portrait. It never affects the HTML résumé or controls.
export const StickerFocusShader={
 uniforms:{tDiffuse:{value:null},resolution:{value:new Vector2(1,1)},focus:{value:new Vector2(.5,.5)},radius:{value:.13},strength:{value:0},blurPixels:{value:3},aberrationPixels:{value:0}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`
 uniform sampler2D tDiffuse;
 uniform vec2 resolution,focus;
 uniform float radius,strength,blurPixels,aberrationPixels;
 varying vec2 vUv;
 vec4 premul(vec2 uv){vec4 c=texture2D(tDiffuse,uv);c.rgb*=c.a;return c;}
 void main(){
  vec4 sharp=texture2D(tDiffuse,vUv);
  if(strength<.001){gl_FragColor=sharp;return;}
  vec2 delta=(vUv-focus)*vec2(resolution.x/resolution.y,1.);
  float outside=smoothstep(radius,radius+.16,length(delta))*strength;
  vec2 stepUV=vec2(blurPixels*outside)/resolution;
  vec4 blurred=premul(vUv)*.25;
  blurred+=(premul(vUv+vec2(stepUV.x,0.))+premul(vUv-vec2(stepUV.x,0.))+premul(vUv+vec2(0.,stepUV.y))+premul(vUv-vec2(0.,stepUV.y)))*.125;
  blurred+=(premul(vUv+stepUV)+premul(vUv-stepUV)+premul(vUv+vec2(stepUV.x,-stepUV.y))+premul(vUv+vec2(-stepUV.x,stepUV.y)))*.0625;
  if(blurred.a>.0001)blurred.rgb/=blurred.a;
  vec4 color=mix(sharp,blurred,outside);
  vec2 shift=vec2(aberrationPixels*outside/resolution.x,0.);
  // Color separation fades completely inside the focal region and alpha edge.
  vec4 red=texture2D(tDiffuse,vUv+shift),blue=texture2D(tDiffuse,vUv-shift);
  float fringe=outside*min(min(red.a,blue.a),color.a)*.55;
  color.r=mix(color.r,red.r,fringe);color.b=mix(color.b,blue.b,fringe);
  gl_FragColor=color;
 }`
};
