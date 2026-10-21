/* WebDJ prototype: local audio playback and Web MIDI device access.
   This does NOT create a virtual MIDI port for Rekordbox/Mixxx. */
(() => {
  const $ = id => document.getElementById(id);
  let audioCtx = null, masterGain = null, midiAccess = null, selectedOut = null;
  const decks = {};
  const library = [];
  const log = (s) => { const el=$('midiLog'); if(el.textContent.includes('MIDIデバイスを接続')) el.textContent=''; const row=document.createElement('div'); row.className='midi-line'; row.textContent=s; el.prepend(row); while(el.children.length>70) el.lastChild.remove(); };
  const fmt = t => { if(!Number.isFinite(t)) return '--:--'; const m=Math.floor(t/60), s=Math.floor(t%60), d=Math.floor((t%1)*10); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${d}`; };
  function initDeck(id) {
    const filters = {};
    return {id, buffer:null, source:null, startAt:0, offset:0, playing:false, pitch:0, cue:0, loop:false, pads:[null,null,null,null], gain:null, eq:{}, filter:null, analyser:null, channelGain:null, fileName:'', jogAngle:0, jogDown:false, jogLastX:0,
      filters};
  }
  decks.A=initDeck('A'); decks.B=initDeck('B');
  function ensureAudio() {
    if(audioCtx) { if(audioCtx.state==='suspended') audioCtx.resume(); return; }
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=audioCtx.createGain(); masterGain.gain.value=Number($('master').value); masterGain.connect(audioCtx.destination);
    for(const id of ['A','B']) {
      const d=decks[id]; d.gain=audioCtx.createGain(); d.gain.gain.value=1;
      d.eq.low=audioCtx.createBiquadFilter(); d.eq.low.type='lowshelf'; d.eq.low.frequency.value=120;
      d.eq.mid=audioCtx.createBiquadFilter(); d.eq.mid.type='peaking'; d.eq.mid.frequency.value=1000; d.eq.mid.Q.value=.7;
      d.eq.high=audioCtx.createBiquadFilter(); d.eq.high.type='highshelf'; d.eq.high.frequency.value=8000;
      d.filter=audioCtx.createBiquadFilter(); d.filter.type='lowpass'; d.filter.frequency.value=22000;
      d.analyser=audioCtx.createAnalyser(); d.analyser.fftSize=256;
      d.channelGain=audioCtx.createGain();
      d.gain.connect(d.eq.low); d.eq.low.connect(d.eq.mid); d.eq.mid.connect(d.eq.high); d.eq.high.connect(d.filter); d.filter.connect(d.channelGain); d.channelGain.connect(d.analyser); d.analyser.connect(masterGain);
    }
    applyMix();
  }
  function currentTime(d){ if(!d.buffer)return 0; const t=d.playing ? d.offset+(audioCtx.currentTime-d.startAt)*(1+d.pitch/100) : d.offset; return Math.max(0,Math.min(t,d.buffer.duration)); }
  function stopSource(d){ if(d.source){ try{d.source.stop()}catch{} try{d.source.disconnect()}catch{} d.source=null; } }
  function play(id){ensureAudio(); const d=decks[id]; if(!d.buffer)return; if(d.playing){d.offset=currentTime(d);d.playing=false;stopSource(d);renderDeck(id);return;} if(d.offset>=d.buffer.duration)d.offset=0; d.source=audioCtx.createBufferSource();d.source.buffer=d.buffer;d.source.playbackRate.value=1+d.pitch/100;d.source.connect(d.gain);d.startAt=audioCtx.currentTime;d.playing=true;d.source.onended=()=>{if(d.playing){d.playing=false;d.offset=0;d.source=null;renderDeck(id)}};d.source.start(0,d.offset);renderDeck(id); }
  function seek(id,t){const d=decks[id];if(!d.buffer)return;const was=d.playing;d.offset=Math.max(0,Math.min(t,d.buffer.duration));if(was){stopSource(d);d.playing=false;play(id)}renderDeck(id);}
  function applyMix(){if(!audioCtx)return;masterGain.gain.setTargetAtTime(Number($('master').value),audioCtx.currentTime,.015);const cross=Number($('crossfader').value);for(const id of ['A','B']){const d=decks[id];const side=id==='A'?(1-cross)/2:(1+cross)/2;d.channelGain.gain.setTargetAtTime(Number($('fader'+id).value)*side*2,audioCtx.currentTime,.015);d.gain.gain.setTargetAtTime(Number($('gain'+id).value),audioCtx.currentTime,.015);for(const band of ['low','mid','high']){const key=band==='low'?'low':band==='mid'?'mid':'hi';d.eq[band].gain.setTargetAtTime(Number($(key+id).value)*18,audioCtx.currentTime,.015);}const f=Number($('filter'+id).value);d.filter.frequency.setTargetAtTime(f<0?22000*Math.pow(200/22000,-f):200*Math.pow(22000/200,f),audioCtx.currentTime,.015);}}
  function renderWave(id){const d=decks[id], canvas=$('wave'+id),ctx=canvas.getContext('2d');const w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=canvas.clientHeight*devicePixelRatio;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1014';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#26323a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();if(!d.buffer)return;const data=d.buffer.getChannelData(0),step=Math.max(1,Math.floor(data.length/w));ctx.strokeStyle=id==='A'?'#36d9e8':'#ff8a39';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<w;x++){let min=1,max=-1;for(let j=0;j<step;j++){const v=data[x*step+j]||0;if(v<min)min=v;if(v>max)max=v;}ctx.moveTo(x,h/2+min*h*.42);ctx.lineTo(x,h/2+max*h*.42);}ctx.stroke();const p=d.buffer.duration?currentTime(d)/d.buffer.duration:0;ctx.strokeStyle='#fff';ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(p*w,0);ctx.lineTo(p*w,h);ctx.stroke();ctx.globalAlpha=1;}
  function renderDeck(id){const d=decks[id];$('time'+id).textContent=fmt(currentTime(d));$('duration'+id).textContent=d.buffer?fmt(d.buffer.duration):'--:--';$('pos'+id).style.transform=`rotate(${d.jogAngle}deg)`;const btn=document.querySelector(`[data-action="play"][data-deck="${id}"]`);btn.textContent=d.playing?'Ⅱ PAUSE':'▶ PLAY';btn.classList.toggle('active',d.playing);renderWave(id);}
  async function loadFile(id,file){if(!file)return;ensureAudio();const arr=await file.arrayBuffer();try{const buffer=await audioCtx.decodeAudioData(arr);const d=decks[id];if(d.playing)stopSource(d);Object.assign(d,{buffer,offset:0,playing:false,fileName:file.name,pads:[null,null,null,null]});$('name'+id).textContent=file.name;$('file'+id).value='';library.push({name:file.name,id});renderLibrary();renderDeck(id);log(`Loaded ${id}: ${file.name}`);}catch(e){alert('この音声ファイルをデコードできませんでした。');}}
  function renderLibrary(){const el=$('libraryList');el.textContent='';if(!library.length){el.textContent='まだトラックがありません';return;}library.forEach(item=>{const row=document.createElement('div');row.className='track-row';const name=document.createElement('span');name.textContent=item.name;const btn=document.createElement('button');btn.textContent=`DECK ${item.id==='A'?'1':'2'}`;btn.onclick=()=>seek(item.id,0);row.append(name,btn);el.append(row);});}
  $('audioEnable').onclick=()=>{ensureAudio();audioCtx.resume();$('audioEnable').textContent='オーディオ有効';$('audioEnable').classList.add('primary');};
  $('fileA').addEventListener('change',e=>loadFile('A',e.target.files[0]));$('fileB').addEventListener('change',e=>loadFile('B',e.target.files[0]));
  for(const id of ['A','B']) {
    $('pitch'+id).addEventListener('input',e=>{decks[id].pitch=Number(e.target.value);$('pitchVal'+id).textContent=`${decks[id].pitch.toFixed(1)}%`;if(decks[id].source)decks[id].source.playbackRate.value=1+decks[id].pitch/100;});
    $('wave'+id).addEventListener('click',e=>{const d=decks[id];if(!d.buffer)return;const r=e.currentTarget.getBoundingClientRect();seek(id,((e.clientX-r.left)/r.width)*d.buffer.duration);});
    const jog=$('jog'+id);jog.addEventListener('pointerdown',e=>{ensureAudio();decks[id].jogDown=true;decks[id].jogLastX=e.clientX;jog.setPointerCapture(e.pointerId);});jog.addEventListener('pointermove',e=>{const d=decks[id];if(!d.jogDown)return;const dx=e.clientX-d.jogLastX;d.jogLastX=e.clientX;d.jogAngle+=dx*2;const t=currentTime(d)+(dx*.012);if(d.playing){d.offset=Math.max(0,Math.min(d.buffer?.duration||0,t));d.startAt=audioCtx.currentTime;stopSource(d);d.playing=false;play(id);}else if(d.buffer)seek(id,t);else renderDeck(id);});
    jog.addEventListener('pointerup',()=>decks[id].jogDown=false);jog.addEventListener('pointercancel',()=>decks[id].jogDown=false);
  }
  document.querySelectorAll('input[type=range]').forEach(el=>{if(['pitchA','pitchB'].includes(el.id))return;el.addEventListener('input',applyMix);});
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const id=b.dataset.deck,d=decks[id];switch(b.dataset.action){case'play':play(id);break;case'cue':if(d.playing){d.offset=currentTime(d);d.playing=false;stopSource(d);}else seek(id,d.cue);d.cue=d.offset;renderDeck(id);break;case'sync':{const other=decks[id==='A'?'B':'A'];if(other.buffer&&d.buffer){const bpmFactor=1;d.pitch=other.pitch*bpmFactor;$('pitch'+id).value=d.pitch;$('pitchVal'+id).textContent=d.pitch.toFixed(1)+'%';if(d.source)d.source.playbackRate.value=1+d.pitch/100;}break;}case'loop':d.loop=!d.loop;b.textContent=d.loop?'LOOP ON':'2 BEAT LOOP';b.classList.toggle('active',d.loop);break;case'pad':{const n=Number(b.dataset.pad);if(d.pads[n]===null){d.pads[n]=currentTime(d);b.classList.add('active');}else seek(id,d.pads[n]);break;}case'pitchreset':d.pitch=0;$('pitch'+id).value=0;$('pitchVal'+id).textContent='0.0%';if(d.source)d.source.playbackRate.value=1;break;case'headcue':b.classList.toggle('active');break;}});
  $('midiConnect').onclick=async()=>{if(!navigator.requestMIDIAccess){$('midiStatus').textContent='Web MIDI非対応';log('このブラウザはWeb MIDI APIに対応していません。');return;}try{midiAccess=await navigator.requestMIDIAccess({sysex:false});$('midiDot').classList.add('on');$('midiStatus').textContent='MIDIアクセス許可済み';const inputs=[...midiAccess.inputs.values()],outputs=[...midiAccess.outputs.values()];log(`MIDI inputs: ${inputs.length}, outputs: ${outputs.length}`);inputs.forEach(input=>{log(`IN: ${input.name}`);input.onmidimessage=e=>{const bytes=[...e.data].map(v=>v.toString(16).padStart(2,'0')).join(' ');log(`${input.name||'MIDI'} ← ${bytes}`);};});outputs.forEach(out=>{log(`OUT: ${out.name}`);if(!selectedOut)selectedOut=out;});midiAccess.onstatechange=()=>log('MIDI device list changed');}catch(err){$('midiStatus').textContent='MIDIアクセス拒否';log(`MIDI error: ${err.message}`);}};
  function sendMidi(status,data1,data2){if(selectedOut)selectedOut.send([status,data1,data2]);}
  // Demo MIDI feedback for testing only; not a Rekordbox/Mixxx virtual port.
  document.querySelectorAll('button[data-action]').forEach((b,i)=>b.addEventListener('click',()=>sendMidi(0x90,(i+1)&127,127)));
  function tick(){for(const id of ['A','B']){const d=decks[id];if(d.playing&&d.buffer){const t=currentTime(d);if(d.loop&&d.buffer.duration>0&&t>=Math.max(.1,d.offset+4)){seek(id,d.offset); }else if(t>=d.buffer.duration){d.playing=false;d.offset=0;stopSource(d);}renderDeck(id);if(d.analyser){const a=new Uint8Array(d.analyser.frequencyBinCount);d.analyser.getByteTimeDomainData(a);let sum=0;for(const v of a)sum+=(v-128)**2;$('meter'+id).value=Math.min(1,Math.sqrt(sum/a.length)/70);}}}requestAnimationFrame(tick);}
  window.addEventListener('resize',()=>['A','B'].forEach(renderWave));renderDeck('A');renderDeck('B');requestAnimationFrame(tick);
})();