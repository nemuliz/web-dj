# WebDJ: 設計と互換性

## 方針
GitHub Pagesで配信する静的Webアプリを中心に、ブラウザ内のDJ再生機能と、OSが公開するMIDIポート経由のDJソフト連携を分けて扱います。

## ブラウザ内で実現する機能
- Web Audio APIによるローカル音声ファイルの再生
- 2デッキUI、波形表示、ピッチ、Cue、Hot Cue
- 2チャンネルのミキサー、EQ、フィルター、クロスフェーダー
- 対応ブラウザでのWeb MIDI入出力

## 制約
- GitHub PagesだけではWindowsに仮想MIDIポートを作成できません。
- Web MIDI APIはOSが公開しているMIDIポートを利用するもので、Webページを新しいUSB MIDI機器として認識させるものではありません。
- DDJ-FLX4/DDJ-400のUSB descriptor、ファームウェア、独自プロトコル、ハードウェア認証はエミュレートしません。
- iPadのブラウザではWeb MIDIの対応状況が異なるため、iPadではまずブラウザ内のDJ機能を利用する構成とします。
- Rekordboxで一般MIDI入力を利用できるか、必要な操作を割り当てられるかは、バージョン・接続ポート・動作モードによって異なります。純正DDJ-FLX4互換や全機能の動作は保証しません。

## WindowsでDJソフトへMIDIを渡す構成
1. Windows側で仮想MIDIポートを用意します（例: loopMIDI。別途インストールが必要）。
2. WebDJでOSに公開されたMIDI出力ポートを選択します。
3. DJソフト側で対応するMIDI入力ポートを選択します。
4. MIDIモニターで信号を確認し、DJソフト側のマッピングを調整します。

Mixxxのマッピング仕様: https://github.com/mixxxdj/mixxx/wiki/MIDI-Controller-Mapping-File-Format
MixxxのMIDIスクリプト: https://github.com/mixxxdj/mixxx/wiki/MIDI-Scripting

## iPad
GitHub PagesはWebページを配信するだけで、iPadからWindows PC上のDJソフトへ直接接続する中継サーバーではありません。iPadからPC側ソフトを遠隔操作する機能が必要な場合は、PC側に別途ブリッジサービスを設け、通信方式・認証・ネットワーク権限を設計する必要があります。
