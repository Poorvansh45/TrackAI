# SkillSync

An AI-powered career development platform that helps students and professionals achieve their career goals through personalized learning paths, AI mentorship, and smart analytics.

## 🚀 Features

- **AI-Powered Mentorship**: Get personalized guidance from AI mentors tailored to your career goals
- **Interactive Roadmaps**: Visual learning paths with progress tracking and milestone management
- **Smart Assessments**: AI-driven skill assessments to identify strengths and areas for improvement
- **Daily Missions**: Gamified daily tasks to keep you motivated and on track
- **Smart Notes**: AI-assisted note-taking and knowledge management
- **Analytics Dashboard**: Comprehensive progress tracking with detailed insights
- **Career Planning**: Intelligent career goal setting and achievement tracking

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Pydantic v2
- **CORS**: Configured for cross-origin requests

### Frontend
- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives with shadcn/ui
- **State Management**: React Hooks
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion
- **HTTP Client**: Axios

## 📁 Project Structure

```
tracks-ai-platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py       # Authentication endpoints
│   │   │   │   ├── profile.py    # User profile endpoints
│   │   │   │   └── router.py     # API router configuration
│   │   │   └── deps.py           # Dependencies (auth, etc.)
│   │   ├── core/
│   │   │   ├── config.py         # Application configuration
│   │   │   ├── database.py       # MongoDB connection
│   │   │   └── security.py       # JWT & password hashing
│   │   ├── models/
│   │   │   └── user.py           # User data model
│   │   ├── schemas/
│   │   │   ├── auth.py           # Auth request/response schemas
│   │   │   ├── profile.py        # Profile schemas
│   │   │   └── user.py           # User response schemas
│   │   ├── services/
│   │   │   └── ai/               # AI service modules
│   │   │       ├── roadmap.py
│   │   │       ├── recommendation.py
│   │   │       ├── mentor.py
│   │   │       └── assessment.py
│   │   └── main.py               # FastAPI application entry
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Environment variables
│   └── .env.example              # Environment template
└── client/
    ├── app/
    │   ├── dashboard/            # Dashboard pages
    │   ├── login/                # Login page
    │   ├── register/             # Registration page
    │   ├── onboarding/           # Onboarding flow
    │   ├── layout.tsx            # Root layout
    │   ├── page.tsx              # Landing page
    │   └── globals.css           # Global styles
    ├── components/
    │   ├── landing/              # Landing page components
    │   └── ui/                   # Reusable UI components
    ├── hooks/                    # Custom React hooks
    ├── lib/                      # Utility functions
    ├── package.json              # Node dependencies
    ├── tsconfig.json             # TypeScript config
    ├── tailwind.config.ts        # Tailwind configuration
    └── next.config.mjs           # Next.js configuration
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- MongoDB (local or cloud instance)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/skillsync
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
PROJECT_NAME=SkillSync
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

6. Run the development server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Configure environment variables (if needed):
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📚 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation powered by Swagger UI.

### Main Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/profile/me` - Get current user profile
- `PUT /api/v1/profile/career-goal` - Update career goal
- `GET /api/v1/health` - Health check endpoint

For detailed API documentation, see [API_CONTRACT.md](./API_CONTRACT.md)

## 🗄️ Database Schema

The application uses MongoDB with the following main collections:

- **users**: User accounts and profiles
- **assessments**: Skill assessment results
- **roadmaps**: Learning roadmaps and progress
- **notes**: User notes and knowledge base

For detailed schema information, see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. User registers/logs in and receives an access token
2. Token is included in the `Authorization` header as `Bearer <token>`
3. Protected routes validate the token before granting access
4. Tokens expire after 30 minutes (configurable)

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd client
npm test
```

## 📦 Building for Production

### Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd client
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@skillsync.com or open an issue in the repository.

## 🙏 Acknowledgments

- Built with FastAPI and Next.js
- UI components from Radix UI and shadcn/ui
- Icons from Lucide React
