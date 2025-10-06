# 🧩 Five9 Config Tool

Web-based utility for duplicating and creating new Five9 configurations (skills, lists, campaigns, profiles) by location.

---

## 🚀 Features

- Secure Five9 OAuth2 authentication
- Create configurations by location and timezone
- Optional GoHighLevel IDs for integration
- Simple UI, hosted on Render

---

## ⚙️ Environment Variables

| Key | Description |
|-----|--------------|
| `FIVE9_CLIENT_ID` | Your Five9 API client ID |
| `FIVE9_CLIENT_SECRET` | Your Five9 API client secret |
| `ALLOWED_ORIGIN` | Frontend URL (e.g. https://five9-config-frontend.onrender.com) |

---

## 🔗 Deployment (Render)

1. Push this folder to GitHub (or your full suite repo).
2. On Render → **New Blueprint → Root Directory = `config-tool`**.
3. Add backend env vars above.
4. Deploy backend and frontend services.

---

## ✅ Test

After deployment, open:

https://five9-config-frontend.onrender.com

Fill out the form and click **Create Configuration**.

🧠 FILE: config-tool/DEVELOPER_GUIDE.md
# 🧠 Developer Guide – Five9 Config Tool

This guide explains how to run, modify, and deploy the Config Tool.

---

## 🧱 Architecture



Frontend (HTML/CSS/JS)
↓ HTTPS
Backend (FastAPI)
↓
Five9 Cloud APIs (OAuth2, SOAP)


---

## ⚙️ Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload


In another terminal:

cd ../frontend
python3 -m http.server 8080


Visit http://localhost:8080

🔧 Deployment on Render
Setting	Value
Root Directory	config-tool
Backend Build Command	pip install -r backend/requirements.txt
Backend Start Command	uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Frontend Publish Directory	frontend
Environment Variables	FIVE9_CLIENT_ID, FIVE9_CLIENT_SECRET, ALLOWED_ORIGIN
🧩 Endpoints
Route	Method	Description
/api/login	POST	Authenticate with Five9
/api/configure	POST	Clone configuration (placeholder for SOAP logic)
🧭 Next Steps

Replace placeholder /api/configure logic with live Five9 SOAP API calls.

Add task queue or async job handling for large setups.

Add authentication and user management (optional).


---

✅ Once these files are in place:
1. Commit and push to GitHub.
2. Create a new Render Blueprint → **Root Directory = `config-tool`**.
3. Add environment variables.
4. Deploy and test your backend and frontend.

---