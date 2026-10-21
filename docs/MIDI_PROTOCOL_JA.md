# WebDJ 汎用MIDIマッピングと接続手順

このマッピングはWebDJから一般的なMIDI Note/CCを送るためのものです。DDJ-FLX4 / DDJ-400の公式プロトコルやUSBデバイス識別情報を再現するものではありません。

## Windowsで仮想MIDIポートを用意する

1. [loopMIDI公式サイト](https://www.tobias-erichsen.de/software/loopmidi.html)からloopMIDIをインストールして起動します。
2. `+` を押して、たとえば `WebDJ Bridge` というポートを作成します。
3. WebDJをChrome/EdgeのHTTPSページで開き、「MIDI接続」を押してブラウザの許可を与えます。
4. WebDJの `OUTPUT` で `WebDJ Bridge` を選択します。
5. RekordboxまたはMixxx側で、MIDI入力デバイスとして同じ `WebDJ Bridge` を選びます。

loopMIDIはOS上の仮想MIDIポートを作り、WebDJの出力をDJソフトに渡します。ブラウザ単独で新しいOS MIDIポートを作成することはできません。

## WebDJの送信マッピング

すべてMIDIチャンネル1（Note On/Offはステータス `0x90` / `0x80`、CCは `0xB0`）です。

| 操作 | MIDI | 番号 |
|---|---|---:|
| Deck A/B PLAY | Note On/Off | 36 / 37 |
| Deck A/B CUE | Note On/Off | 38 / 39 |
| Deck A/B SYNC | Note On/Off | 40 / 41 |
| Deck A/B LOOP | Note On/Off | 42 / 43 |
| Deck A/B PITCH RESET | Note On/Off | 44 / 45 |
| Deck A/B headphone CUE | Note On/Off | 46 / 47 |
| Deck A Hot Cue 1–4 | Note On/Off | 48–51 |
| Deck B Hot Cue 1–4 | Note On/Off | 52–55 |
| Pitch A/B | CC | 0 / 1 |
| Gain A/B | CC | 2 / 3 |
| HI A/B | CC | 4 / 5 |
| MID A/B | CC | 6 / 7 |
| LOW A/B | CC | 8 / 9 |
| Filter A/B | CC | 10 / 11 |
| Channel fader A/B | CC | 12 / 13 |
| Master / Crossfader / Headphones | CC | 14 / 15 / 16 |
| Jog A/B | CC | 20 / 21 |

CC値は各UIコントロールの最小値〜最大値を0〜127に正規化します。ジョグは円の中心を基準にポインターの角度差を計算し、マウス／タッチの円周方向の動きで再生位置を調整します。ジョグCC（20 / 21）は角度差に応じた簡易相対値で、機種固有のスクラッチプロトコルではありません。

## Rekordboxでの確認

- バージョンやモードによって一般MIDI機器の設定項目・利用可否が異なります。MIDI設定画面で `WebDJ Bridge` が入力候補に表示されるか確認してください。
- ポートが表示されても、純正DDJコントローラーとして認識されたことにはなりません。Hardware Unlock、専用機能、純正USBデバイスとしての識別は代替できません。
- MIDI Learnが使える場合は、割り当てたい機能を選び、WebDJのボタンやフェーダーを操作して学習させます。

## Mixxxでの確認

- Mixxx起動後に仮想ポートを作った場合は、Mixxxを再起動してから `Preferences → Controllers` を確認してください。
- このリポジトリの `mixxx/WebDJ-Bridge.midi.xml` は、`WebDJ Bridge` という名前のポート向けの基本マッピングです。Windowsの `%LOCALAPPDATA%\\Mixxx\\controllers` フォルダーにコピーし、Mixxxを再起動して `Preferences → Controllers` で `WebDJ Bridge` を有効にしてください。既にMixxxが起動中なら、ポート作成後に再起動します。
- コントローラー一覧に表示されない場合は、まずMIDIモニターで `WebDJ Bridge` にイベントが届いているか切り分けてください。

## トラブルシューティングと制約

- Chrome/EdgeでHTTPSまたはlocalhostを使い、ブラウザのMIDI権限を許可してください。
- WebDJのOUTPUTには物理MIDI機器ではなく `WebDJ Bridge` を選択します。
- WebDJがMIDIを送信しても、DJソフト側の入力設定・マッピングがなければ操作は起きません。
- 実際のRekordbox/Mixxxでの認識は、インストール環境とバージョンで確認が必要です。
