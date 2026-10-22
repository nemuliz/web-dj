/* WebDJ Bridge Mixxx controller script.
 * WebDJ sends centered relative jog CC: 64 = no movement, >64 forward, <64 backward.
 */
var WebDJBridge = {};

WebDJBridge.init = function(_id, _debugging) {};
WebDJBridge.shutdown = function() {
    // Prevent a stuck scratch state if the controller is disabled while touched.
    engine.scratchDisable(1);
    engine.scratchDisable(2);
};

WebDJBridge.deckNumber = function(group) {
    return group === "[Channel2]" ? 2 : 1;
};

WebDJBridge.jogTurn = function(_channel, _control, value, _status, group) {
    var deck = WebDJBridge.deckNumber(group);
    var delta = value - 64;
    if (delta === 0) return;

    // Scratch ticks are the intended API while the platter is touched.
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, delta);
    } else {
        // Mixxx's jog control accepts relative jog movement.
        engine.setValue(group, "jog", delta);
    }
};

WebDJBridge.jogTouch = function(_channel, _control, value, status, group) {
    var deck = WebDJBridge.deckNumber(group);
    // Note On value 0 and Note Off both mean released.
    var pressed = (status & 0xF0) === 0x90 && value > 0;
    if (pressed) {
        if (!engine.isScratching(deck)) {
            engine.scratchEnable(deck, 720, 33 + 1 / 3, 1 / 8, 1 / 256);
        }
    } else if (engine.isScratching(deck)) {
        engine.scratchDisable(deck);
    }
};

// Trigger CUE only on press; process release so momentary controls never stick.
WebDJBridge.cue = function(_channel, _control, value, status, group) {
    var pressed = (status & 0xF0) === 0x90 && value > 0;
    engine.setValue(group, "cue_default", pressed ? 1 : 0);
};

WebDJBridge.sync = function(_channel, _control, value, status, group) {
    var pressed = (status & 0xF0) === 0x90 && value > 0;
    if (pressed) engine.setValue(group, "beatsync", 1);
};

WebDJBridge.hotcue = function(_channel, _control, value, status, group, hotcueNumber) {
    var pressed = (status & 0xF0) === 0x90 && value > 0;
    var enabledControl = "hotcue_" + hotcueNumber + "_enabled";
    var activateControl = "hotcue_" + hotcueNumber + "_activate";
    var setControl = "hotcue_" + hotcueNumber + "_set";
    if (pressed) {
        if (engine.getValue(group, enabledControl) > 0) {
            engine.setValue(group, activateControl, 1);
        } else {
            engine.setValue(group, setControl, 1);
        }
    } else {
        engine.setValue(group, activateControl, 0);
    }
};

WebDJBridge.hotcue1 = function(ch, ctl, val, status, group) { WebDJBridge.hotcue(ch, ctl, val, status, group, 1); };
WebDJBridge.hotcue2 = function(ch, ctl, val, status, group) { WebDJBridge.hotcue(ch, ctl, val, status, group, 2); };
WebDJBridge.hotcue3 = function(ch, ctl, val, status, group) { WebDJBridge.hotcue(ch, ctl, val, status, group, 3); };
WebDJBridge.hotcue4 = function(ch, ctl, val, status, group) { WebDJBridge.hotcue(ch, ctl, val, status, group, 4); };

WebDJBridge.pitchRate = function(_channel, _control, value, _status, group) {
    var rate = 1 + ((value - 64) / 63) * 0.08;
    engine.setValue(group, "rate", Math.max(0.92, Math.min(1.08, rate)));
};

WebDJBridge.pitchReset = function(_channel, _control, value, _status, group) {
    if (value > 0) engine.setValue(group, "rate", 1);
};

WebDJBridge.trim = function(_channel, _control, value, _status, group) {
    engine.setValue(group, "pregain", (value / 127) * 1.5);
};

WebDJBridge.masterGain = function(_channel, _control, value) {
    engine.setValue("[Master]", "gain", value / 127);
};

WebDJBridge.headMix = function(_channel, _control, value) {
    engine.setValue("[Master]", "headMix", value / 127);
};
