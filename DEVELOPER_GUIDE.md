
# 🦷 NUVIA FIVE9 SUITE

This repository contains two complete web applications built for **Nuvia Dental Implant Center’s Five9 operations**:

1. 🧩 **Five9 Config Tool** – automation for creating, cloning, and configuring new Five9 locations (skills, campaigns, profiles, etc.)
2. 🎧 **Nuvia Dialer** – a live, branded Five9 agent dialer integrated with GoHighLevel CRM.

Both projects are self-contained and deployable to **Render** with their own backend and frontend services.

---

## 📁 Repository Structure

```

five9-suite/
├── config-tool/
│   ├── backend/            # FastAPI backend (Five9 automation)
│   ├── frontend/           # Static web interface
│   ├── render.yaml         # Render blueprint for this app
│   ├── README.md
│   └── DEVELOPER_GUIDE.md
│
└── nuvia-dialer/
├── backend/            # FastAPI backend (agent dialer API)
├── frontend/           # Static web interface (HTML/CSS/JS)
├── render.yaml         # Render blueprint for this app
├── README.md
└── DEVELOPER_GUIDE.md

````

---

## 🚀 Purpose

These applications modernize and streamline Nuvia’s Five9 infrastructure by providing:

| App | Primary Function |
|-----|------------------|
| **Config Tool** | Automates the setup and duplication of Five9 configurations for new centers, with optional GoHighLevel linkage. |
| **Nuvia Dialer** | Provides a polished, Nuvia-branded web dialer for Five9 agents with inbound/outbound blending, animations, and live GoHighLevel contact popups. |

---

## ⚙️ Deployment Overview

Each subfolder contains its own `render.yaml` file that defines its Render deployment pipeline.

| App | Root Directory on Render | Deploys | Example URLs |
|-----|---------------------------|----------|---------------|
| Config Tool | `config-tool` | Backend + Frontend | `https://five9-config-backend.onrender.com`, `https://five9-config-frontend.onrender.com` |
| Nuvia Dialer | `nuvia-dialer` | Backend + Frontend | `https://nuvia-dialer-backend.onrender.com`, `https://nuvia-dialer-frontend.onrender.com` |

---

## 🧠 Getting Started Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/JasonMcBeth/five9-suite.git
   cd five9-suite
````

2. Choose an app to work on:

   ```bash
   cd config-tool   # or cd nuvia-dialer
   ```

3. Follow the instructions in that app’s README.md.

---

## 🧰 Requirements

* Python 3.10+
* Node.js optional (only for UI testing, not required)
* Render account (free tier is sufficient)
* Valid Five9 API credentials (OAuth2)
* GoHighLevel access for CRM integration

---

## 🧩 Related Docs

| Document                                             | Purpose                                    |
| ---------------------------------------------------- | ------------------------------------------ |
| [`config-tool/README.md`](./config-tool/README.md)   | Config Tool overview and usage             |
| [`nuvia-dialer/README.md`](./nuvia-dialer/README.md) | Nuvia Dialer overview and usage            |
| [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md)         | Developer setup and contribution standards |

---

## 📄 License

Internal, proprietary code owned by **Nuvia Dental Implant Center**.
Do not distribute or publish externally.

````

---

# 🧑‍💻  Root `DEVELOPER_GUIDE.md`

```markdown
# 🧑‍💻 Developer Guide — Nuvia Five9 Suite

This document describes the shared developer workflow and conventions for all projects in this repository.

---

## 🧱 Architecture Overview

````

Five9 Cloud ←→ Backend (FastAPI) ←→ Frontend (Render Static Site)
↓
GoHighLevel CRM Integration

````

Both apps (Config Tool & Nuvia Dialer) follow this same pattern:
- **Backend** → FastAPI, handles authentication and Five9 API calls.
- **Frontend** → Static HTML/CSS/JS, communicates via HTTPS + WebSocket.
- **Render Deployment** → Each app has its own `render.yaml`.

---

## ⚙️ Local Development Setup

### Prerequisites
- Python 3.10+
- Render account
- GitHub access to this repo
- Five9 API credentials (OAuth2 client ID + secret)

### Common Steps
1. Clone the repo:
   ```bash
   git clone https://github.com/JasonMcBeth/five9-suite.git
   cd five9-suite
````

2. Select the app you want to work on:

   ```bash
   cd config-tool
   # or
   cd nuvia-dialer
   ```

3. Install backend dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

4. Run the frontend locally:

   ```bash
   cd ../frontend
   python3 -m http.server 8080
   ```

5. Open [http://localhost:8080](http://localhost:8080) in a browser.

---

## 🧩 Shared Environment Variables

| Key                         | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| `FIVE9_CLIENT_ID`           | Five9 OAuth2 client ID                                        |
| `FIVE9_CLIENT_SECRET`       | Five9 OAuth2 client secret                                    |
| `ALLOWED_ORIGIN`            | The frontend URL allowed to connect to the backend            |
| `GHL_BASE_URL` *(optional)* | GoHighLevel base URL (default: `https://app.gohighlevel.com`) |

> Each app on Render maintains its own set of environment variables—no overlap between Config Tool and Dialer.

---

## 🧠 Development Standards

| Area          | Convention                                                         |
| ------------- | ------------------------------------------------------------------ |
| Code style    | PEP8 for Python, Prettier-style for JS                             |
| Branch naming | `feature/xxx`, `bugfix/xxx`, `hotfix/xxx`                          |
| Commits       | Descriptive messages (imperative mood)                             |
| Pull requests | Reference issue or feature name                                    |
| Secrets       | Never commit credentials — always use Render environment variables |

---

## 🔄 Deployment Workflow

1. Push commits to `main` or a feature branch.
2. Verify GitHub Actions (if configured) run clean.
3. On Render, each service auto-redeploys on commit.
4. If needed, trigger manual deploy from Render dashboard.

---

## ⚙️ Updating an Existing App

### Add a new backend route

1. Modify `backend/main.py`.
2. Test locally with `uvicorn`.
3. Commit and push → Render rebuilds automatically.

### Change frontend logic or styling

1. Edit files under `frontend/`.
2. Push changes → Render redeploys static site automatically.

---

## 🧰 Troubleshooting

| Symptom                   | Likely Cause                              | Fix                                         |
| ------------------------- | ----------------------------------------- | ------------------------------------------- |
| CORS error                | Wrong `ALLOWED_ORIGIN`                    | Update env var in backend settings          |
| “No module named fastapi” | Wrong Root Directory                      | Set correct subfolder in Render             |
| Login fails               | Invalid Five9 credentials                 | Verify client ID, secret, username/password |
| GHL contact not opening   | Missing `ghlLocationID` or `ghlContactID` | Ensure data exists in event payload         |

---

## 🧱 Repository Maintenance

| Task                               | Command                                                |
| ---------------------------------- | ------------------------------------------------------ |
| Replace all files with new version | `git rm -rf . && git add . && git commit -m "refresh"` |
| Verify structure                   | `tree -L 2`                                            |
| Check Render logs                  | Render Dashboard → Backend → Logs                      |

---

## 🧩 Extending the Suite

| Idea                           | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| **Reporting Dashboard**        | Add `/reports` endpoints and UI to show campaign metrics       |
| **Multi-tenant Control Panel** | Combine both tools into one admin console                      |
| **Five9 → GHL Sync Tool**      | Sync contacts and dispositions between platforms automatically |

---

## 🧾 Versioning

* Each subproject can have its own version tags (`config-tool-v1.1.0`, `dialer-v1.0.2`, etc.).
* Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

---

## 👥 Team

Maintained by **Nuvia Dental Implant Center Technology Team**
