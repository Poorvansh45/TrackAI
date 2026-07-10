import asyncio
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, date, timezone

from langchain_core.language_models import BaseChatModel
from app.mentor.providers.base import MentorLLM
from app.mentor.schemas.context import StudentLearningContext
from app.mentor.context.service import StudentLearningContextService
from app.mentor.graph.nodes import build_context_system_prompt, NodeProvider
from app.mentor.tools.roadmap_tool import HelpFromRoadmapTool


class TestContextIntegration(unittest.TestCase):
    """
    Unit test suite to verify student context loading, quiz weaknesses,
    onboarding redirection, and tool formatting in Mentor AI.
    """

    def setUp(self):
        # Mock database collections
        self.mock_db = MagicMock()
        self.mock_users = MagicMock()
        self.mock_roadmap = MagicMock()
        self.mock_quizzes = MagicMock()

        self.mock_db.__getitem__.side_effect = lambda key: {
            "users": self.mock_users,
            "roadmap_progress": self.mock_roadmap,
            "quiz_attempts": self.mock_quizzes
        }.get(key, MagicMock())

        # Sample mock data matching Tracks AI schema
        self.sample_user = {
            "_id": "test_user_id",
            "name": "Alice Developer",
            "email": "alice@example.com",
            "career_goal": "AI/ML Engineer"
        }

        self.sample_roadmap = {
            "user_id": "test_user_id",
            "skill": "AI/ML Engineering",
            "phases": [
                {
                    "phase_number": 1,
                    "phase_title": "Foundations",
                    "topics": [
                        {
                            "topic_id": "python-basics",
                            "topic_name": "Python Basics",
                            "status": "completed",
                            "progress_pct": 100,
                            "xp_earned": 100,
                            "completed_at": "2026-07-07T12:00:00Z"
                        },
                        {
                            "topic_id": "data-structures",
                            "topic_name": "Data Structures",
                            "status": "active",
                            "progress_pct": 40,
                            "xp_earned": 20,
                            "completed_at": None
                        },
                        {
                            "topic_id": "algorithms",
                            "topic_name": "Algorithms",
                            "status": "locked",
                            "progress_pct": 0,
                            "xp_earned": 0,
                            "completed_at": None
                        }
                    ]
                }
            ]
        }

        self.sample_quizzes = [
            {
                "topic_id": "python-basics",
                "quiz_status": "VERIFIED",
                "latest_score": 100.0,
                "attempt_count": 1,
                "attempt_history": [
                    {
                        "score": 100.0,
                        "passed": True,
                        "xp_earned": 50,
                        "completed_at": "2026-07-07T12:30:00"
                    }
                ]
            },
            {
                "topic_id": "trees-quiz",
                "quiz_status": "NEEDS_REVISION",
                "latest_score": 40.0,
                "attempt_count": 2,
                "attempt_history": [
                    {
                        "score": 40.0,
                        "passed": False,
                        "xp_earned": 0,
                        "completed_at": "2026-07-08T10:00:00"
                    }
                ]
            }
        ]

    @patch("app.mentor.context.service.get_database")
    def test_user_context_loads(self, mock_get_db):
        """Verify user context loads profile, progress, and quizzes successfully."""
        mock_get_db.return_value = self.mock_db
        self.mock_users.find_one = AsyncMock(return_value=self.sample_user)
        self.mock_roadmap.find_one = AsyncMock(return_value=self.sample_roadmap)
        
        # Mock cursor for find() in quiz_attempts
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=self.sample_quizzes)
        self.mock_quizzes.find = MagicMock(return_value=mock_cursor)

        context = asyncio.run(
            StudentLearningContextService.get_student_context("test_user_id")
        )

        self.assertTrue(context.has_roadmap)
        self.assertEqual(context.name, "Alice Developer")
        self.assertEqual(context.career_goal, "AI/ML Engineer")
        self.assertEqual(context.roadmap_name, "AI/ML Engineering")
        self.assertEqual(context.total_xp, 170)  # 100 roadmap topic + 20 active + 50 quiz

    @patch("app.mentor.context.service.get_database")
    def test_completed_and_active_topics_detected(self, mock_get_db):
        """Verify that completed, active, and locked topics are correctly catalogued."""
        mock_get_db.return_value = self.mock_db
        self.mock_users.find_one = AsyncMock(return_value=self.sample_user)
        self.mock_roadmap.find_one = AsyncMock(return_value=self.sample_roadmap)
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        self.mock_quizzes.find = MagicMock(return_value=mock_cursor)

        context = asyncio.run(
            StudentLearningContextService.get_student_context("test_user_id")
        )

        self.assertIn("Python Basics", context.completed_topics)
        self.assertEqual(context.current_active_topic_name, "Data Structures")
        self.assertIn("Algorithms", context.locked_topics)
        self.assertEqual(context.overall_progress_pct, 33)  # 1 out of 3 topics complete

    @patch("app.mentor.context.service.get_database")
    def test_quiz_weakness_detected(self, mock_get_db):
        """Verify that weak quiz areas (score < 70% or NEEDS_REVISION) are identified."""
        mock_get_db.return_value = self.mock_db
        self.mock_users.find_one = AsyncMock(return_value=self.sample_user)
        self.mock_roadmap.find_one = AsyncMock(return_value=self.sample_roadmap)
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=self.sample_quizzes)
        self.mock_quizzes.find = MagicMock(return_value=mock_cursor)

        context = asyncio.run(
            StudentLearningContextService.get_student_context("test_user_id")
        )

        # "trees-quiz" has NEEDS_REVISION and score 40
        self.assertIn("trees-quiz", context.weak_quiz_areas)
        self.assertNotIn("Python Basics", context.weak_quiz_areas)

    @patch("app.mentor.context.service.get_database")
    def test_streak_calculation(self, mock_get_db):
        """Verify that consecutive day streaks are calculated dynamically from timestamps."""
        mock_get_db.return_value = self.mock_db
        self.mock_users.find_one = AsyncMock(return_value=self.sample_user)

        # Setup consecutive dates: today and yesterday
        today_str = date.today().isoformat()
        yesterday_str = (date.today() - timedelta(days=1)).isoformat()

        roadmap_streak_data = {
            "user_id": "test_user_id",
            "skill": "AI/ML Engineering",
            "phases": [
                {
                    "topics": [
                        {
                            "topic_id": "t1",
                            "topic_name": "T1",
                            "status": "completed",
                            "completed_at": f"{yesterday_str}T10:00:00Z"
                        },
                        {
                            "topic_id": "t2",
                            "topic_name": "T2",
                            "status": "completed",
                            "completed_at": f"{today_str}T15:00:00Z"
                        }
                    ]
                }
            ]
        }

        self.mock_roadmap.find_one = AsyncMock(return_value=roadmap_streak_data)
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        self.mock_quizzes.find = MagicMock(return_value=mock_cursor)

        context = asyncio.run(
            StudentLearningContextService.get_student_context("test_user_id")
        )

        self.assertEqual(context.streak_days, 2)

    def test_onboarding_fallback(self):
        """Verify system prompt and node behavior redirects users without a roadmap."""
        # 1. Test system prompt helper
        context_no_roadmap = {
            "user_id": "test_user_id",
            "has_roadmap": False
        }
        prompt = build_context_system_prompt(context_no_roadmap)
        self.assertIn("NO active roadmap", prompt)
        self.assertIn("Remind them to generate a learning roadmap first", prompt)

        # 2. Test Node onboarding short-circuit check
        mock_node = NodeProvider(
            llm=MagicMock(),
            memory_manager=MagicMock(),
            vector_store_manager=MagicMock(),
            tool_registry=MagicMock(),
            rag_pipeline=MagicMock(),
            yt_agent=MagicMock(),
            pdf_agent=MagicMock(),
            quiz_agent=MagicMock()
        )
        state = {
            "user_id": "test_user_id",
            "student_context": context_no_roadmap
        }
        res = mock_node._check_roadmap_fallback(state)
        self.assertIsNotNone(res)
        self.assertEqual(res["tool_result"], mock_node.ONBOARDING_FALLBACK_TEXT)

    @patch("app.core.database.get_database")
    def test_roadmap_tool_queries_mongodb(self, mock_get_db):
        """Verify HelpFromRoadmapTool queries actual roadmap data in _arun."""
        mock_get_db.return_value = self.mock_db
        self.mock_roadmap.find_one = AsyncMock(return_value=self.sample_roadmap)

        mock_chat_model = MagicMock(spec=BaseChatModel)
        mock_response = MagicMock()
        mock_response.content = "Next topic is Data Structures because..."
        mock_chat_model.invoke.return_value = mock_response
        mock_chat_model.ainvoke = AsyncMock(return_value=mock_response)

        mock_llm = MentorLLM(llm=mock_chat_model)

        tool = HelpFromRoadmapTool(mentor_llm=mock_llm)
        result = asyncio.run(
            tool._arun(
                question="What should I learn next?",
                roadmap_topic="python-basics",
                student_level="intermediate",
                user_id="test_user_id"
            )
        )

        self.mock_roadmap.find_one.assert_called_with({"user_id": "test_user_id"})
        self.assertIn("Next topic is Data Structures", result)


from datetime import timedelta

if __name__ == "__main__":
    unittest.main()
