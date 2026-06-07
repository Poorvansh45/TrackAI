# API Contract - SkillSync

## Overview

This document defines the API contract for the SkillSync backend service. All endpoints follow RESTful conventions and return JSON responses. The API is versioned using URL path versioning (`/api/v1`).

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Expiration
- Access tokens expire after 30 minutes (configurable)
- Refresh tokens will be implemented in future versions

## Common Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "detail": "Detailed error information"
}
```

### HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## Endpoints

### Authentication Endpoints

#### Register User
Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

**Request Schema**:
- `name` (string, required): Full name of the user (min 2 characters)
- `email` (string, required): Valid email address
- `password` (string, required): Password (min 8 characters)

**Response** (201):
```json
{
  "success": true,
  "message": "Account created successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "603f7e5f9b1d8b2d1c8b4567",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "auth_provider": "local",
    "google_id": null,
    "role": "student",
    "created_at": "2026-06-04T11:00:00Z",
    "updated_at": "2026-06-04T11:00:00Z"
  }
}
```

**Error Responses**:
- `400`: Email already registered
- `422`: Validation error (invalid email, weak password)

#### Login User
Authenticate a user and receive an access token.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

**Request Schema**:
- `email` (string, required): User's email address
- `password` (string, required): User's password

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "603f7e5f9b1d8b2d1c8b4567",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "auth_provider": "local",
    "google_id": null,
    "role": "student",
    "created_at": "2026-06-04T11:00:00Z",
    "updated_at": "2026-06-04T11:00:00Z"
  }
}
```

**Error Responses**:
- `401`: Invalid email or password
- `422`: Validation error

### Profile Endpoints

#### Get Current User Profile
Retrieve the authenticated user's profile.

**Endpoint**: `GET /profile/me`

**Authentication**: Required (Bearer token)

**Response** (200):
```json
{
  "id": "603f7e5f9b1d8b2d1c8b4567",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "career_goal": "Full Stack Developer",
  "auth_provider": "local",
  "google_id": null,
  "role": "student",
  "created_at": "2026-06-04T11:00:00Z",
  "updated_at": "2026-06-04T11:00:00Z"
}
```

**Error Responses**:
- `401`: Invalid or missing token
- `404`: User not found

#### Update Career Goal
Update the user's career goal.

**Endpoint**: `PUT /profile/career-goal`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "career_goal": "Full Stack Developer"
}
```

**Request Schema**:
- `career_goal` (string, required): User's career goal (max 200 characters)

**Response** (200):
```json
{
  "success": true,
  "message": "Career goal updated successfully"
}
```

**Error Responses**:
- `401`: Invalid or missing token
- `422`: Validation error

### Health Check

#### Health Check
Check the API service health status.

**Endpoint**: `GET /health`

**Authentication**: Not required

**Response** (200):
```json
{
  "status": "healthy",
  "service": "SkillSync API",
  "version": "v1"
}
```

## Planned Endpoints

### Assessment Endpoints

#### Create Assessment
```http
POST /assessments
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "assessment_type": "technical",
  "career_goal": "Full Stack Developer"
}
```

#### Submit Assessment Answers
```http
POST /assessments/{assessment_id}/submit
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "answers": [
    {
      "question_id": "q1",
      "answer": "Intermediate"
    }
  ]
}
```

#### Get Assessment Results
```http
GET /assessments/{assessment_id}
Authorization: Bearer <token>
```

#### Get User Assessments
```http
GET /assessments
Authorization: Bearer <token>
```

Query Parameters:
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)
- `assessment_type`: Filter by type

### Roadmap Endpoints

#### Get Roadmap Templates
```http
GET /roadmaps/templates
```

Query Parameters:
- `category`: Filter by category
- `difficulty`: Filter by difficulty level

#### Create User Roadmap
```http
POST /roadmaps
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "template_id": "603f7e5f9b1d8b2d1c8b4567"
}
```

#### Get User Roadmap
```http
GET /roadmaps/{roadmap_id}
Authorization: Bearer <token>
```

#### Update Module Progress
```http
PUT /roadmaps/{roadmap_id}/modules/{module_id}/progress
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "progress": 75,
  "status": "in_progress"
}
```

#### Complete Skill
```http
PUT /roadmaps/{roadmap_id}/modules/{module_id}/skills/{skill_id}/complete
Authorization: Bearer <token>
```

### AI Mentor Endpoints

#### Start Conversation
```http
POST /ai/conversations
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "topic": "React getting started",
  "context": {
    "career_goal": "Full Stack Developer",
    "current_module": "Frontend Fundamentals"
  }
}
```

#### Send Message
```http
POST /ai/conversations/{conversation_id}/messages
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "content": "How do I get started with React?"
}
```

#### Get Conversation History
```http
GET /ai/conversations/{conversation_id}
Authorization: Bearer <token>
```

#### Rate Conversation
```http
POST /ai/conversations/{conversation_id}/rate
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "rating": 5
}
```

### Notes Endpoints

#### Create Note
```http
POST /notes
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "title": "React Hooks Overview",
  "content": "React Hooks are functions that let you use state...",
  "category": "frontend",
  "tags": ["react", "hooks"]
}
```

#### Get Notes
```http
GET /notes
Authorization: Bearer <token>
```

Query Parameters:
- `category`: Filter by category
- `tags`: Filter by tags (comma-separated)
- `search`: Full-text search
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

#### Get Note
```http
GET /notes/{note_id}
Authorization: Bearer <token>
```

#### Update Note
```http
PUT /notes/{note_id}
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "tags": ["react", "hooks", "updated"]
}
```

#### Delete Note
```http
DELETE /notes/{note_id}
Authorization: Bearer <token>
```

#### Generate AI Summary
```http
POST /notes/{note_id}/summarize
Authorization: Bearer <token>
```

### Daily Missions Endpoints

#### Get Today's Missions
```http
GET /missions/today
Authorization: Bearer <token>
```

#### Update Mission Status
```http
PUT /missions/{mission_id}/status
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "status": "completed"
}
```

#### Get Mission History
```http
GET /missions/history
Authorization: Bearer <token>
```

Query Parameters:
- `start_date`: Start date (ISO format)
- `end_date`: End date (ISO format)
- `limit`: Number of results (default: 30)

#### Get Streak Information
```http
GET /missions/streak
Authorization: Bearer <token>
```

### Analytics Endpoints

#### Get Dashboard Analytics
```http
GET /analytics/dashboard
Authorization: Bearer <token>
```

**Response**:
```json
{
  "overall_progress": 65,
  "completed_modules": 3,
  "total_modules": 5,
  "current_streak": 7,
  "total_points": 150,
  "skills_learned": 12,
  "time_spent": 45, // hours
  "assessments_completed": 2
}
```

#### Get Learning Progress
```http
GET /analytics/progress
Authorization: Bearer <token>
```

Query Parameters:
- `period`: "week" | "month" | "year" (default: "month")

#### Get Skill Analytics
```http
GET /analytics/skills
Authorization: Bearer <token>
```

#### Get Activity Timeline
```http
GET /analytics/timeline
Authorization: Bearer <token>
```

Query Parameters:
- `limit`: Number of events (default: 20)

## Error Handling

### Validation Errors (422)
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "Invalid email format",
      "type": "value_error.email"
    }
  ]
}
```

