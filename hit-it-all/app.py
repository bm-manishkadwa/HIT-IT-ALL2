from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any, Dict

CONFIG_NAME = "HIT_IT_ALL_SETTINGS"

DEFAULT_CONFIG: Dict[str, Any] = {
    "gameplay": {"targetScore": None, "targetScoreMin": 10, "targetScoreMax": 40, "timerDuration": 60, "maxWickets": 1, "nextBallDelay": 3000, "ballTypes": ["FULL_TOSS", "BOUNCER", "YORKER", "GOOD_LENGTH", "SLOWER", "SWING"], "wicketHitChance": 45, "handPointerDuration": 3000, "handSwipeDistancePortrait": 190, "handSwipeDistanceLandscape": 260},
    "scoring": {"powerRun": 6, "normalRun": 4, "defenceRun": 1, "perfectTimingWindow": 0.075, "goodTimingWindow": 0.15, "okayTimingWindow": 0.24},
    "delivery": {"speeds": {"FULL_TOSS": 720, "BOUNCER": 680, "YORKER": 620, "GOOD_LENGTH": 760, "SLOWER": 980, "SWING": 820}, "idealHitTimes": {"FULL_TOSS": 0.72, "BOUNCER": 0.86, "YORKER": 0.90, "GOOD_LENGTH": 0.82, "SLOWER": 0.84, "SWING": 0.83}},
    "players": {"batsman": {"portrait": {"width": 260, "height": 390}, "landscape": {"width": 230, "height": 340}}, "bowler": {"portrait": {"width": 240, "height": 360}, "landscape": {"width": 230, "height": 340}}, "bowlerHand": "LEFT"},
    "countdown": {"enabled": True, "steps": ["3", "2", "1", "GO!"], "firstDelay": 300, "stepDuration": 700, "goHold": 400},
    "audio": {"enabled": True, "crowd": True, "ballHit": True, "wicket": True, "win": True, "lose": True, "crowdVolume": 0.28, "sfxVolume": 0.9, "resultVolume": 1},
    "effects": {"cameraShake": True, "impactFlash": True, "showShotFeedback": True, "endButtonPulse": True},
    "startScene": {"tapToStart": True},
    "endScene": {"restartOnDownloadButton": True, "buttonPulseDuration": 1100, "buttonPulseAlpha": 0.82},
}

COMMAND_MAP = {
    "target_score": ("gameplay", "targetScore"),
    "target_score_min": ("gameplay", "targetScoreMin"),
    "target_score_max": ("gameplay", "targetScoreMax"),
    "timer_duration": ("gameplay", "timerDuration"),
    "max_wickets": ("gameplay", "maxWickets"),
    "next_ball_delay": ("gameplay", "nextBallDelay"),
    "ball_types": ("gameplay", "ballTypes"),
    "wicket_hit_chance": ("gameplay", "wicketHitChance"),
    "hand_pointer_duration": ("gameplay", "handPointerDuration"),
    "power_run": ("scoring", "powerRun"),
    "normal_run": ("scoring", "normalRun"),
    "defence_run": ("scoring", "defenceRun"),
    "perfect_timing_window": ("scoring", "perfectTimingWindow"),
    "good_timing_window": ("scoring", "goodTimingWindow"),
    "okay_timing_window": ("scoring", "okayTimingWindow"),
    "countdown_enabled": ("countdown", "enabled"),
    "countdown_steps": ("countdown", "steps"),
    "audio_enabled": ("audio", "enabled"),
    "crowd_audio": ("audio", "crowd"),
    "crowd_volume": ("audio", "crowdVolume"),
    "sfx_volume": ("audio", "sfxVolume"),
    "camera_shake": ("effects", "cameraShake"),
    "show_shot_feedback": ("effects", "showShotFeedback"),
    "tap_to_start": ("startScene", "tapToStart"),
    "end_button_pulse": ("effects", "endButtonPulse"),
}

def _deep_merge(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    result = deepcopy(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result

def normalize_change(change: Dict[str, Any]) -> Dict[str, Any]:
    patch: Dict[str, Any] = {}
    for incoming_key, value in change.items():
        if incoming_key in COMMAND_MAP:
            section, key = COMMAND_MAP[incoming_key]
            patch.setdefault(section, {})[key] = value
        elif incoming_key in DEFAULT_CONFIG:
            patch[incoming_key] = value
    return patch

def js_object_to_jsonish(js: str) -> str:
    js = re.sub(r"//.*", "", js)
    js = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
    js = re.sub(r"([,{]\s*)([A-Za-z_$][\w$]*)(\s*:)", r'\1"\2"\3', js)
    js = js.replace("'", '"')
    js = re.sub(r",\s*([}\]])", r"\1", js)
    return js

def extract_config(index_html: str) -> Dict[str, Any]:
    pattern = re.compile(rf"window\.{CONFIG_NAME}\s*=\s*(\{{.*?\}});", re.S)
    match = pattern.search(index_html)
    if not match:
        return deepcopy(DEFAULT_CONFIG)
    try:
        return _deep_merge(DEFAULT_CONFIG, json.loads(js_object_to_jsonish(match.group(1))))
    except Exception:
        return deepcopy(DEFAULT_CONFIG)

def format_js(value: Any) -> str:
    text = json.dumps(value, indent=4)
    for token in ["FULL_TOSS", "BOUNCER", "YORKER", "GOOD_LENGTH", "SLOWER", "SWING", "LEFT", "RIGHT", "GO!"]:
        text = text.replace(f'"{token}"', f"'{token}'")
    text = re.sub(r'"(\d+)"', r"'\1'", text)
    return text

def patch_index_html(index_html: str, user_change: Dict[str, Any]) -> str:
    config = _deep_merge(extract_config(index_html), normalize_change(user_change))
    replacement = f"window.{CONFIG_NAME} = {format_js(config)};"
    pattern = re.compile(rf"window\.{CONFIG_NAME}\s*=\s*\{{.*?\}};", re.S)
    if pattern.search(index_html):
        return pattern.sub(replacement, index_html, count=1)
    return index_html.replace("const baseGameSize = getBaseGameSize();", replacement + "\n\n        const baseGameSize = getBaseGameSize();")

# Example:
# updated_index = patch_index_html(index_html, {"target_score": 60, "max_wickets": 5, "timer_duration": 90})
