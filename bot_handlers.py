import logging
from ExamTimeTable import exam_timetable
from results_helper import ResultsChecking
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    ContextTypes,
    filters,
)

# --- Constants ---
# States for ConversationHandler
(
    GET_REGULATION,
    GET_YEAR,
    GET_SEM,
    GET_OPTION,
    GET_ROLL,
    CONFIRM_ROLL,
    GET_DOB,
    CONFIRM_DOB,
) = range(8)

MAX_TIMETABLE_ENTRIES = 10

# --- Logging Setup ---
logger = logging.getLogger(__name__)

# --- Global Class Instance ---
try:
    a = ResultsChecking()
except Exception as e:
    logger.critical(f"Failed to instantiate ResultsChecking class: {e}")
    a = None


# --- 1. Simple Command Handlers ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sends a welcome message when the /start command is issued."""
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="Hi! I'm a bot. You can use:\n"
             "/examtimetable - To check exam timetables\n"
             "/resultscheck - To get your results"
    )


async def examtimetable(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Starts the /examtimetable flow by asking for Regulation."""
    keyboard = [
        [InlineKeyboardButton("R23", callback_data='R23')],
        [InlineKeyboardButton("R20", callback_data='R20')],
        [InlineKeyboardButton("R18", callback_data='R18')],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="Choose Regulation for Exam Timetable:",
        reply_markup=reply_markup
    )


async def button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the button press from the /examtimetable flow."""
    query = update.callback_query
    await query.answer()
    regulation = query.data
    
    try:
        notice = exam_timetable(regulation)
        # Show only the top entries
        msg = "\n\n".join(notice[:MAX_TIMETABLE_ENTRIES])
        if not msg:
             msg = "No timetable found for that regulation."
    except Exception as e:
        logger.error(f"Error in exam_timetable function: {e}")
        msg = "Sorry, an error occurred while fetching the timetable."

    await query.edit_message_text(text=msg)


# --- 2. ConversationHandler for /resultscheck ---

async def resultscheck(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Starts the /resultscheck conversation."""
    if a is None:
        await update.message.reply_text("Sorry, the bot is not configured correctly. Please contact the admin.")
        return ConversationHandler.END
        
    context.user_data.clear()
    keyboard = [
        [
            InlineKeyboardButton("R18", callback_data="reg_R18"),
            InlineKeyboardButton("R20", callback_data="reg_R20"),
            InlineKeyboardButton("R23", callback_data="reg_R23"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "Hi! Let's get your results.\n\n"
        "Please select your Regulation:",
        reply_markup=reply_markup
    )
    return GET_REGULATION


async def get_regulation(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores Regulation and asks for Year."""
    query = update.callback_query
    await query.answer()
    regulation = query.data.split('_')[1]
    context.user_data["regulation"] = regulation
    
    keyboard = [
        [
            InlineKeyboardButton("1", callback_data="1"),
            InlineKeyboardButton("2", callback_data="2"),
        ],
        [
            InlineKeyboardButton("3", callback_data="3"),
            InlineKeyboardButton("4", callback_data="4"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text=f"Regulation: {regulation}\n\nPlease select your Year:",
        reply_markup=reply_markup
    )
    return GET_YEAR


async def get_year(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores Year and asks for Semester."""
    query = update.callback_query
    await query.answer()
    
    year = query.data
    context.user_data["year"] = year
    
    keyboard = [
        [
            InlineKeyboardButton("Semester 1", callback_data="1"),
            InlineKeyboardButton("Semester 2", callback_data="2"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    reg = context.user_data['regulation']
    await query.edit_message_text(
        text=f"Regulation: {reg}\n"
             f"Year: {year}\n\n"
             f"Please select your Semester:",
        reply_markup=reply_markup
    )
    return GET_SEM


async def get_sem(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores Semester and shows department options."""
    query = update.callback_query
    await query.answer()
    
    sem = query.data
    context.user_data["sem"] = sem
    
    reg = context.user_data['regulation']
    year = context.user_data['year']
    
    departments = {
        'CE': 'Civil Engineering (CE)',
        'EEE': 'Electrical & Electronics Engineering (EEE)',
        'ME': 'Mechanical Engineering (MECH)',
        'ECE': 'Electronics & Communication Engineering (ECE)',
        'CSE': 'Computer Science & Engineering (CSE)',
        'CSE-AI': 'Computer Science & Engineering - Artificial Intelligence (CSE-AI)',
        'CSE-DS': 'Computer Science & Engineering - Data Science (CSE-DS)',
        'CSE-CS': 'Computer Science & Engineering - Cyber Security (CSE-CS)',
        'CSE-NW': 'Computer Science & Engineering - Networks (CSE-Networks)',
        'CSE-AI&ML': 'Computer Science & Engineering - Artificial Intelligence & Machine Learning (CSE-AI & ML)',
        'CSE-IOT': 'Computer Science & Engineering - IOT (CSE-IOT)',
        'CST': 'Computer Science & Technology (CST)',
        'CST-IT': 'Computer Science & Information Technology (CS-IT)',
        'IT': 'Information Technology (IT)'
    }
    
    keyboard = [[InlineKeyboardButton(v, callback_data=k)] for k, v in departments.items()]
        
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text=f"✅ Selections complete:\n"
             f"Regulation: {reg}\n"
             f"Year: {year}\n"
             f"Semester: {sem}\n\n"
             f"Please choose your department:",
        reply_markup=reply_markup
    )
    return GET_OPTION


async def get_option(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores chosen department and asks for Roll Number."""
    query = update.callback_query
    await query.answer()
    
    department_code = query.data
    context.user_data['department_code'] = department_code
    
    await query.edit_message_text(text=f"You selected: {department_code}")
        
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="Great. Now, please enter your Roll Number:"
    )
    return GET_ROLL


async def get_roll(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the roll number and asks for confirmation."""
    roll = update.message.text.strip()
    context.user_data["roll"] = roll
    
    keyboard = [
        [
            InlineKeyboardButton("Yes", callback_data="roll_ok"),
            InlineKeyboardButton("No", callback_data="roll_no"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"Roll entered: {roll}\nIs this correct?",
        reply_markup=reply_markup
    )
    return CONFIRM_ROLL


async def confirm_roll(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Confirms Roll Number and asks for Date of Birth."""
    query = update.callback_query
    await query.answer()
    
    if query.data == "roll_ok":
        await query.edit_message_text(text=f"Roll number {context.user_data['roll']} confirmed.")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text="Finally, please enter your Date of Birth (YYYY-MM-DD):"
        )
        return GET_DOB
    else:
        await query.edit_message_text(text="Okay, please enter your Roll Number again:")
        return GET_ROLL


async def get_dob(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the Date of Birth and asks for confirmation."""
    dob = update.message.text.strip()
    context.user_data["dob"] = dob
    
    keyboard = [
        [
            InlineKeyboardButton("Yes", callback_data="dob_ok"),
            InlineKeyboardButton("No", callback_data="dob_no"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"Date of Birth entered: {dob}\nIs this correct?",
        reply_markup=reply_markup
    )
    return CONFIRM_DOB


async def confirm_dob(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Confirms DOB, processes results, and ends conversation."""
    query = update.callback_query
    await query.answer()
    
    if query.data == "dob_ok":
        await query.edit_message_text(text=f"Date of Birth {context.user_data['dob']} confirmed.")
        
        # Get all the data collected and stored in context
        roll = context.user_data.get("roll")
        dob = context.user_data.get("dob")
        department_code = context.user_data.get("department_code")
        regulation = context.user_data.get("regulation")
        year = context.user_data.get("year")
        sem = context.user_data.get("sem")

        # Final data list to pass to the processing function
        all_collected_data = [None, roll, dob, department_code, regulation, year, sem]
        
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text="✅ **All data collected!**\n\n"
                 f"Processing your request...\n\n"
                 "Please wait...",
            parse_mode="Markdown"
        )
        
        try:
            # Import bot_work only when needed to avoid circular imports
            from resutbot import bot_work
            
            results = bot_work(all_collected_data)
            
            if isinstance(results, str) and results.endswith('.png'):
                logger.info(f"Sending photo: {results}")
                await context.bot.send_photo(
                    chat_id=update.effective_chat.id,
                    photo=open(results, 'rb'),
                    caption="Here is your result."
                )
            else:
                logger.info(f"Sending text result: {results}")
                await context.bot.send_message(
                    chat_id=update.effective_chat.id,
                    text=results,
                    parse_mode="HTML"
                )
                
        except Exception as e:
            logger.error(f"Error in bot_work function: {e}", exc_info=True)
            await context.bot.send_message(
                chat_id=update.effective_chat.id,
                text="Sorry, an error occurred while processing your results."
            )
        
        context.user_data.clear()
        return ConversationHandler.END
    
    else: 
        await query.edit_message_text(text="Okay, please enter your Date of Birth again (YYYY-MM-DD):")
        return GET_DOB


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancels and ends the conversation."""
    await update.message.reply_text(
        "Results check cancelled. Type /resultscheck to begin again."
    )
    context.user_data.clear()
    return ConversationHandler.END


def setup_handlers(application: Application) -> None:
    """Setup all handlers for the bot."""
    # Setup ConversationHandler for /resultscheck
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("resultscheck", resultscheck)],
        states={
            GET_REGULATION: [CallbackQueryHandler(get_regulation, pattern="^reg_")],
            GET_YEAR: [CallbackQueryHandler(get_year, pattern=r"^(1|2|3|4)$")],
            GET_SEM: [CallbackQueryHandler(get_sem, pattern=r"^(1|2)$")],
            GET_OPTION: [CallbackQueryHandler(get_option, pattern=r"^\d+$")],
            GET_ROLL: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_roll)],
            CONFIRM_ROLL: [CallbackQueryHandler(confirm_roll, pattern="^roll_")],
            GET_DOB: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_dob)],
            CONFIRM_DOB: [CallbackQueryHandler(confirm_dob, pattern="^dob_")],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
    
    application.add_handler(conv_handler)
    
    # Add Simple Handlers
    application.add_handler(CommandHandler('start', start))
    application.add_handler(CommandHandler('examtimetable', examtimetable))
    
    # Handler for /examtimetable buttons
    application.add_handler(CallbackQueryHandler(button, pattern=r"^(R23|R20|R18)$"))
