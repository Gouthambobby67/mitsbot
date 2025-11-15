import os
import logging
import sys
from pathlib import Path

# Add parent directory to path to import bot modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import Application, ContextTypes
from bot_handlers import setup_handlers

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Get environment variables
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_URL = os.getenv("TELEGRAM_WEBHOOK_URL")

if not TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN environment variable not set")
    TOKEN = ""

if not WEBHOOK_URL:
    logger.warning("TELEGRAM_WEBHOOK_URL environment variable not set")
    WEBHOOK_URL = ""

# Create application
application = Application.builder().token(TOKEN).build()

# Setup handlers
setup_handlers(application)

async def handle_request(request):
    """Handle incoming Telegram webhook requests"""
    try:
        if request.method == "POST":
            data = await request.json()
            update = Update.de_json(data, application.bot)
            
            if update:
                await application.process_update(update)
            
            return {"status": "ok"}, 200
        else:
            return {"status": "ok"}, 200
    except Exception as e:
        logger.error(f"Error handling request: {e}", exc_info=True)
        return {"error": str(e)}, 500


async def handler(request):
    """Vercel handler function"""
    try:
        if request.method == "POST":
            data = await request.json()
            update = Update.de_json(data, application.bot)
            
            if update:
                await application.process_update(update)
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error in webhook handler: {e}", exc_info=True)
        return {"error": str(e)}


# For local testing with FastAPI or similar
if __name__ == "__main__":
    import asyncio
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    
    app = FastAPI()
    
    @app.post("/")
    async def webhook(request: Request):
        return await handler(request)
    
    @app.get("/")
    async def root():
        return {"status": "Bot is running"}
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
