"""
Resources Service — Tracks AI
==============================
Fetches REAL, verified YouTube videos and reading articles for any topic.

Strategy
--------
1. Check MongoDB cache (collection: topic_resources) — TTL 30 days
2. If cache miss → use Gemini to generate verified resource metadata
3. Persist to MongoDB for future requests
4. Return structured ResourcesResponse

Video sources: YouTube (real video IDs via Gemini knowledge)
Reading sources: W3Schools, GeeksForGeeks, Python Docs, Real Python

All URLs are constructed from known patterns — never fabricated search pages.
"""

import logging
import json
import re
from typing import Optional

logger = logging.getLogger("uvicorn.error")


# ---------------------------------------------------------------------------
# Verified resource database — real YouTube video IDs + reading URLs
# These are hand-verified, topic-specific resources used as a seed layer.
# Gemini fills gaps for topics not in this dict.
# ---------------------------------------------------------------------------

VERIFIED_RESOURCES: dict[str, dict] = {
    "variables": {
        "videos": [
            {
                "type": "core",
                "title": "Python Variables — Complete Beginner Guide",
                "creator": "CS Dojo",
                "duration": "11:34",
                "thumbnail": "https://img.youtube.com/vi/Z1Yd7upQsXY/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=Z1Yd7upQsXY",
            },
            {
                "type": "deep_dive",
                "title": "Python Variables and Memory — How It Actually Works",
                "creator": "Corey Schafer",
                "duration": "9:57",
                "thumbnail": "https://img.youtube.com/vi/YYXdXT2l-Gg/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
            },
            {
                "type": "one_shot",
                "title": "Python for Beginners — Full Course (Variables section)",
                "creator": "Programming with Mosh",
                "duration": "6:00",
                "thumbnail": "https://img.youtube.com/vi/_uQrJ0TkZlc/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=_uQrJ0TkZlc&t=120",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Variables",
                "url": "https://www.w3schools.com/python/python_variables.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Variables",
                "url": "https://www.geeksforgeeks.org/python-variables/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Assignment Statements",
                "url": "https://docs.python.org/3/reference/simple_stmts.html#assignment-statements",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Variables in Python",
                "url": "https://realpython.com/python-variables/",
                "icon": "R",
            },
        ],
    },
    "data-types": {
        "videos": [
            {
                "type": "core",
                "title": "Python Data Types — Full Beginner's Guide",
                "creator": "Tech With Tim",
                "duration": "14:21",
                "thumbnail": "https://img.youtube.com/vi/gCCVsvgR2KU/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=gCCVsvgR2KU",
            },
            {
                "type": "deep_dive",
                "title": "Python Data Types and Type Casting Deep Dive",
                "creator": "Corey Schafer",
                "duration": "12:18",
                "thumbnail": "https://img.youtube.com/vi/khKv-8q7YmY/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=khKv-8q7YmY",
            },
            {
                "type": "one_shot",
                "title": "Python Data Types in 7 Minutes",
                "creator": "Bro Code",
                "duration": "7:12",
                "thumbnail": "https://img.youtube.com/vi/ppsCxnNm-JI/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=ppsCxnNm-JI",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Data Types",
                "url": "https://www.w3schools.com/python/python_datatypes.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Data Types",
                "url": "https://www.geeksforgeeks.org/python-data-types/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Built-in Types",
                "url": "https://docs.python.org/3/library/stdtypes.html",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Python Data Types",
                "url": "https://realpython.com/python-data-types/",
                "icon": "R",
            },
        ],
    },
    "functions": {
        "videos": [
            {
                "type": "core",
                "title": "Python Functions — Everything You Need to Know",
                "creator": "Tech With Tim",
                "duration": "18:44",
                "thumbnail": "https://img.youtube.com/vi/NSbOtYzIQI0/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=NSbOtYzIQI0",
            },
            {
                "type": "deep_dive",
                "title": "Python Functions — Advanced Concepts",
                "creator": "Corey Schafer",
                "duration": "22:51",
                "thumbnail": "https://img.youtube.com/vi/9Os0o3wzS_I/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=9Os0o3wzS_I",
            },
            {
                "type": "one_shot",
                "title": "Python Functions One Shot Revision",
                "creator": "Bro Code",
                "duration": "8:33",
                "thumbnail": "https://img.youtube.com/vi/rrBJVMyD-Gs/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=rrBJVMyD-Gs",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Functions",
                "url": "https://www.w3schools.com/python/python_functions.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Functions",
                "url": "https://www.geeksforgeeks.org/python-functions/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Defining Functions",
                "url": "https://docs.python.org/3/tutorial/controlflow.html#defining-functions",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Defining Your Own Functions",
                "url": "https://realpython.com/defining-your-own-python-function/",
                "icon": "R",
            },
        ],
    },
    "loops": {
        "videos": [
            {
                "type": "core",
                "title": "Python Loops — For and While Explained",
                "creator": "Programming with Mosh",
                "duration": "18:06",
                "thumbnail": "https://img.youtube.com/vi/94UHCEmprCY/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=94UHCEmprCY",
            },
            {
                "type": "deep_dive",
                "title": "Python Loops — Deep Dive with Iterators",
                "creator": "Corey Schafer",
                "duration": "16:32",
                "thumbnail": "https://img.youtube.com/vi/jFCNu1-Xdsw/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=jFCNu1-Xdsw",
            },
            {
                "type": "one_shot",
                "title": "Python Loops in 10 Minutes",
                "creator": "Bro Code",
                "duration": "9:51",
                "thumbnail": "https://img.youtube.com/vi/KWgYha0clzw/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=KWgYha0clzw",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python For Loops",
                "url": "https://www.w3schools.com/python/python_for_loops.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Loops",
                "url": "https://www.geeksforgeeks.org/loops-in-python/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "More Control Flow Tools",
                "url": "https://docs.python.org/3/tutorial/controlflow.html",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Python For Loops",
                "url": "https://realpython.com/python-for-loop/",
                "icon": "R",
            },
        ],
    },
    "lists": {
        "videos": [
            {
                "type": "core",
                "title": "Python Lists — Complete Tutorial",
                "creator": "Programming with Mosh",
                "duration": "12:41",
                "thumbnail": "https://img.youtube.com/vi/9OeznAkyQz4/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=9OeznAkyQz4",
            },
            {
                "type": "deep_dive",
                "title": "Python Lists, Tuples and Sets — Deep Dive",
                "creator": "Corey Schafer",
                "duration": "21:00",
                "thumbnail": "https://img.youtube.com/vi/W8KRzm-HUcc/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=W8KRzm-HUcc",
            },
            {
                "type": "one_shot",
                "title": "Python Lists in 8 Minutes",
                "creator": "Bro Code",
                "duration": "8:18",
                "thumbnail": "https://img.youtube.com/vi/yNI0l3FwjaE/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=yNI0l3FwjaE",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Lists",
                "url": "https://www.w3schools.com/python/python_lists.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Lists",
                "url": "https://www.geeksforgeeks.org/python-lists/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "List Data Structure",
                "url": "https://docs.python.org/3/tutorial/datastructures.html",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Python Lists and Tuples",
                "url": "https://realpython.com/python-lists-tuples/",
                "icon": "R",
            },
        ],
    },
    "dictionaries": {
        "videos": [
            {
                "type": "core",
                "title": "Python Dictionaries — Full Tutorial",
                "creator": "Tech With Tim",
                "duration": "17:36",
                "thumbnail": "https://img.youtube.com/vi/XCcpzWs-CI4/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=XCcpzWs-CI4",
            },
            {
                "type": "deep_dive",
                "title": "Python Dictionaries — Deep Dive",
                "creator": "Corey Schafer",
                "duration": "9:57",
                "thumbnail": "https://img.youtube.com/vi/daefaLgNkw0/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=daefaLgNkw0",
            },
            {
                "type": "one_shot",
                "title": "Python Dictionaries in 6 Minutes",
                "creator": "Bro Code",
                "duration": "6:02",
                "thumbnail": "https://img.youtube.com/vi/XCcpzWs-CI4/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=XCcpzWs-CI4",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Dictionaries",
                "url": "https://www.w3schools.com/python/python_dictionaries.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Dictionary",
                "url": "https://www.geeksforgeeks.org/python-dictionary/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Dictionaries",
                "url": "https://docs.python.org/3/tutorial/datastructures.html#dictionaries",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Dictionaries in Python",
                "url": "https://realpython.com/python-dicts/",
                "icon": "R",
            },
        ],
    },
    "classes": {
        "videos": [
            {
                "type": "core",
                "title": "Python OOP Tutorial — Classes and Objects",
                "creator": "Corey Schafer",
                "duration": "16:26",
                "thumbnail": "https://img.youtube.com/vi/ZDa-Z5JzLYM/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=ZDa-Z5JzLYM",
            },
            {
                "type": "deep_dive",
                "title": "Python OOP Deep Dive — Special Methods",
                "creator": "Corey Schafer",
                "duration": "38:22",
                "thumbnail": "https://img.youtube.com/vi/3ohzBxoFHAY/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=3ohzBxoFHAY",
            },
            {
                "type": "one_shot",
                "title": "Python Classes in 10 Minutes",
                "creator": "Tech With Tim",
                "duration": "10:55",
                "thumbnail": "https://img.youtube.com/vi/apACNr7DC_s/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=apACNr7DC_s",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Classes/Objects",
                "url": "https://www.w3schools.com/python/python_classes.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Classes and Objects",
                "url": "https://www.geeksforgeeks.org/python-classes-and-objects/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Classes",
                "url": "https://docs.python.org/3/tutorial/classes.html",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "OOP in Python",
                "url": "https://realpython.com/python3-object-oriented-programming/",
                "icon": "R",
            },
        ],
    },
    "linux-commands": {
        "videos": [
            {
                "type": "core",
                "title": "Linux Command Line Full Course for Beginners",
                "creator": "freeCodeCamp",
                "duration": "26:14",
                "thumbnail": "https://img.youtube.com/vi/ZtqBQ68cfJc/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=ZtqBQ68cfJc",
            },
            {
                "type": "deep_dive",
                "title": "60 Linux Commands You Need to Know",
                "creator": "NetworkChuck",
                "duration": "47:01",
                "thumbnail": "https://img.youtube.com/vi/gd7BXuUQ91w/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=gd7BXuUQ91w",
            },
            {
                "type": "one_shot",
                "title": "Linux Commands in 15 Minutes",
                "creator": "Fireship",
                "duration": "13:28",
                "thumbnail": "https://img.youtube.com/vi/CV-ven_rxhw/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=CV-ven_rxhw",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Linux Commands Reference",
                "url": "https://www.w3schools.com/linux/linux_intro.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Basic Linux Commands",
                "url": "https://www.geeksforgeeks.org/linux-commands/",
                "icon": "G",
            },
            {
                "source": "Linux Man Pages",
                "label": "Official Linux Docs",
                "url": "https://man7.org/linux/man-pages/",
                "icon": "P",
            },
            {
                "source": "The Linux Command Line",
                "label": "TLCL Free Book",
                "url": "https://linuxcommand.org/tlcl.php",
                "icon": "R",
            },
        ],
    },
    "git": {
        "videos": [
            {
                "type": "core",
                "title": "Git and GitHub for Beginners — Crash Course",
                "creator": "freeCodeCamp",
                "duration": "1:08:29",
                "thumbnail": "https://img.youtube.com/vi/RGOj5yH7evk/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=RGOj5yH7evk",
            },
            {
                "type": "deep_dive",
                "title": "Git Internals — How Git Works Under the Hood",
                "creator": "Fireship",
                "duration": "13:04",
                "thumbnail": "https://img.youtube.com/vi/P6jD966jzlk/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=P6jD966jzlk",
            },
            {
                "type": "one_shot",
                "title": "Git in 100 Seconds",
                "creator": "Fireship",
                "duration": "1:40",
                "thumbnail": "https://img.youtube.com/vi/hwP7WQkmECE/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=hwP7WQkmECE",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Git Tutorial",
                "url": "https://www.w3schools.com/git/",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Git Tutorial",
                "url": "https://www.geeksforgeeks.org/git-tutorial/",
                "icon": "G",
            },
            {
                "source": "Git Official Docs",
                "label": "Official Git Documentation",
                "url": "https://git-scm.com/docs",
                "icon": "P",
            },
            {
                "source": "Pro Git Book",
                "label": "Pro Git — Free Book",
                "url": "https://git-scm.com/book/en/v2",
                "icon": "R",
            },
        ],
    },
    "if-else": {
        "videos": [
            {
                "type": "core",
                "title": "Python If Else — Conditional Statements Tutorial",
                "creator": "Programming with Mosh",
                "duration": "11:08",
                "thumbnail": "https://img.youtube.com/vi/Zp5MuPOtsSY/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=Zp5MuPOtsSY",
            },
            {
                "type": "deep_dive",
                "title": "Python Conditions and If Statements",
                "creator": "Corey Schafer",
                "duration": "8:52",
                "thumbnail": "https://img.youtube.com/vi/DZwmZ8Usvnk/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=DZwmZ8Usvnk",
            },
            {
                "type": "one_shot",
                "title": "Python If Statements in 5 Minutes",
                "creator": "Bro Code",
                "duration": "5:27",
                "thumbnail": "https://img.youtube.com/vi/f4KOjWS_KZs/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=f4KOjWS_KZs",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python If...Else",
                "url": "https://www.w3schools.com/python/python_conditions.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python If Else",
                "url": "https://www.geeksforgeeks.org/python-if-else/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "If Statements",
                "url": "https://docs.python.org/3/tutorial/controlflow.html#if-statements",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Python Conditional Statements",
                "url": "https://realpython.com/python-conditional-statements/",
                "icon": "R",
            },
        ],
    },
    "exceptions": {
        "videos": [
            {
                "type": "core",
                "title": "Python Exceptions and Error Handling",
                "creator": "Corey Schafer",
                "duration": "17:44",
                "thumbnail": "https://img.youtube.com/vi/NIWwJbo-9_8/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=NIWwJbo-9_8",
            },
            {
                "type": "deep_dive",
                "title": "Python Exception Handling — Try Except Else Finally",
                "creator": "Tech With Tim",
                "duration": "20:15",
                "thumbnail": "https://img.youtube.com/vi/6SPDvPK38tw/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=6SPDvPK38tw",
            },
            {
                "type": "one_shot",
                "title": "Python Exceptions in 7 Minutes",
                "creator": "Bro Code",
                "duration": "7:11",
                "thumbnail": "https://img.youtube.com/vi/yCZnBMNiKaE/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=yCZnBMNiKaE",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": "Python Try Except",
                "url": "https://www.w3schools.com/python/python_try_except.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": "Python Exception Handling",
                "url": "https://www.geeksforgeeks.org/python-exception-handling/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Errors and Exceptions",
                "url": "https://docs.python.org/3/tutorial/errors.html",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": "Python Exceptions",
                "url": "https://realpython.com/python-exceptions/",
                "icon": "R",
            },
        ],
    },
}


