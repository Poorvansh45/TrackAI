import logging
from typing import Any, List, Optional
from langchain_core.tools import BaseTool

from app.mentor.tools.explain_tool import ExplainConceptTool
from app.mentor.tools.quiz_tool import GenerateQuizTool
from app.mentor.tools.roadmap_tool import HelpFromRoadmapTool
from app.mentor.tools.summary_tool import SummarizeTextTool
from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.tools.registry")

class ToolRegistry:
    """
    Central catalogue for all Mentor AI tools.
    Provides registration, lookup, description generator, and LLM bindings.
    """

    def __init__(self) -> None:
        self._tools: dict[str, BaseTool] = {}
        logger.info("Initialized ToolRegistry.")

    def register(self, *tools: BaseTool) -> "ToolRegistry":
        """Register one or more tools. Returns self for chaining."""
        for tool in tools:
            if tool.name in self._tools:
                logger.warning(f"Overwriting existing tool: {tool.name!r}")
            self._tools[tool.name] = tool
            logger.info(f"Registered tool: {tool.name!r}")
        return self

    def get(self, name: str) -> Optional[BaseTool]:
        """Retrieve a tool by name. Returns None if not found."""
        return self._tools.get(name)

    def get_or_raise(self, name: str) -> BaseTool:
        """Retrieve a tool by name. Raises ValueError if not found."""
        tool = self._tools.get(name)
        if tool is None:
            raise ValueError(
                f"Tool {name!r} not registered. "
                f"Available: {list(self._tools.keys())}"
            )
        return tool

    def list_tools(self) -> List[BaseTool]:
        """Return all registered tools."""
        return list(self._tools.values())

    def list_names(self) -> List[str]:
        """Return all registered tool names."""
        return list(self._tools.keys())

    def get_tools_for_llm(self) -> List[BaseTool]:
        """Return tools in a format ready for LLM tool calling binding."""
        return self.list_tools()

    def describe(self, verbose: bool = False) -> str:
        """Return a human-readable description of all tools for routers."""
        lines = [f"Available Tools ({len(self._tools)}):"]
        for name, tool in self._tools.items():
            desc = tool.description if verbose else tool.description[:80] + "..."
            schema_fields = list(tool.args_schema.model_fields.keys()) if tool.args_schema else []
            lines.append(f"\n  {name}")
            lines.append(f"     {desc}")
            lines.append(f"     Inputs: {', '.join(schema_fields)}")
        return "\n".join(lines)

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools

    def __repr__(self) -> str:
        return f"ToolRegistry(tools={list(self._tools.keys())})"


def build_tool_registry(llm: MentorLLM, roadmap: Optional[dict] = None) -> ToolRegistry:
    """
    Factory function: creates and registers all four Mentor AI tools.
    """
    return ToolRegistry().register(
        ExplainConceptTool(mentor_llm=llm),
        HelpFromRoadmapTool(mentor_llm=llm, roadmap=roadmap or {}),
        GenerateQuizTool(mentor_llm=llm),
        SummarizeTextTool(mentor_llm=llm),
    )
