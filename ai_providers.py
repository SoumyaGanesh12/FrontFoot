"""
AI provider abstractions: Gemini (primary) and Groq (fallback).
Call `ai_call` from other modules — it handles provider selection automatically.
"""

import requests as http_req
from config import GEMINI_KEY, GROQ_KEY


def gemini_call(
    system_prompt,
    user_prompt,
    model="gemini-2.5-flash-lite",
    max_tokens=2000,
    json_mode=False,
):
    if not GEMINI_KEY:
        return None
    models = [model]
    if model != "gemini-2.5-flash-lite":
        models.append("gemini-2.5-flash-lite")
    if model != "gemini-2.5-flash":
        models.append("gemini-2.5-flash")
    for m in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={GEMINI_KEY}"
            gen_config = dict(temperature=0.4, maxOutputTokens=max_tokens)
            if json_mode:
                gen_config["responseMimeType"] = "application/json"
            r = http_req.post(
                url,
                json=dict(
                    contents=[dict(role="user", parts=[dict(text=user_prompt)])],
                    systemInstruction=dict(parts=[dict(text=system_prompt)]),
                    generationConfig=gen_config,
                ),
                timeout=45,
            )
            if r.status_code == 200:
                res = r.json()
                candidates = res.get("candidates", [])
                if candidates:
                    txt = "".join(
                        p.get("text", "")
                        for p in candidates[0].get("content", {}).get("parts", [])
                    )
                    print(f"[gemini] {m} ({len(txt)} chars)")
                    return txt
            if r.status_code == 429:
                print(f"[gemini] {m} rate limited")
                continue
            print(f"[gemini] {m} returned {r.status_code}")
        except Exception as e:
            print(f"[gemini] {m} error: {e}")
            continue
    return None


def groq_call(system_prompt, user_prompt, max_tokens=2000, json_mode=False):
    if not GROQ_KEY:
        print("[groq] No API key set")
        return None
    try:
        body = dict(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        print("[groq] Calling llama-3.3-70b...")
        r = http_req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=60,
        )
        if r.status_code == 200:
            txt = r.json()["choices"][0]["message"]["content"]
            print(f"[groq] ({len(txt)} chars)")
            return txt
        print(f"[groq] Error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[groq] Failed: {e}")
    return None


def ai_call(
    system_prompt,
    user_prompt,
    model="gemini-2.5-flash-lite",
    max_tokens=2000,
    json_mode=False,
):
    """Call Gemini; fall back to Groq if Gemini is unavailable."""
    result = gemini_call(system_prompt, user_prompt, model, max_tokens, json_mode)
    if result:
        return result
    print("[ai] Gemini unavailable, trying Groq...")
    result = groq_call(system_prompt, user_prompt, max_tokens, json_mode)
    if result:
        return result
    return None
