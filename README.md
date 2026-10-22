# WebDJ — Dual Deck Controller (prototype)

DDJ-FLX4 / DDJ-400 inspired, browser-based two-deck DJ interface. Static files only; deployable to GitHub Pages.

## Features in this starter
- Responsive dual-deck UI with circular jog wheels, pitch, transport, hot-cue pads, loop in/out/reloop controls and 2-channel mixer
- Load local audio files and play them through Web Audio API
- Basic EQ, filter, channel faders, crossfader and master gain
- Web MIDI API input monitoring and MIDI output test messages
- No build step or dependencies

## Japanese development notes
- [Architecture and compatibility notes](docs/ARCHITECTURE_JA.md)
- [Generic MIDI protocol, loopMIDI setup and DJ software integration](docs/MIDI_PROTOCOL_JA.md)

## Run locally
Use a local HTTP server or publish the repository with GitHub Pages. Web MIDI generally requires a secure context (HTTPS or localhost), and browser support varies. Click **オーディオ有効化** before playback and **MIDI接続** to grant access.

## Deploy to GitHub Pages
1. Create a GitHub repository and upload `index.html`, `style.css`, `app.js`, and this README to its root.
2. In **Settings → Pages**, choose **Deploy from a branch**, select the default branch and `/ (root)`.
3. Open the published HTTPS URL.

## Important limitations (read before using with DJ software)
- **This page cannot create a virtual MIDI device.** Web MIDI lets a page communicate with MIDI devices exposed by the operating system; it does not make this webpage appear as a new USB MIDI controller to Rekordbox or Mixxx.
- A web page cannot impersonate a DDJ-FLX4/DDJ-400 USB hardware device or reproduce Pioneer firmware/protocols. Do not expect this UI to control Rekordbox directly.
- Mixxx supports user-created controller mappings, but those mappings run inside Mixxx and are not the same as this web app. See https://github.com/mixxxdj/mixxx/wiki/MIDI-Scripting
- On Windows, create an OS-visible virtual MIDI port with a tool such as loopMIDI, then select it as WebDJ's MIDI output and as the DJ software's MIDI input. An included FLX4-inspired Mixxx mapping is in `mixxx/WebDJ-Bridge.midi.xml` with its required script `mixxx/WebDJ-Bridge-script.js`; install both files into Mixxx's controllers folder. For iPad, support depends on browser/OS MIDI access; Web MIDI is not universally available in Safari.
- Audio playback is a functional prototype, not a full DJ engine: no beatgrid/BPM analysis, key detection, beatmatching engine, waveform zoom, cue/headphone audio routing, or professional scratch algorithm. The loop button is a basic prototype.
- This is an original interface inspired by common 2-deck layouts, not a pixel-perfect copy of Pioneer product UI.

## MIDI
The app lists connected MIDI input/output devices and logs incoming messages. The current demo sends simple Note On test messages when buttons are clicked. The exact MIDI mapping depends on your hardware/software; this demo does not provide a guaranteed FLX4 hardware mapping.


## LAN control from another device (Windows + Mixxx)

You can operate Mixxx from a phone, iPad, or another computer on the same local network. The Windows PC runs this page and a WebSocket-to-MIDI bridge; the remote browser does not need Web MIDI support.

1. Install and start **loopMIDI** on Windows. Create a virtual port named exactly `WebDJ Bridge`.
2. Download/clone this repository to the Windows PC.
3. Run `setup-lan.bat` once to install Python dependencies. Python 3.10 or newer is recommended.
4. Run `start-lan.bat`. The console prints a one-time connection code and the local URL pattern.
5. Find the Windows PC's IPv4 address with `ipconfig` (the address for the active Wi-Fi/Ethernet adapter), then on the other device open `http://<PC-IP>:8765/`. Replace `<PC-IP>` with the actual address.
6. Press **LAN接続** and enter the connection code shown in the Windows console.
7. In Mixxx, enable the **WebDJ Bridge** controller using the existing mapping, with loopMIDI's `WebDJ Bridge` port selected as its MIDI input.

Allow Python / TCP port 8765 only on Windows **Private networks** if prompted. Keep the bridge on a trusted home/local network; do not forward this port from your router to the internet. The connection code changes each time the server starts. To use remote LAN control, open the page served by the Windows PC, not the GitHub Pages URL. The existing direct Web MIDI connection remains available for local use.
