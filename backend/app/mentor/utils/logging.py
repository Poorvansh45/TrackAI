import logging
import logging.config
import os
from typing import Dict, Any

def configure_logging(log_level: str = "INFO", debug: bool = False) -> None:
    """Configures application-wide logging with Console handlers."""
    # Ensure logs folder exists if we decide to log to files
    log_format = (
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        if debug else
        "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
    )
    
    config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": log_format,
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "level": log_level,
            },
        },
        "root": {
            "handlers": ["console"],
            "level": log_level,
        },
        "loggers": {
            "mentor": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "mentor_ai.tools": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
        }
    }
    
    logging.config.dictConfig(config)
    logger = logging.getLogger("mentor")
    logger.info(f"Logging configured at level: {log_level}")