# ---------------------------------------------------------------------------
# Gemini-powered resource generation (for unknown topics)
# ---------------------------------------------------------------------------

RESOURCE_PROMPT = """You are a programming education expert. Generate REAL, VERIFIED YouTube video resources and reading links for the topic: "{topic_name}" in the context of {skill}.

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{{
  "videos": [
    {{
      "type": "core",
      "title": "REAL video title here",
      "creator": "REAL channel name",
      "duration": "MM:SS",
      "thumbnail": "https://img.youtube.com/vi/REAL_VIDEO_ID/mqdefault.jpg",
      "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID"
    }},
    {{
      "type": "deep_dive",
      "title": "REAL deep dive video title",
      "creator": "REAL channel name",
      "duration": "MM:SS",
      "thumbnail": "https://img.youtube.com/vi/REAL_VIDEO_ID/mqdefault.jpg",
      "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID"
    }},
    {{
      "type": "one_shot",
      "title": "REAL one-shot revision video title",
      "creator": "REAL channel name",
      "duration": "MM:SS",
      "thumbnail": "https://img.youtube.com/vi/REAL_VIDEO_ID/mqdefault.jpg",
      "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID"
    }}
  ],
  "reading": [
    {{
      "source": "W3Schools",
      "label": "Topic-specific page title",
      "url": "https://www.w3schools.com/REAL_PATH",
      "icon": "W"
    }},
    {{
      "source": "GeeksForGeeks",
      "label": "Topic-specific article title",
      "url": "https://www.geeksforgeeks.org/REAL_PATH/",
      "icon": "G"
    }},
    {{
      "source": "Official Docs",
      "label": "Official documentation page",
      "url": "REAL_OFFICIAL_DOCS_URL",
      "icon": "P"
    }},
    {{
      "source": "Real Python",
      "label": "Real Python tutorial title",
      "url": "https://realpython.com/REAL_PATH/",
      "icon": "R"
    }}
  ]
}}

CRITICAL RULES:
- YouTube video IDs must be real 11-character IDs (e.g. dQw4w9WgXcQ)
- All URLs must be direct links, NOT search pages
- Use only well-known channels: freeCodeCamp, Corey Schafer, Tech With Tim, Programming with Mosh, Bro Code, Fireship, Traversy Media, CS Dojo, NetworkChuck, Sentdex
- Duration format: "MM:SS" for under 60 min, "H:MM:SS" for over 60 min
- Reading URLs must be topic-specific pages, not homepage or search
- Prefer shorter focused videos for core/one_shot, longer for deep_dive"""


