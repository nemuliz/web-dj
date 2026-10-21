# WebDJ — Dual Deck Controller (prototype)

DDJ-FLX4 / DDJ-400 inspired, browser-based two-deck DJ interface. Static files only; deployable to GitHub Pages.

## Features in this starter
- Responsive dual-deck UI with jog wheels, pitch, transport, hot-cue pads and 2-channel mixer
- Load local audio files and play them through Web Audio API
- Basic EQ, filter, channel faders, crossfader and master gain
- Web MIDI API input monitoring and MIDI output test messages
- No build step or dependencies

## Japanese development notes
- [Architecture and compatibility notes](docs/ARCHITECTURE_JA.md)
- [Generic MIDI protocol and DJ software integration](docs/MIDI_PROTOCOL_JA.md)

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
- To control desktop software from this interface, a separate native MIDI bridge/virtual MIDI port would be needed on Windows. For iPad, support depends on the browser/OS and MIDI device access; Web MIDI is not universally available in Safari.
- Audio playback is a functional prototype, not a full DJ engine: no beatgrid/BPM analysis, key detection, beatmatching engine, waveform zoom, cue/headphone audio routing, or professional scratch algorithm. The loop button is a basic prototype.
- This is an original interface inspired by common 2-deck layouts, not a pixel-perfect copy of Pioneer product UI.

## MIDI
The app lists connected MIDI input/output devices and logs incoming messages. The current demo sends simple Note On test messages when buttons are clicked. The exact MIDI mapping depends on your hardware/software; this demo does not provide a guaranteed FLX4 hardware mapping.
