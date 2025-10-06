import os, json, requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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

WSDL_URL = "https://api.five9.com/wsadmin/v12/AdminWebService?wsdl"

def require_env():
    if not FIVE9_CLIENT_ID or not FIVE9_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing Five9 credentials")

@app.get("/")
def root():
    return {"status": "Five9 Config Tool backend is live"}

# ========== LOGIN ==========
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

# ========== CLONE LOCATION CONFIG ==========
@app.post("/api/configure")
def configure(payload: dict):
    """
    Clone a template center (skills, agent groups, lists, campaigns) to a new location.
    Required JSON:
    {
      "username": "...",
      "password": "...",
      "location": "Chevy Chase",
      "timezone": "EST",
      "ghlLocationId": "...",
      "ghlPipelineId": "..."
    }
    """
    # Placeholder response - implement SOAP logic later
    return {
        "status": "success",
        "message": f"Configuration cloned for location {payload.get('location')}",
    }
