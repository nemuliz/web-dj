/* WebDJ Bridge Mixxx script.
 * FLX4-inspired jog/touch, mixer and pitch behavior for WebDJ's GENERIC MIDI.
 * This does not implement or impersonate the Pioneer DDJ-FLX4 protocol.
 */
var WebDJBridge = {};

WebDJBridge.deckNumber = function(group) {
    return group === "[Channel2]" ? 2 : 1;
};

WebDJBridge.jogTurn = function(_channel, _control, value, _status, group) {
    var deck = WebDJBridge.deckNumber(group);
    var delta = value - 64;
    if (!delta) return;
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, delta);
    } else {
        engine.setValue(group, "jog", delta * 0.8);
    }
};

WebDJBridge.jogTouch = function(_channel, _control, value, _status, group) {
    var deck = WebDJBridge.deckNumber(group);
    if (value > 0) {
        engine.scratchEnable(deck, 720, 33 + 1 / 3, 1 / 8, 1 / 256);
    } else {
        engine.scratchDisable(deck);
    }
};

WebDJBridge.pitchRate = function(_channel, _control, value, _status, group) {
    // WebDJ emits 0..127 from a UI pitch range of -8%..+8%; 64 is neutral.
    var rate = 1 + ((value - 64) / 63) * 0.08;
    engine.setValue(group, "rate", Math.max(0.92, Math.min(1.08, rate)));
};

WebDJBridge.pitchReset = function(_channel, _control, value, _status, group) {
    if (value > 0) engine.setValue(group, "rate", 1);
};

WebDJBridge.trim = function(_channel, _control, value, _status, group) {
    // UI trim is 0..1.5, encoded as 0..127.
    engine.setValue(group, "pregain", (value / 127) * 1.5);
};

WebDJBridge.masterGain = function(_channel, _control, value) {
    engine.setValue("[Master]", "gain", value / 127);
};

WebDJBridge.headMix = function(_channel, _control, value) {
    engine.setValue("[Master]", "headMix", value / 127);
};
