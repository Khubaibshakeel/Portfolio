// Original synthesized sounds. Enabled by default; browser activation starts playback.
const effectsButton = document.querySelector('#sound-effects');
const musicButton = document.querySelector('#sound-music');
let context, effectsBus, musicBus, noise, timer, nextBeat = 0, beat = 0;
let effects = true, music = true, lastScroll = 0, lastY = scrollY;
async function unlock() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)();
    effectsBus = context.createGain(); effectsBus.gain.value = .13; effectsBus.connect(context.destination);
    musicBus = context.createGain(); musicBus.gain.value = 0; musicBus.connect(context.destination);
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  await context.resume();
}
function tone(freq, at, length, gain, bus, type = 'sine', end = freq) {
  const oscillator = context.createOscillator(), envelope = context.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(freq, at);
  oscillator.frequency.exponentialRampToValueAtTime(end, at + length);
  envelope.gain.setValueAtTime(0, at); envelope.gain.linearRampToValueAtTime(gain, at + .008);
  envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
  oscillator.connect(envelope); envelope.connect(bus);
  oscillator.start(at); oscillator.stop(at + length + .02);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
function brush(at, gain) {
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
  source.buffer = noise; filter.type = 'lowpass'; filter.frequency.value = 1800;
  envelope.gain.setValueAtTime(gain, at); envelope.gain.exponentialRampToValueAtTime(.0001, at + .07);
  source.connect(filter); filter.connect(envelope); envelope.connect(musicBus);
  source.start(at); source.stop(at + .08);
  source.onended = () => {source.disconnect(); filter.disconnect(); envelope.disconnect();};
}
function clickSound() {
  if (effects && context?.state === 'running') tone(740, context.currentTime, .075, .22, effectsBus, 'sine', 420);
}
function scheduleMusic() {
  if (!music || context.state !== 'running') return;
  const duration = 60 / 76;
  // Skip missed beats after a suspended/background tab rather than queueing a burst.
  if (nextBeat < context.currentTime) nextBeat = context.currentTime + .04;
  while (nextBeat < context.currentTime + .16) {
    const at = nextBeat, step = beat % 16;
    if (step % 4 === 0) {
      const chords = [[220,261.63,329.63],[174.61,220,261.63],[130.81,164.81,196],[196,246.94,293.66]];
      chords[Math.floor(step / 4)].forEach((f,i) => tone(f,at + i * .018,2.6,.075,musicBus));
      tone(100,at,.24,.25,musicBus,'sine',44);
      tone([110,87.31,65.41,98][Math.floor(step / 4)],at,.8,.14,musicBus);
    }
    if (step % 4 === 2) brush(at,.08);
    if (step % 2 === 1) brush(at,.024);
    nextBeat += duration; beat++;
  }
}
function musicLevel(value) {
  if(!context)return;
  const now = context.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value,now);
  musicBus.gain.linearRampToValueAtTime(value,now + .4);
}
function startMusic(){
  if(!music||!context||context.state!=='running'||timer)return;
  nextBeat=context.currentTime+.05;beat=0;
  const playingVideo=document.querySelector('#project-video');
  musicLevel(playingVideo.paused ? .18 : 0);
  scheduleMusic();timer=setInterval(scheduleMusic,60);
}
async function activate(event){
  if(event.target.closest('.sound-controls')||(!effects&&!music))return;
  try{await unlock();startMusic();}catch{/* Leave the controls available for retry. */}
}
document.addEventListener('pointerdown',activate,{passive:true});
document.addEventListener('keydown',event=>{if(!event.ctrlKey&&!event.metaKey&&!event.altKey)activate(event);});
effectsButton.addEventListener('click',async () => {
  effects = !effects; effectsButton.textContent = effects ? 'Sounds on' : 'Sounds off'; effectsButton.setAttribute('aria-pressed',String(effects));
  try {await unlock();startMusic();if(effects)clickSound();}
  catch {effectsButton.textContent = 'Sound unavailable';}
});
musicButton.addEventListener('click',async () => {
  music = !music;
  musicButton.textContent = music ? 'Music on' : 'Music off'; musicButton.setAttribute('aria-pressed',String(music));
  try {
    await unlock();
    clearInterval(timer);timer=null;
    if(music)startMusic();else musicLevel(0);
  } catch {musicButton.textContent='Music unavailable';}
});
document.addEventListener('click',event => {
  if(event.target.closest('button,a') && !event.target.closest('.sound-controls'))clickSound();
});
addEventListener('scroll',() => {
  const now=performance.now(), distance=Math.abs(scrollY-lastY);lastY=scrollY;
  if(effects && context?.state==='running' && distance>2 && now-lastScroll>280){lastScroll=now;tone(240,context.currentTime,.055,.065,effectsBus,'sine',180);}
},{passive:true});
document.querySelector('#project-video').addEventListener('play',()=>{if(music)musicLevel(0);});
document.querySelector('#project-video').addEventListener('pause',()=>{if(music&&!document.hidden)musicLevel(.18);});
document.addEventListener('visibilitychange',() => {
  if(!context)return;
  if(document.hidden){clearInterval(timer);timer=null;context.suspend();}
  else if(effects||music){context.resume().then(startMusic);}
});