### Authentication Errors (401)
```json
{
  "detail": "Could not validate credentials"
}
```

### Not Found Errors (404)
```json
{
  "detail": "Resource not found"
}
```

### Server Errors (500)
```json
{
  "detail": "Internal server error",
  "error_id": "err_123456"
}
```

## Rate Limiting

Rate limiting will be implemented in future versions:
- Anonymous requests: 100 requests per hour
- Authenticated requests: 1000 requests per hour
- AI endpoints: 50 requests per hour

## Pagination

List endpoints support pagination using `limit` and `offset` query parameters:

```
GET /notes?limit=20&offset=0
```

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

## Filtering and Sorting

### Filtering
Use query parameters to filter results:
```
GET /notes?category=frontend&tags=react,hooks
```

### Sorting
Use `sort` and `order` parameters:
```
GET /notes?sort=created_at&order=desc
```

## Webhooks (Planned)

Webhook notifications for important events:
- Assessment completed
- Module completed
- Milestone achieved
- Streak milestone reached

**Webhook Payload Example**:
```json
{
  "event": "module.completed",
  "timestamp": "2026-06-05T10:00:00Z",
  "user_id": "603f7e5f9b1d8b2d1c8b4567",
  "data": {
    "module_id": "m1",
    "module_title": "Frontend Fundamentals"
  }
}
```

## SDK and Client Libraries

### Python SDK (Planned)
```python
from skillsync import SkillSyncClient

client = SkillSyncClient(api_key="your-api-key")
user = client.auth.login(email="...", password="...")
```

### JavaScript SDK (Planned)
```javascript
import { SkillSyncClient } from '@skillsync/sdk';

const client = new SkillSyncClient({ apiKey: 'your-api-key' });
const user = await client.auth.login({ email, password });
```

## API Versioning

The API uses URL path versioning. Current version: `v1`

### Version Deprecation
- Deprecated versions will be supported for 6 months
- Deprecation notices will be sent via email
- Breaking changes will increment the version number

## Testing

### Interactive Documentation
Visit `/docs` for interactive API documentation powered by Swagger UI.

### Example cURL Commands

#### Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securePassword123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "securePassword123"
  }'
```

#### Get Profile
```bash
curl -X GET http://localhost:8000/api/v1/profile/me \
  -H "Authorization: Bearer <your-token>"
```

## Support

For API support:
- Email: api-support@skillsync.com
- Documentation: https://docs.skillsync.com
- Status Page: https://status.skillsync.com

## Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication endpoints (register, login)
- Profile endpoints (get profile, update career goal)
- Health check endpoint

### Planned v1.1.0
- Assessment endpoints
- Roadmap endpoints
- AI mentor endpoints

### Planned v1.2.0
- Notes endpoints
- Daily missions endpoints
- Analytics endpoints
