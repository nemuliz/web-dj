from __future__ import annotations

import asyncio
import json
import secrets
from pathlib import Path

from aiohttp import web
import mido

ROOT = Path(__file__).resolve().parent
HOST = "0.0.0.0"
PORT = 8765
ACCESS_CODE = secrets.token_urlsafe(6)
midi_out = None
midi_out_name = None
midi_in = None
midi_in_name = None
feedback_clients = set()
feedback_task = None


def open_midi_output():
    global midi_out, midi_out_name
    if midi_out is not None:
        return midi_out
    try:
        names = mido.get_output_names()
    except Exception as exc:
        print(f"[MIDI] ポート一覧を取得できません: {exc}")
        return None
    if not names:
        print("[MIDI] MIDI出力ポートがありません。loopMIDIで 'WebDJ Bridge' を作成してください。")
        return None
    # Prefer the explicitly named loopMIDI port; otherwise accept a loopMIDI port.
    preferred = next((n for n in names if "webdj bridge" in n.lower()), None)
    if preferred is None:
        preferred = next((n for n in names if "loopmidi" in n.lower()), None)
    if preferred is None:
        print("[MIDI] 出力ポート候補がありません。loopMIDIで 'WebDJ Bridge' を作成してください。")
        print("[MIDI] 検出した出力: " + ", ".join(names))
        return None
    try:
        midi_out = mido.open_output(preferred)
        midi_out_name = preferred
        print(f"[MIDI] 出力接続: {preferred}")
        return midi_out
    except Exception as exc:
        print(f"[MIDI] {preferred} を開けません: {exc}")
        return None


def open_midi_input():
    global midi_in, midi_in_name
    if midi_in is not None:
        return midi_in
    try:
        names = mido.get_input_names()
    except Exception as exc:
        print(f"[MIDI] 入力ポート一覧を取得できません: {exc}")
        return None
    preferred = next((n for n in names if "webdj bridge" in n.lower()), None)
    if preferred is None:
        preferred = next((n for n in names if "loopmidi" in n.lower()), None)
    if preferred is None:
        print("[MIDI] Mixxx状態受信用の入力ポートが見つかりません。loopMIDIの 'WebDJ Bridge' を確認してください。")
        return None
    try:
        midi_in = mido.open_input(preferred)
        midi_in_name = preferred
        print(f"[MIDI] Mixxxフィードバック入力: {preferred}")
        return midi_in
    except Exception as exc:
        print(f"[MIDI] フィードバック入力 {preferred} を開けません: {exc}")
        return None


async def midi_feedback_loop():
    while True:
        try:
            if midi_in is not None:
                while True:
                    message = midi_in.receive(block=False)
                    if message is None:
                        break
                    if not message.is_meta and hasattr(message, "bytes"):
                        data = message.bytes()
                        for ws in tuple(feedback_clients):
                            if not ws.closed:
                                try:
                                    await ws.send_json({"type": "mixxx_state", "data": data})
                                except Exception:
                                    feedback_clients.discard(ws)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"[MIDI] フィードバック受信エラー: {exc}")
        await asyncio.sleep(0.01)


async def index(_request):
    return web.FileResponse(ROOT / "index.html")


async def static_file(request):
    relative = request.match_info.get("path", "")
    candidate = (ROOT / relative).resolve()
    if candidate != ROOT and ROOT not in candidate.parents:
        raise web.HTTPForbidden()
    if not candidate.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(candidate)


async def midi_socket(request):
    ws = web.WebSocketResponse(heartbeat=25, max_msg_size=4096)
    await ws.prepare(request)
    authenticated = False
    peer = request.remote or "unknown"
    print(f"[LAN] 接続: {peer}")

    try:
        async for message in ws:
            if message.type != web.WSMsgType.TEXT:
                continue
            try:
                payload = json.loads(message.data)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "JSON形式が正しくありません"})
                continue

            if not authenticated:
                if payload.get("type") == "auth" and secrets.compare_digest(str(payload.get("token", "")), ACCESS_CODE):
                    authenticated = True
                    await ws.send_json({"type": "authenticated", "message": "認証成功"})
                                    feedback_clients.add(ws)
                    print(f"[LAN] 認証成功: {peer}")
                else:
                    await ws.send_json({"type": "error", "message": "接続コードが違います"})
                    await ws.close(code=4001, message=b"authentication failed")
                continue

            if payload.get("type") != "midi":
                continue
            data = payload.get("data")
            if not isinstance(data, list) or len(data) != 3:
                continue
            try:
                status, data1, data2 = (int(v) for v in data)
            except (TypeError, ValueError):
                continue
            if not (0x80 <= status <= 0xEF and 0 <= data1 <= 127 and 0 <= data2 <= 127):
                continue

            output = open_midi_output()
            if output is None:
                await ws.send_json({"type": "error", "message": "MIDI出力なし。loopMIDIの 'WebDJ Bridge' ポートを作成してください"})
                continue
            try:
                output.send(mido.Message.from_bytes([status, data1, data2]))
            except Exception as exc:
                await ws.send_json({"type": "error", "message": f"MIDI送信エラー: {exc}"})
    finally:
        feedback_clients.discard(ws)
        print(f"[LAN] 切断: {peer}")
    return ws


async def on_startup(app):
    global feedback_task
    print("\nWebDJ LAN Bridge")
    print(f"ブラウザ: http://<このPCのLAN内IP>:{PORT}/")
    print(f"接続コード: {ACCESS_CODE}")
    print("WindowsファイアウォールでプライベートネットワークのTCP 8765を許可してください。")
    open_midi_output()
    open_midi_input()
    feedback_task = asyncio.create_task(midi_feedback_loop())


async def on_cleanup(_app):
    global midi_out, midi_out_name, midi_in, midi_in_name, feedback_task
    if feedback_task is not None:
        feedback_task.cancel()
        try:
            await feedback_task
        except asyncio.CancelledError:
            pass
        feedback_task = None
    if midi_out is not None:
        midi_out.close()
        midi_out = None
        midi_out_name = None
    if midi_in is not None:
        midi_in.close()
        midi_in = None
        midi_in_name = None


def _asyncio_exception_handler(loop, context):
    # Windows Proactor may report a harmless reset when a browser closes/reconnects.
    exc = context.get("exception")
    message = str(context.get("message", ""))
    if (
        isinstance(exc, ConnectionResetError)
        and getattr(exc, "winerror", None) == 10054
        and "_ProactorBasePipeTransport._call_connection_lost" in message
    ):
        return
    loop.default_exception_handler(context)


def main():
    app = web.Application()
    app.router.add_get("/midi", midi_socket)
    app.router.add_get("/", index)
    app.router.add_get("/{path:.*}", static_file)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.set_exception_handler(_asyncio_exception_handler)
    web.run_app(app, host=HOST, port=PORT, loop=loop)


if __name__ == "__main__":
    main()