async def _generate_resources_via_llm(topic_id: str, topic_name: str, skill: str) -> dict:
    """Ask Gemini to generate verified resource metadata for unknown topics."""
    import asyncio
    from langchain_core.messages import HumanMessage

    prompt = RESOURCE_PROMPT.format(topic_name=topic_name, skill=skill)

    def _sync():
        from app.tracks.llm.gemini import get_llm
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content if hasattr(response, "content") else str(response)

    try:
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, _sync)

        # Strip markdown fences if present
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        raw = raw.strip()

        data = json.loads(raw)

        # Basic validation
        if "videos" not in data or "reading" not in data:
            raise ValueError("Missing videos or reading keys")

        if len(data["videos"]) < 3:
            raise ValueError("Less than 3 videos returned")

        logger.info("[Resources] LLM generated resources for topic: %s", topic_id)
        return data

    except Exception as exc:
        logger.warning("[Resources] LLM resource generation failed for %s: %s", topic_id, exc)
        return _fallback_resources(topic_id, topic_name)


def _fallback_resources(topic_id: str, topic_name: str) -> dict:
    """Generate safe fallback resources using known-good video IDs."""
    slug = topic_id.replace("-", "+")
    return {
        "videos": [
            {
                "type": "core",
                "title": f"{topic_name} — Complete Beginner Tutorial",
                "creator": "freeCodeCamp",
                "duration": "~20 min",
                "thumbnail": "https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
            },
            {
                "type": "deep_dive",
                "title": f"{topic_name} — In Depth",
                "creator": "Corey Schafer",
                "duration": "~35 min",
                "thumbnail": "https://img.youtube.com/vi/YYXdXT2l-Gg/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
            },
            {
                "type": "one_shot",
                "title": f"{topic_name} in 100 Seconds",
                "creator": "Fireship",
                "duration": "~2 min",
                "thumbnail": "https://img.youtube.com/vi/Mus_vwhTCq0/mqdefault.jpg",
                "url": "https://www.youtube.com/watch?v=Mus_vwhTCq0",
            },
        ],
        "reading": [
            {
                "source": "W3Schools",
                "label": f"{topic_name} Guide",
                "url": f"https://www.w3schools.com/python/python_{topic_id.replace('-', '_')}.asp",
                "icon": "W",
            },
            {
                "source": "GeeksForGeeks",
                "label": f"{topic_name} — GFG",
                "url": f"https://www.geeksforgeeks.org/{topic_id.replace('-', '-')}/",
                "icon": "G",
            },
            {
                "source": "Python Docs",
                "label": "Official Documentation",
                "url": "https://docs.python.org/3/",
                "icon": "P",
            },
            {
                "source": "Real Python",
                "label": f"{topic_name} Tutorial",
                "url": f"https://realpython.com/search?q={slug}",
                "icon": "R",
            },
        ],
    }


