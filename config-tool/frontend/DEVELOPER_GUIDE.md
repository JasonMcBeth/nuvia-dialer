# Developer Guide – Five9 Config Tool

## Overview
This app securely manages Five9 environment cloning operations for Nuvia’s call centers.

### Backend
- Framework: **FastAPI**
- File: `backend/main.py`
- Port: `$PORT` (Render-managed)
- Dependencies: `fastapi`, `uvicorn`, `requests`

### Frontend
- Static HTML/CSS/JS
- Deploys from `/frontend`

### Endpoints
| Endpoint | Method | Purpose |
|-----------|--------|----------|
| `/api/login` | POST | Authenticate Five9 admin credentials |
| `/api/configure` | POST | Clone configuration for new location |

### Local Development
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
