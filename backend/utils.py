"""
Shared utility helpers used across multiple modules.
"""

import re
import json


def try_parse_json(text):
    """Parse JSON from an AI response, repairing truncated output if needed."""
    if not text:
        return None
    # Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Strip markdown fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`")
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # Repair truncated JSON
    repaired = cleaned.rstrip()
    # Remove trailing incomplete key:value like  ,"key": or ,"key":"partial
    repaired = re.sub(r""",?\s*"[^"]*"\s*:\s*"?[^"}\]]*$""", "", repaired)
    # Close unclosed brackets
    stack = []
    in_str = False
    esc = False
    for ch in repaired:
        if esc:
            esc = False
            continue
        if ch == "\\":
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]" and stack:
            stack.pop()
    repaired += "".join(reversed(stack))
    try:
        result = json.loads(repaired)
        print("[json_repair] Repaired truncated JSON")
        return result
    except Exception as e:
        print(f"[json_repair] Repair failed: {e}")
    return None


def cognitive_load_score(total_hrs: float) -> int:
    """Convert total study hours in a day to a 0-10 cognitive load score."""
    if total_hrs == 0:
        return 0
    if total_hrs <= 1:
        return 2
    if total_hrs <= 2:
        return 3
    if total_hrs <= 3:
        return 5
    if total_hrs <= 4:
        return 6
    if total_hrs <= 5:
        return 7
    if total_hrs <= 6:
        return 8
    return min(10, round(8 + (total_hrs - 6)))