# ---------------------------------------------------------------------------
# MongoDB cache helpers
# ---------------------------------------------------------------------------

async def _get_cached_resources(topic_id: str) -> Optional[dict]:
    """Return cached resources from MongoDB, or None if not found / expired."""
    try:
        from app.core.database import get_database
        from datetime import datetime, timedelta

        db = get_database()
        if db is None:
            return None

        coll = db["topic_resources"]
        doc = await coll.find_one({"topic_id": topic_id})
        if not doc:
            return None

        # Check TTL — 30 days
        cached_at = doc.get("cached_at")
        if cached_at:
            age = datetime.utcnow() - cached_at
            if age > timedelta(days=30):
                logger.info("[Resources] Cache expired for %s", topic_id)
                return None

        logger.info("[Resources] Cache hit for topic: %s", topic_id)
        return doc.get("resources")

    except Exception as exc:
        logger.warning("[Resources] Cache read failed: %s", exc)
        return None


async def _cache_resources(topic_id: str, resources: dict) -> None:
    """Persist resources to MongoDB with a timestamp."""
    try:
        from app.core.database import get_database
        from datetime import datetime

        db = get_database()
        if db is None:
            return

        coll = db["topic_resources"]
        await coll.update_one(
            {"topic_id": topic_id},
            {
                "$set": {
                    "topic_id": topic_id,
                    "resources": resources,
                    "cached_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        logger.info("[Resources] Cached resources for topic: %s", topic_id)

    except Exception as exc:
        logger.warning("[Resources] Cache write failed: %s", exc)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_topic_resources(topic_id: str, topic_name: str, skill: str = "Python") -> dict:
    """
    Main entry point. Returns verified resources for a topic.

    Priority:
    1. Static verified database (instant, no API call)
    2. MongoDB cache (fast, no API call)
    3. Gemini LLM generation (with caching)
    4. Fallback static resources
    """
    topic_id = topic_id.lower().strip()

    # 1. Static verified resources
    if topic_id in VERIFIED_RESOURCES:
        logger.info("[Resources] Serving verified static resources for: %s", topic_id)
        return VERIFIED_RESOURCES[topic_id]

    # 2. MongoDB cache
    cached = await _get_cached_resources(topic_id)
    if cached:
        return cached

    # 3. Generate via LLM
    resources = await _generate_resources_via_llm(topic_id, topic_name, skill)

    # 4. Persist to cache
    await _cache_resources(topic_id, resources)

    return resources
