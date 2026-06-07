# Tracks AI Platform — Setup & Run Guide

## Project Overview

End-to-end adaptive learning platform:

```
User Onboarding
  → Skill Selection
  → Assessment Questions
  → Learning Preferences
  → Goal Selection
  → [API CALL] POST /api/v1/tracks/generate
      → Assessment Agent (Gemini)
      → Prerequisite Agent (Gemini)
      → Roadmap Agent (Gemini)
      → Timeline Planner Agent (Gemini)
  → Dashboard: Roadmap + Timeline display
```

---

## Prerequisites

| Tool       | Version  | Install                          |
|------------|----------|----------------------------------|
| Python     | 3.11+    | https://python.org               |
| Node.js    | 18+      | https://nodejs.org               |
| pnpm       | any      | `npm install -g pnpm`            |
| MongoDB    | Atlas ✅  | Already configured in `.env`     |

---

## Step 1 — Get a Valid Google Gemini API Key

The existing `GOOGLE_API_KEY` in `backend/.env` must be a valid **AI Studio** key.

1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API key"**
3. Copy the key — it starts with `AIza...`
4. Open `backend/.env` and replace:
   ```
   GOOGLE_API_KEY="AIzaSy.......your-real-key-here"
   ```

> ⚠️ The current key (`AQ.Ab8RN6...`) is a different format and will cause
> the Gemini LLM to fail. A real AI Studio key is required.

---

## Step 2 — Start the Backend

```bash
# Navigate to backend
cd tracks-ai-platform/backend

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Test the backend is working:**
```bash
curl http://127.0.0.1:8000/api/v1/health
# → {"status":"healthy","service":"SkillSync API","version":"v1"}
```

**View API docs:**
Open http://127.0.0.1:8000/docs in your browser.
The `POST /api/v1/tracks/generate` endpoint will be visible.

---

## Step 3 — Start the Frontend

```bash
# In a new terminal, navigate to client
cd tracks-ai-platform/client

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Frontend runs at: http://localhost:3000

---

## Step 4 — Test End-to-End

1. Open http://localhost:3000
2. Click **Get Started** or navigate to `/onboarding`
3. Complete all 5 steps:
   - Select a Skill (e.g. AI/ML)
   - Answer assessment questions
   - Set study hours and schedule
   - Select your goal
4. Click **"Generate Roadmap"**
5. The loading screen will show real AI progress (~30–60 seconds depending on Gemini speed)
6. After generation completes, click **"Enter Dashboard"**
7. Navigate to `/dashboard/roadmap` — AI-generated phases shown
8. Navigate to `/dashboard/timeline` — AI-generated weekly schedule shown

---

## API Quick Test (curl)

Test the Tracks AI endpoint directly without going through the frontend:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/tracks/generate \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "ai-ml",
    "assessment_answers": {
      "How comfortable are you with programming?": "Know basic programming concepts",
      "What is your Python experience?": "Know variables, loops and functions",
      "How comfortable are you with mathematics?": "Algebra and equations",
      "Have you worked with datasets before?": "Excel or Google Sheets",
      "Which best describes your ML knowledge?": "No ML knowledge"
    },
    "user_preferences": {
      "daily_hours": 2,
      "weekly_availability": 5,
      "learning_style": "Visual",
      "goal": "Internship"
    }
  }'
```

Expected response shape:
```json
{
  "success": true,
  "skill": "AI/ML Engineering",
  "assessment_result": { "current_level": "...", "strengths": [...], ... },
  "prerequisite_result": { "missing_prerequisites": [...], ... },
  "roadmap_result": { "roadmap_title": "...", "phases": [...], ... },
  "timeline_result": { "total_duration_weeks": 20, "weekly_schedule": [...], ... }
}
```

---

## Final Folder Structure

```
tracks-ai-platform/
├── backend/                         ← FastAPI app
│   ├── .env                         ← ⚠️ Set GOOGLE_API_KEY here
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  ← Entry point
│       ├── core/
│       │   ├── config.py            ← Settings (reads .env)
│       │   ├── database.py          ← MongoDB Atlas connection
│       │   └── security.py          ← JWT, bcrypt
│       ├── api/
│       │   ├── deps.py              ← Auth middleware
│       │   └── v1/
│       │       ├── router.py        ← Registers all routers
│       │       ├── auth.py          ← /auth/register, /auth/login
│       │       └── profile.py       ← /profile/me
│       └── tracks/                  ← Tracks AI module
│           ├── router.py            ← POST /tracks/generate
│           ├── graph/
│           │   ├── state.py         ← TracksAIState TypedDict
│           │   └── workflow.py      ← LangGraph pipeline
│           ├── agents/
│           │   ├── assessment.py
│           │   ├── prerequisite_agent.py
│           │   ├── roadmap_agent.py
│           │   └── timeline_agent.py
│           ├── schemas/
│           │   ├── assessment_schema.py
│           │   ├── prerequisite_schema.py
│           │   ├── roadmap_schema.py
│           │   └── timeline_schema.py
│           └── llm/
│               └── gemini.py        ← Shared LLM singleton
│
├── client/                          ← Next.js 16 frontend
│   ├── .env.local                   ← NEXT_PUBLIC_API_URL
│   ├── app/
│   │   ├── onboarding/page.tsx      ← 7-step onboarding flow
│   │   └── dashboard/
│   │       ├── roadmap/page.tsx     ← AI-generated roadmap view
│   │       └── timeline/page.tsx    ← AI-generated weekly schedule
│   ├── components/
│   │   └── onboarding/
│   │       ├── roadmap-generation.tsx  ← Calls API, stores to localStorage
│   │       └── dashboard-entry.tsx     ← Reads localStorage, shows recap
│   └── lib/
│       └── api.ts                   ← Axios client
│
└── TaskAI backend/                  ← Archive/reference only
    ├── notebook/                    ← Original Jupyter notebooks
    └── src/                         ← Original Python source (migrated)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GOOGLE_API_KEY is not set` | Add valid `AIza...` key to `backend/.env` |
| `Roadmap generation failed` | Check backend terminal for the full Gemini error |
| CORS error in browser | Ensure backend CORS includes `http://localhost:3000` |
| `No roadmap data available` | Complete full onboarding from `/onboarding` first |
| MongoDB connection error | Check `MONGODB_URL` in `backend/.env` |
| Port 8000 already in use | `kill -9 $(lsof -ti:8000)` or use `--port 8001` |

---

## Environment Variables Reference

### `backend/.env`
```
MONGODB_URL=<your-atlas-url>
GOOGLE_API_KEY=<your-gemini-key>        ← Must be AIza... format
JWT_SECRET_KEY=<change-in-production>
```

### `client/.env.local`
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```
