import os
import logging
import sys
from pathlib import Path

# Add parent directory to path to import bot modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Request
from telegram import Update
from telegram.ext import Application
from bot_handlers import setup_handlers

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Environment
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
if not TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN is not set")

# Build application and register handlers
application = Application.builder().token(TOKEN).build()
setup_handlers(application)

_app_started = False

async def _ensure_started():
    global _app_started
    if not _app_started:
        await application.initialize()
        await application.start()
        _app_started = True
        logger.info("Telegram application initialized and started")

# Expose ASGI app for Vercel (@vercel/python detects FastAPI/ASGI apps)
app = FastAPI()

@app.post("/")
async def telegram_webhook(request: Request):
    try:
        await _ensure_started()
        data = await request.json()
        update = Update.de_json(data, application.bot)
        if update:
            await application.process_update(update)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error in telegram_webhook: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}

@app.get("/")
async def health():
    return {"ok": True}
