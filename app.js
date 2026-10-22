/* WebDJ MIDI-only controller for Mixxx via loopMIDI. Browser audio is intentionally disabled. */
(() => {
  const $ = id => document.getElementById(id);
  // Remove only browser audio/file-loading UI. Keep deck controls and jog UI.
  document.querySelectorAll('.deck-head .track-name').forEach((el,i) => { el.textContent = i ? 'MIDI CONTROLLER · MIXXX DECK 2' : 'MIDI CONTROLLER · MIXXX DECK 1'; });
  const footer = document.querySelector('footer');
  if (footer) footer.textContent = 'WEBDJ MIDI Controller · loopMIDI + Mixxx · Browser audio disabled';
  const log = message => {
    const el = $('midiLog'); if (!el) return;
    if (el.textContent.includes('MIDIデバイスを接続')) el.textContent = '';
    const row = document.createElement('div'); row.className = 'midi-line'; row.textContent = message;
    el.prepend(row); while (el.children.length > 70) el.lastChild.remove();
  };
  let midiAccess = null, selectedOut = null, lanSocket = null, lanAuthenticated = false;
  function sendMidi(status, data1, data2) {
    const data = [status, data1, data2];
    if (lanSocket && lanSocket.readyState === WebSocket.OPEN && lanAuthenticated) {
      lanSocket.send(JSON.stringify({type:'midi', data}));
      log('LAN OUT ' + data.map(v=>v.toString(16).padStart(2,'0')).join(' '));
      return;
    }
    if (!selectedOut) { log('MIDI OUT未選択: LAN接続、またはloopMIDIのWebDJ Bridgeを選択してください'); return; }
    try {
      selectedOut.send(data);
      log('OUT ' + data.map(v=>v.toString(16).padStart(2,'0')).join(' '));
    } catch (err) { log('MIDI送信エラー: ' + err.message); }
  }

  function connectLan() {
    if (lanSocket && (lanSocket.readyState === WebSocket.OPEN || lanSocket.readyState === WebSocket.CONNECTING)) {
      lanSocket.close(); return;
    }
    if (location.protocol === 'https:') {
      log('LAN接続はWindows PC上の start-lan.bat が配信する http://PCのIP:8765/ を開いてください。GitHub PagesからのLAN接続は利用できません。');
      return;
    }
    const token = window.prompt('Windows側のWebDJ Bridgeコンソールに表示された接続コードを入力してください:');
    if (!token) return;
    try {
      lanSocket = new WebSocket('ws://' + location.host + '/midi');
      lanAuthenticated = false;
      $('lanConnect').textContent = '接続中…';
      lanSocket.onopen = () => lanSocket.send(JSON.stringify({type:'auth', token}));
      lanSocket.onmessage = event => {
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        if (message.type === 'authenticated') {
          lanAuthenticated = true;
          $('midiDot').classList.add('on');
          $('midiStatus').textContent = 'LAN MIDI接続済み';
          $('lanConnect').textContent = 'LAN切断';
          log('LAN MIDI接続成功: Windows側でMixxx用MIDIポートへ転送します');
        } else if (message.type === 'mixxx_state') {
          applyMixxxMidi(message.data);
        } else if (message.type === 'error') {
          log('LANエラー: ' + message.message);
        }
      };
      lanSocket.onerror = () => log('LAN接続エラー: Windows側サーバー、IPアドレス、ファイアウォールを確認してください。');
      lanSocket.onclose = () => {
        lanAuthenticated = false;
        $('lanConnect').textContent = 'LAN接続';
        if (!selectedOut) {
          $('midiDot').classList.remove('on');
          $('midiStatus').textContent = 'MIDI未接続';
        }
        log('LAN MIDI切断');
      };
    } catch (err) { log('LAN接続エラー: ' + err.message); }
  }
  $('lanConnect').addEventListener('click', connectLan);
  const fullscreenBtn = $('fullscreenBtn');
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return;
      }
      log('このブラウザは全画面APIに非対応です。iPadでは共有メニューから「ホーム画面に追加」して起動すると、ブラウザのバーを隠して使えます。');
    } catch (err) {
      log('全画面表示にできません: ' + err.message + '。iPadでは「ホーム画面に追加」からの起動もお試しください。');
    }
  }
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const active = !!document.fullscreenElement;
    fullscreenBtn.textContent = active ? '全画面解除' : '全画面';
    fullscreenBtn.setAttribute('aria-label', active ? '全画面表示を解除' : '全画面表示');
    document.body.classList.toggle('is-fullscreen', active);
  });

  // Tab switching keeps the controller usable on smaller viewports without scrolling.
  const main = document.querySelector('main');
  document.querySelectorAll('[data-tab-target]').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tabTarget;
      main.dataset.tab = name;
      document.querySelectorAll('[data-tab-target]').forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });
    });
  });

  const feedbackNotes = {
    36:{action:'play',deck:'A'},37:{action:'play',deck:'B'},
    38:{action:'cue',deck:'A',momentary:true},39:{action:'cue',deck:'B',momentary:true},
    40:{action:'sync',deck:'A'},41:{action:'sync',deck:'B'},
    48:{action:'pad',deck:'A',pad:0},49:{action:'pad',deck:'A',pad:1},
    50:{action:'pad',deck:'A',pad:2},51:{action:'pad',deck:'A',pad:3},
    52:{action:'pad',deck:'B',pad:0},53:{action:'pad',deck:'B',pad:1},
    54:{action:'pad',deck:'B',pad:2},55:{action:'pad',deck:'B',pad:3}
  };
  function applyMixxxMidi(data) {
    if (!data || data.length < 3) return;
    const status = Number(data[0]), note = Number(data[1]), value = Number(data[2]);
    if (![0x80,0x90].includes(status & 0xF0)) return;
    const info = feedbackNotes[note];
    if (!info) return;
    const on = (status & 0xF0) === 0x90 && value > 0;
    const button = document.querySelector('[data-action="'+info.action+'"][data-deck="'+info.deck+'"]'+(info.pad === undefined ? '' : '[data-pad="'+info.pad+'"]'));
    if (!button) return;
    if (info.momentary) {
      if (on) {
        button.classList.add('feedback-flash');
        window.setTimeout(() => button.classList.remove('feedback-flash'), 180);
      }
      return;
    }
    button.classList.toggle('active', on);
    if (info.action === 'play') button.textContent = on ? 'Ⅱ PLAYING' : '▶ PLAY';
    if (info.action === 'sync') button.classList.toggle('sync-on', on);
    if (info.action === 'pad') button.classList.toggle('cue-set', on);
  }
  const noteMap = {
    play:{A:36,B:37},cue:{A:38,B:39},sync:{A:40,B:41},loop:{A:42,B:43},
    pitchreset:{A:44,B:45},headcue:{A:46,B:47},loopin:{A:58,B:59},
    loopout:{A:60,B:61},reloop:{A:62,B:63}
  };
  function noteForButton(b) {
    const action=b.dataset.action, deck=b.dataset.deck||'A';
    if(action==='pad') return 48+(deck==='B'?4:0)+Number(b.dataset.pad||0);
    return noteMap[action]?.[deck] ?? null;
  }
  function pulseNote(note) {
    if(note==null)return;
    sendMidi(0x90,note,127);
    window.setTimeout(()=>sendMidi(0x80,note,0),80);
  }
  const ccMap={pitchA:0,pitchB:1,gainA:2,gainB:3,hiA:4,hiB:5,midA:6,midB:7,lowA:8,lowB:9,filterA:10,filterB:11,faderA:12,faderB:13,master:14,crossfader:15,headphones:16};
  function sendControl(el) {
    const cc=ccMap[el.id]; if(cc===undefined)return;
    const min=Number(el.min||0),max=Number(el.max||127);
    const value=Number(el.value);
    sendMidi(0xB0,cc,Math.max(0,Math.min(127,Math.round((value-min)/(max-min||1)*127))));
  }
  document.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click',()=>{
    const action=b.dataset.action, deck=b.dataset.deck;
    pulseNote(noteForButton(b));
    // CUE is a momentary action; flash it briefly instead of inventing a persistent state.
    if (action === 'cue' || action === 'headcue') {
      b.classList.add('feedback-flash');
      window.setTimeout(() => b.classList.remove('feedback-flash'), 180);
    }
    // Persistent PLAY/SYNC/HOT CUE appearance is driven by Mixxx feedback.
    if(action==='pitchreset') {
      const slider=$('pitch'+deck);
      if(slider){slider.value=0;slider.dispatchEvent(new Event('input',{bubbles:true}));}
    }
  }));
  Object.keys(ccMap).forEach(id=>{
    const el=$(id); if(!el)return;
    el.addEventListener('input',()=>{
      if(id.startsWith('pitch')) $('pitchVal'+id.slice(-1)).textContent=Number(el.value).toFixed(1)+'%';
      sendControl(el);
    });
  });
  // Circular, touch-oriented jog. CC value 64 is neutral; values above/below
  // represent clockwise/counter-clockwise relative movement for Mixxx's FLX4-style script.
  for(const id of ['A','B']) {
    const jog=$('jog'+id), note=id==='A'?64:65, cc=id==='A'?20:21;
    let down=false,lastAngle=0,fractional=0,rotation=0;
    const angle=e=>{
      const r=jog.getBoundingClientRect();
      return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))*180/Math.PI;
    };
    const release=()=>{
      if(!down)return;
      down=false; fractional=0; sendMidi(0x80,note,0); jog.classList.remove('touched');
      log('Jog '+id+': touch release');
    };
    jog.addEventListener('pointerdown',e=>{
      e.preventDefault(); down=true; lastAngle=angle(e); fractional=0;
      jog.setPointerCapture(e.pointerId); jog.classList.add('touched');
      sendMidi(0x90,note,127); log('Jog '+id+': touch start');
    });
    jog.addEventListener('pointermove',e=>{
      if(!down)return;
      e.preventDefault();
      const a=angle(e); let delta=a-lastAngle;
      if(delta>180)delta-=360; else if(delta< -180)delta+=360;
      lastAngle=a; fractional+=delta*4;
      const ticks=Math.trunc(fractional); if(!ticks)return;
      fractional-=ticks;
      // Relative jog deltas are centered at 64. Split large pointer jumps into
      // multiple valid MIDI relative steps instead of clipping at 0/127.
      let remaining=ticks;
      while(remaining!==0) {
        const step=Math.max(-63,Math.min(63,remaining));
        sendMidi(0xB0,cc,64+step);
        remaining-=step;
      }
      rotation+=delta;
      $('pos'+id).style.transform='rotate('+rotation+'deg)';
    });
    jog.addEventListener('pointerup',release);
    jog.addEventListener('pointercancel',release);
    jog.addEventListener('lostpointercapture',release);
  }
  const midiInputSelect=$('midiInputSelect'),midiOutputSelect=$('midiOutputSelect');
  function bindMidiInput(){
    if(!midiAccess)return;
    for(const input of midiAccess.inputs.values())input.onmidimessage=null;
    const input=midiAccess.inputs.get(midiInputSelect.value);
    if(input)input.onmidimessage=e=>{ applyMixxxMidi([...e.data]); log((input.name||'MIDI')+' ← '+[...e.data].map(v=>v.toString(16).padStart(2,'0')).join(' ')); };
  }
  function refreshMidiPorts(){
    if(!midiAccess)return;
    const oldIn=midiInputSelect.value,oldOut=midiOutputSelect.value;
    midiInputSelect.replaceChildren(new Option('未選択',''));
    midiOutputSelect.replaceChildren(new Option('未選択',''));
    for(const input of midiAccess.inputs.values())midiInputSelect.add(new Option(input.name||input.id,input.id));
    for(const output of midiAccess.outputs.values())midiOutputSelect.add(new Option(output.name||output.id,output.id));
    if([...midiAccess.inputs.keys()].includes(oldIn))midiInputSelect.value=oldIn;
    if([...midiAccess.outputs.keys()].includes(oldOut))midiOutputSelect.value=oldOut;
    if(!midiInputSelect.value&&midiAccess.inputs.size)midiInputSelect.value=midiAccess.inputs.keys().next().value;
    if(!midiOutputSelect.value&&midiAccess.outputs.size)midiOutputSelect.value=midiAccess.outputs.keys().next().value;
    selectedOut=midiAccess.outputs.get(midiOutputSelect.value)||null; bindMidiInput();
    log('MIDI ports refreshed: '+midiAccess.inputs.size+' inputs, '+midiAccess.outputs.size+' outputs');
    if(selectedOut)log('MIDI OUT selected: '+selectedOut.name);
  }
  midiInputSelect.addEventListener('change',bindMidiInput);
  midiOutputSelect.addEventListener('change',()=>{
    selectedOut=midiAccess?.outputs.get(midiOutputSelect.value)||null;
    log(selectedOut?'MIDI OUT selected: '+selectedOut.name:'MIDI OUT deselected');
  });
  $('midiConnect').addEventListener('click',async()=>{
    if(!navigator.requestMIDIAccess){$('midiStatus').textContent='Web MIDI非対応';log('Chrome/Edgeで開いてください。');return;}
    try{
      midiAccess=await navigator.requestMIDIAccess({sysex:false});
      $('midiDot').classList.add('on');$('midiStatus').textContent='MIDIアクセス許可済み';
      refreshMidiPorts();midiAccess.onstatechange=refreshMidiPorts;
    }catch(err){$('midiStatus').textContent='MIDIアクセス拒否';log('MIDI error: '+err.message);}
  });
})();
