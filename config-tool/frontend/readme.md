# Five9 Config Tool

Web-based utility for duplicating and creating new Five9 configurations (skills, lists, campaigns, profiles) by location.

## 🚀 Features
- Secure Five9 OAuth2 authentication
- Create configurations by location and timezone
- Optional GoHighLevel IDs for integration
- Simple UI, hosted on Render

## ⚙️ Environment Variables
| Key | Description |
|-----|--------------|
| FIVE9_CLIENT_ID | Your Five9 API client ID |
| FIVE9_CLIENT_SECRET | Your Five9 API client secret |
| ALLOWED_ORIGIN | Frontend URL (e.g. https://five9-config-frontend.onrender.com) |

## 🔗 Deploy on Render
1. Push to GitHub  
2. Create new Blueprint → Root Directory = `config-tool`  
3. Add backend env vars  
4. Deploy both backend & frontend

## ✅ Test
Go to:
