# Database Schema - SkillSync

## Overview

SkillSync uses MongoDB as its primary database, leveraging the flexibility of document-based storage to accommodate evolving data models and AI-powered features. This document outlines the current database schema and relationships.

## Database Connection

- **Database Name**: `skillsync`
- **Connection String**: Configured via `MONGODB_URI` environment variable
- **Driver**: Motor (async MongoDB driver for Python)

## Collections

### 1. users

Stores user account information and profile data.

```javascript
{
  "_id": ObjectId("..."),
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "$2b$12$...", // bcrypt hash
  "auth_provider": "local", // "local" | "google"
  "google_id": "123456789", // optional, for Google OAuth
  "role": "student", // "student" | "admin" | "mentor"
  
  // SkillSync-specific fields
  "career_goal": "Full Stack Developer", // optional
  "assessment_completed": false,
  "profile_completion": 0, // 0-100 percentage
  "last_active_at": ISODate("2026-06-05T00:00:00Z"),
  
  // Timestamps
  "created_at": ISODate("2026-06-04T11:00:00Z"),
  "updated_at": ISODate("2026-06-04T11:00:00Z")
}
```

**Indexes**:
- Unique index on `email`
- Index on `google_id` (sparse)
- Index on `auth_provider`

**Pydantic Model**: `app/models/user.py`

### 2. assessments (Planned)

Stores skill assessment results and evaluations.

```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."), // reference to users
  "assessment_type": "technical", // "technical" | "behavioral" | "comprehensive"
  
  // Assessment content
  "questions": [
    {
      "question_id": "q1",
      "question_text": "What is your experience with React?",
      "question_type": "multiple_choice",
      "options": ["Beginner", "Intermediate", "Advanced", "Expert"],
      "user_answer": "Intermediate",
      "correct_answer": "Intermediate",
      "is_correct": true,
      "time_taken": 30 // seconds
    }
  ],
  
  // Results
  "score": 85, // 0-100
  "total_questions": 20,
  "correct_answers": 17,
  "time_taken": 600, // total seconds
  
  // AI Analysis
  "skill_levels": {
    "react": "intermediate",
    "javascript": "advanced",
    "python": "beginner"
  },
  "strengths": ["javascript", "problem_solving"],
  "weaknesses": ["python", "algorithms"],
  "recommendations": [
    "Focus on Python fundamentals",
    "Practice algorithm problems"
  ],
  
  // Timestamps
  "created_at": ISODate("2026-06-05T00:00:00Z"),
  "updated_at": ISODate("2026-06-05T00:00:00Z")
}
```

**Indexes**:
- Index on `user_id`
- Index on `assessment_type`
- Compound index on `user_id` + `created_at`

### 3. roadmaps (Planned)

Stores learning roadmaps and user progress.

```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."), // reference to users
  "career_goal": "Full Stack Developer",
  "roadmap_template_id": ObjectId("..."), // reference to roadmap_templates
  
  // Roadmap structure
  "modules": [
    {
      "module_id": "m1",
      "title": "Frontend Fundamentals",
      "description": "Learn HTML, CSS, and JavaScript basics",
      "order": 1,
      "estimated_hours": 40,
      "status": "in_progress", // "not_started" | "in_progress" | "completed"
      "progress": 60, // 0-100 percentage
      
      "skills": [
        {
          "skill_id": "s1",
          "name": "HTML",
          "level": "beginner",
          "status": "completed",
          "completed_at": ISODate("2026-06-04T00:00:00Z")
        },
        {
          "skill_id": "s2",
          "name": "CSS",
          "level": "beginner",
          "status": "in_progress",
          "progress": 50
        }
      ],
      
      "resources": [
        {
          "type": "course",
          "title": "HTML & CSS Crash Course",
          "url": "https://example.com/course",
          "duration": "10 hours",
          "completed": false
        }
      ]
    }
  ],
  
  // Progress tracking
  "overall_progress": 35, // 0-100 percentage
  "completed_modules": 1,
  "total_modules": 5,
  "estimated_completion_date": ISODate("2026-09-01T00:00:00Z"),
  "actual_completion_date": null,
  
  // Timestamps
  "created_at": ISODate("2026-06-04T00:00:00Z"),
  "updated_at": ISODate("2026-06-05T00:00:00Z")
}
```

**Indexes**:
- Index on `user_id`
- Index on `roadmap_template_id`
- Compound index on `user_id` + `status`

### 4. roadmap_templates (Planned)

Stores predefined roadmap templates for different career paths.

```javascript
{
  "_id": ObjectId("..."),
  "name": "Full Stack Developer",
  "description": "Comprehensive path to becoming a full stack developer",
  "category": "software_development",
  "difficulty": "intermediate",
  "estimated_duration": 6, // months
  
  // Template structure
  "modules": [
    {
      "title": "Frontend Fundamentals",
      "description": "Learn HTML, CSS, and JavaScript basics",
      "order": 1,
      "estimated_hours": 40,
      "skills": ["HTML", "CSS", "JavaScript"],
      "prerequisites": []
    },
    {
      "title": "React Development",
      "description": "Build modern web applications with React",
      "order": 2,
      "estimated_hours": 60,
      "skills": ["React", "TypeScript", "State Management"],
      "prerequisites": ["Frontend Fundamentals"]
    }
  ],
  
  // Metadata
  "created_by": "system", // or user_id for custom templates
  "is_active": true,
  "popularity_score": 95,
  
  // Timestamps
  "created_at": ISODate("2026-06-01T00:00:00Z"),
  "updated_at": ISODate("2026-06-01T00:00:00Z")
}
```

**Indexes**:
- Index on `category`
- Index on `difficulty`
- Index on `is_active`

### 5. notes (Planned)

Stores user notes and knowledge base entries.

```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."), // reference to users
  "title": "React Hooks Overview",
  "content": "React Hooks are functions that let you use state and other React features...",
  
  // AI-enhanced features
  "summary": "Brief overview of React Hooks including useState, useEffect, and custom hooks",
  "tags": ["react", "hooks", "frontend"],
  "keywords": ["useState", "useEffect", "custom hooks"],
  
  // Organization
  "category": "frontend",
  "module_id": ObjectId("..."), // optional, link to roadmap module
  "skill_id": ObjectId("..."), // optional, link to specific skill
  
  // Relationships
  "related_notes": [ObjectId("..."), ObjectId("...")],
  "parent_note_id": ObjectId("..."), // for hierarchical notes
  
  // Metadata
  "is_public": false,
  "view_count": 15,
  "ai_generated": false,
  
  // Timestamps
  "created_at": ISODate("2026-06-05T00:00:00Z"),
  "updated_at": ISODate("2026-06-05T00:00:00Z")
}
```

**Indexes**:
- Index on `user_id`
- Index on `tags`
- Text index on `content` for full-text search
- Compound index on `user_id` + `category`

### 6. daily_missions (Planned)

Stores daily learning missions and user completion status.

```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."), // reference to users
  "date": ISODate("2026-06-05T00:00:00Z"),
  
  // Mission details
  "missions": [
    {
      "mission_id": "m1",
      "title": "Complete 1 React tutorial",
      "description": "Finish at least one React tutorial from your roadmap",
      "type": "learning", // "learning" | "practice" | "review"
      "difficulty": "easy",
      "points": 10,
      "estimated_time": 30, // minutes
      "status": "completed", // "not_started" | "in_progress" | "completed"
      "completed_at": ISODate("2026-06-05T10:00:00Z")
    },
    {
      "mission_id": "m2",
      "title": "Practice 5 coding problems",
      "description": "Solve 5 algorithm problems on LeetCode",
      "type": "practice",
      "difficulty": "medium",
      "points": 20,
      "estimated_time": 60,
      "status": "in_progress",
      "progress": 3 // completed 3 out of 5
    }
  ],
  
  // Daily summary
  "total_points": 10,
  "completed_missions": 1,
  "total_missions": 3,
  "streak": 5, // consecutive days completed
  
  // Timestamps
  "created_at": ISODate("2026-06-05T00:00:00Z"),
  "updated_at": ISODate("2026-06-05T10:00:00Z")
}
```

**Indexes**:
- Unique compound index on `user_id` + `date`
- Index on `date`

### 7. ai_conversations (Planned)

Stores AI mentor conversation history.

```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."), // reference to users
  "session_id": "session_123",
  
  // Conversation
  "messages": [
    {
      "role": "user",
      "content": "How do I get started with React?",
      "timestamp": ISODate("2026-06-05T10:00:00Z")
    },
    {
      "role": "assistant",
      "content": "To get started with React, I recommend...",
      "timestamp": ISODate("2026-06-05T10:00:05Z")
    }
  ],
  
  // Context
  "context": {
    "career_goal": "Full Stack Developer",
    "current_skill_level": "beginner",
    "roadmap_module": "Frontend Fundamentals"
  },
  
  // Metadata
  "topic": "react getting started",
  "is_resolved": true,
  "rating": 5, // user rating 1-5
  
  // Timestamps
  "created_at": ISODate("2026-06-05T10:00:00Z"),
  "updated_at": ISODate("2026-06-05T10:05:00Z")
}
```

**Indexes**:
- Index on `user_id`
- Index on `session_id`
- Compound index on `user_id` + `created_at`

## Database Relationships

### User-Centric Relationships
- `users` → `assessments` (one-to-many)
- `users` → `roadmaps` (one-to-many)
- `users` → `notes` (one-to-many)
- `users` → `daily_missions` (one-to-many)
- `users` → `ai_conversations` (one-to-many)

### Roadmap Relationships
- `roadmap_templates` → `roadmaps` (one-to-many)
- `roadmaps` → `notes` (one-to-many, optional)

### Note Relationships
- `notes` → `notes` (self-referential for hierarchy)
- `notes` → `roadmaps.modules` (many-to-one, optional)

## Data Integrity Rules

### User Collection
- `email` must be unique
- `password` must be bcrypt hashed
- `role` must be one of: "student", "admin", "mentor"
- `auth_provider` must be one of: "local", "google"

### Assessment Collection
- `score` must be between 0 and 100
- `user_id` must reference a valid user
- All questions must have valid answers

### Roadmap Collection
- `overall_progress` must be between 0 and 100
- Module order must be sequential
- Prerequisites must reference earlier modules

### Notes Collection
- `user_id` must reference a valid user
- Parent notes must belong to the same user

## Migration Strategy

### Current State
- Only `users` collection is implemented
- Basic authentication and profile management

### Planned Migrations
1. **Phase 1**: Implement `assessments` collection
2. **Phase 2**: Implement `roadmap_templates` and `roadmaps` collections
3. **Phase 3**: Implement `notes` collection
4. **Phase 4**: Implement `daily_missions` collection
5. **Phase 5**: Implement `ai_conversations` collection

### Rollback Strategy
- Each migration will include a rollback script
- Data will be backed up before major schema changes
- Version tracking in separate `migrations` collection

## Performance Considerations

### Indexing Strategy
- All foreign keys indexed
- Frequently queried fields indexed
- Compound indexes for common query patterns
- Text indexes for search functionality

### Sharding Strategy (Future)
- Shard by `user_id` for user-centric collections
- Consider time-based sharding for high-volume collections
- Use MongoDB Atlas auto-sharding when needed

### Caching Strategy
- Cache frequently accessed user profiles
- Cache roadmap templates
- Implement Redis for session management

## Security Considerations

### Data Protection
- Passwords always bcrypt hashed
- Sensitive data encrypted at rest
- PII access logged and audited

### Access Control
- Role-based access control (RBAC)
- User data isolation
- Admin-only access to sensitive operations

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Cross-region backup replication

## Monitoring and Maintenance

### Health Checks
- Monitor connection pool status
- Track query performance
- Monitor index usage and efficiency

### Maintenance Tasks
- Regular index optimization
- Archive old conversation data
- Clean up expired sessions
- Update statistics for query optimization

## Conclusion

This schema provides a flexible foundation for SkillSync's core features while allowing for future expansion. The document-based approach of MongoDB enables rapid iteration and adaptation to new requirements without complex schema migrations. As the platform evolves, this schema will be updated to reflect new features and optimizations.
