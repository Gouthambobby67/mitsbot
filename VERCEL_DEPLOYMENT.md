# Deploying College CR Bot to Vercel

This guide explains how to deploy your Telegram bot on Vercel using webhooks instead of polling.

## Prerequisites

1. **Telegram Bot Token**: Get one from [@BotFather](https://t.me/botfather) on Telegram
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Step 1: Prepare Your Repository

Make sure all files are committed:

```bash
git add .
git commit -m "Setup Vercel deployment"
git push origin main
```

## Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select your Git repository
4. Vercel will auto-detect Python
5. Click "Deploy"

## Step 3: Set Environment Variables

After deployment, go to your project settings:

1. Click your project on Vercel dashboard
2. Go to **Settings** → **Environment Variables**
3. Add these variables:
   - `TELEGRAM_BOT_TOKEN`: Your bot token from BotFather
   - `TELEGRAM_WEBHOOK_URL`: Your Vercel deployment URL (e.g., `https://your-project.vercel.app`)

4. Redeploy to apply environment variables

## Step 4: Configure Webhook with Telegram

After deployment, run this command to set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_VERCEL_URL>"
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual token
- `<YOUR_VERCEL_URL>` with your Vercel deployment URL (e.g., `https://your-project.vercel.app`)

To verify the webhook is set:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Step 5: Test the Bot

1. Start your bot with `/start`
2. Try `/examtimetable` or `/resultscheck`
3. Check Vercel function logs for any errors

## Important Notes

### Architecture Changes

- **Original**: Bot uses `polling` (continuously asks Telegram for updates)
- **Vercel**: Bot uses `webhooks` (Telegram sends updates to your serverless function)

### File Structure

```
college_cr_bot-main/
├── api/
│   └── webhook.py          # Serverless function handler
├── bot_handlers.py         # All bot handlers
├── bot.py                  # Original bot (reference, not used in Vercel)
├── ExamTimeTable.py        # Exam timetable and results utilities
├── vercel.json            # Vercel configuration
├── requirements.txt        # Python dependencies
└── .env.example           # Environment variables template
```

### Key Files for Deployment

- **`api/webhook.py`**: Entry point for Vercel (serverless function)
- **`bot_handlers.py`**: Contains all bot logic
- **`vercel.json`**: Configuration for Vercel routing
- **`requirements.txt`**: Python package dependencies

## Troubleshooting

### Bot not responding

1. Check Vercel logs: Project → Deployments → View Functions
2. Verify webhook is set: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
3. Ensure environment variables are set

### Webhook errors

Check the Vercel function logs:
- Go to **Deployments** → **View Functions** → click on `api/webhook.py`
- Scroll through logs to see error messages

### Module import errors

If you get `ModuleNotFoundError`:
- Ensure `requirements.txt` includes all dependencies
- Trigger a redeployment with `git push`

## Local Testing (Optional)

To test locally before deploying:

```bash
pip install -r requirements.txt
pip install fastapi uvicorn
python api/webhook.py
```

This will start a local server at `http://localhost:8000`.

## Limitations on Vercel

- **Execution timeout**: 10-60 seconds (varies by plan)
- **Memory limit**: 512MB-3GB (varies by plan)
- **Cold starts**: First request may take a few seconds
- **File storage**: Temporary `/tmp` only (deleted after function ends)

## Missing Dependencies

⚠️ Your code imports `from resutbot import bot_work`. This file is missing. You'll need to:

1. Create `resutbot.py` with the `bot_work` function
2. Ensure it handles the Vercel environment (e.g., temporary file storage in `/tmp`)

## Support

For more info:
- [Vercel Python Documentation](https://vercel.com/docs/functions/python)
- [python-telegram-bot Webhooks](https://docs.python-telegram-bot.org/en/stable/telegram.ext.Application.html#telegram.ext.Application.run_webhook)
