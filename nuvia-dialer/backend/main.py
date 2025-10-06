import os, json, asyncio, requests
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- Config ---
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
FIVE9_CLIENT_ID = os.getenv("FIVE9_CLIENT_ID")
FIVE9_CLIENT_SECRET = os.getenv("FIVE9_CLIENT_SECRET")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def require_env():
    if not FIVE9_CLIENT_ID or not FIVE9_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing Five9 credentials")

# --- Login ---
@app.post("/api/login")
def login(payload: dict):
    require_env()
    username = payload.get("username")
    password = payload.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    try:
        r = requests.post(
            "https://api.five9.com/oauth2/token",
            auth=(FIVE9_CLIENT_ID, FIVE9_CLIENT_SECRET),
            data={
                "grant_type": "password",
                "username": username,
                "password": password,
            },
            timeout=12,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError:
        raise HTTPException(status_code=401, detail="Five9 login failed")

# --- Agent State ---
@app.get("/api/agent/state")
def agent_state(token: str):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get("https://api.five9.com/agent/v2/agents/self/state", headers=headers)
    return r.json()

# --- Match Skill → Campaign ---
@app.get("/api/campaigns/for-skill")
def campaign_for_skill(token: str):
    headers = {"Authorization": f"Bearer {token}"}
    s = requests.get("https://api.five9.com/agent/v2/agents/self/skills", headers=headers)
    if not s.ok:
        raise HTTPException(status_code=s.status_code, detail="Failed to fetch skills")

    skills = s.json()
    blended = next(
        (sk["name"] for sk in skills if sk["name"].endswith("_Blended_Inbound_Outbound")),
        None,
    )
    if not blended:
        raise HTTPException(status_code=404, detail="No blended skill found")

    location = blended.replace("_Blended_Inbound_Outbound", "")
    c = requests.get("https://api.five9.com/agent/v2/campaigns", headers=headers)
    if not c.ok:
        raise HTTPException(status_code=c.status_code, detail="Failed to fetch campaigns")

    campaigns = c.json()
    match = [x for x in campaigns if x["name"] == f"{location}_Manual_Outbound"]
    return {"location": location, "campaigns": match}

# --- Start Outbound Call ---
@app.post("/api/call")
def start_call(payload: dict):
    token = payload.get("token")
    number = payload.get("number")
    campaign = payload.get("campaign")
    if not token or not number or not campaign:
        raise HTTPException(status_code=400, detail="Missing fields")

    headers = {"Authorization": f"Bearer {token}"}
    body = {"phoneNumber": number, "campaignName": campaign}
    r = requests.post("https://api.five9.com/agent/v2/calls", json=body, headers=headers)
    if not r.ok:
        raise HTTPException(status_code=r.status_code, detail=r.text[:300])
    return r.json()

# --- Simulated WebSocket Stream (replace later with Five9 live WS) ---
@app.websocket("/ws")
async def ws_stream(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.send_json({"event": "dialing", "type": "Inbound", "progress": 40})
            await asyncio.sleep(3)
            await ws.send_json({
                "event": "dialing",
                "type": "Outbound",
                "ghlStageName": "Outbound – New Leads",
                "progress": 60
            })
            await asyncio.sleep(3)
            await ws.send_json({
                "event": "connected",
                "type": "Outbound",
                "lead": {
                    "ghlLocationID": "p9XK3Y7WZ",
                    "ghlContactID": "8a08b0a4-ff2f-46f4-bb40-57bb06b9dfd1"
                }
            })
            await asyncio.sleep(5)
            await ws.send_json({"event": "idle"})
            await asyncio.sleep(5)
    except Exception:
        return
