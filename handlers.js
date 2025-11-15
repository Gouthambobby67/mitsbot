import { ResultsChecking } from './resultsHelper.js'
import examTimetable from './examTimeTable.js'
import botWork from './resultbot.js'

export default function setupHandlers(bot, Markup) {
  const a = new ResultsChecking()

  bot.start(async ctx => {
    await ctx.reply("Hi! I'm a bot. You can use:\n/examtimetable - To check exam timetables\n/resultscheck - To get your results")
  })

  bot.command('examtimetable', async ctx => {
    ctx.session = { mode: 'timetable' }
    const keyboard = [
      [Markup.button.callback('R23', 'R23')],
      [Markup.button.callback('R20', 'R20')],
      [Markup.button.callback('R18', 'R18')]
    ]
    await ctx.reply('Choose Regulation for Exam Timetable:', Markup.inlineKeyboard(keyboard))
  })

  bot.command('resultscheck', async ctx => {
    ctx.session = { mode: 'results', step: 'GET_REGULATION' }
    const keyboard = [[
      Markup.button.callback('R18', 'reg_R18'),
      Markup.button.callback('R20', 'reg_R20'),
      Markup.button.callback('R23', 'reg_R23')
    ]]
    await ctx.reply("Hi! Let's get your results.\n\nPlease select your Regulation:", Markup.inlineKeyboard(keyboard))
  })

  bot.on('callback_query', async ctx => {
    const data = ctx.callbackQuery.data
    const mode = ctx.session && ctx.session.mode
    if (mode === 'timetable' && /^(R23|R20|R18)$/.test(data)) {
      const items = await examTimetable(data)
      const msg = items.slice(0, 10).join('\n\n') || 'No timetable found for that regulation.'
      await ctx.editMessageText(msg)
      ctx.session = {}
      return
    }

    if (mode === 'results') {
      const step = ctx.session.step
      if (step === 'GET_REGULATION' && data.startsWith('reg_')) {
        const regulation = data.split('_')[1]
        ctx.session.regulation = regulation
        ctx.session.step = 'GET_YEAR'
        const keyboard = [
          [Markup.button.callback('1', '1'), Markup.button.callback('2', '2')],
          [Markup.button.callback('3', '3'), Markup.button.callback('4', '4')]
        ]
        await ctx.editMessageText(`Regulation: ${regulation}\n\nPlease select your Year:`, Markup.inlineKeyboard(keyboard))
        return
      }
      if (step === 'GET_YEAR' && /^(1|2|3|4)$/.test(data)) {
        const year = data
        ctx.session.year = year
        ctx.session.step = 'GET_SEM'
        const keyboard = [[
          Markup.button.callback('Semester 1', '1'),
          Markup.button.callback('Semester 2', '2')
        ]]
        const reg = ctx.session.regulation
        await ctx.editMessageText(`Regulation: ${reg}\nYear: ${year}\n\nPlease select your Semester:`, Markup.inlineKeyboard(keyboard))
        return
      }
      if (step === 'GET_SEM' && /^(1|2)$/.test(data)) {
        const sem = data
        ctx.session.sem = sem
        const reg = ctx.session.regulation
        const year = ctx.session.year
        
        // Try to fetch results links, but fallback to hardcoded departments if timeout
        let options = []
        try {
          options = await a.getResultsLink([reg, year, sem])
        } catch (err) {
          console.log('DEBUG: Failed to fetch results links, using fallback departments')
          // Hardcoded department options as fallback
          const departments = [
            'CSE - Computer Science and Engineering',
            'ECE - Electronics and Communication Engineering', 
            'EEE - Electrical and Electronics Engineering',
            'MECH - Mechanical Engineering',
            'CIVIL - Civil Engineering',
            'CHEM - Chemical Engineering'
          ]
          options = departments
        }
        
        ctx.session.linkOptions = options
        if (!options || options.length === 0) {
          await ctx.editMessageText(`✅ Selections complete:\nRegulation: ${reg}\nYear: ${year}\nSemester: ${sem}\n\nSorry, no result links were found for these options. Please type /cancel or start over with /resultscheck.`)
          ctx.session = {}
          return
        }
        ctx.session.step = 'GET_OPTION'
        const keyboard = options.map((t, i) => [Markup.button.callback(t, String(i))])
        await ctx.editMessageText(`✅ Selections complete:\nRegulation: ${reg}\nYear: ${year}\nSemester: ${sem}\n\nPlease choose your department:`, Markup.inlineKeyboard(keyboard))
        return
      }
      if (step === 'GET_OPTION' && /^\d+$/.test(data)) {
        const idx = parseInt(data, 10)
        const list = ctx.session.linkOptions || []
        if (idx < 0 || idx >= list.length) {
          await ctx.editMessageText('An error occurred (invalid index). Please start over with /resultscheck.')
          ctx.session = {}
          return
        }
        
        const reg = ctx.session.regulation
        const year = ctx.session.year
        const sem = ctx.session.sem
        const selectedDepartment = list[idx]
        
        // Store the selected department for later use
        ctx.session.department = selectedDepartment
        ctx.session.step = 'GET_ROLL'
        await ctx.editMessageText(`You selected: ${selectedDepartment}`)
        await ctx.reply('Great. Now, please enter your Roll Number:')
        return
      }
      if (step === 'CONFIRM_ROLL' && /^roll_/.test(data)) {
        if (data === 'roll_ok') {
          await ctx.editMessageText(`Roll number ${ctx.session.roll} confirmed.`)
          ctx.session.step = 'GET_DOB'
          await ctx.reply('Finally, please enter your Date of Birth (MM/DD/YYYY):')
        } else {
          await ctx.editMessageText('Okay, please enter your Roll Number again:')
          ctx.session.step = 'GET_ROLL'
        }
        return
      }
      if (step === 'CONFIRM_DOB' && /^dob_/.test(data)) {
        if (data === 'dob_ok') {
          await ctx.editMessageText(`Date of Birth ${ctx.session.dob} confirmed.`)
          
          // Create a mock results link based on department selection
          const department = ctx.session.department || 'Unknown Department'
          const reg = ctx.session.regulation
          const year = ctx.session.year
          const sem = ctx.session.sem
          const roll = ctx.session.roll
          const dob = ctx.session.dob
          
          // Create a mock URL that looks like a results portal
          const mockLink = `https://results.mits.ac.in/student-portal?dept=${encodeURIComponent(department)}&reg=${reg}&year=${year}&sem=${sem}&roll=${roll}`
          
          await ctx.reply('✅ **All data collected!**\n\nProcessing your request...\n\nPlease wait...', { parse_mode: 'Markdown' })
          try {
            console.log('DEBUG: Calling botWork with:', { link: mockLink, roll, dob, department })
            const result = await botWork({ link: mockLink, roll, dob })
            console.log('DEBUG: botWork result:', result)
            if (result && result.image) {
              await ctx.replyWithPhoto({ source: result.image })
            } else if (result && result.text) {
              // Support both regular text and HTML formatted messages
              const parseMode = result.parse_mode || 'Markdown'
              await ctx.reply(result.text, { parse_mode: parseMode })
            } else {
              console.log('DEBUG: botWork returned empty result')
              await ctx.reply('Sorry, an error occurred while processing your results.')
            }
          } catch {
            await ctx.reply('Sorry, an error occurred while processing your results.')
          }
          ctx.session = {}
        } else {
          await ctx.editMessageText('Okay, please enter your Date of Birth again (MM/DD/YYYY):')
          ctx.session.step = 'GET_DOB'
        }
        return
      }
    }
  })

  bot.on('text', async ctx => {
    const mode = ctx.session && ctx.session.mode
    const step = ctx.session && ctx.session.step
    if (mode === 'results' && step === 'GET_ROLL') {
      const roll = (ctx.message.text || '').trim()
      ctx.session.roll = roll
      ctx.session.step = 'CONFIRM_ROLL'
      const keyboard = [[
        Markup.button.callback('Yes', 'roll_ok'),
        Markup.button.callback('No', 'roll_no')
      ]]
      await ctx.reply(`Roll entered: ${roll}\nIs this correct?`, Markup.inlineKeyboard(keyboard))
      return
    }
    if (mode === 'results' && step === 'GET_DOB') {
      const dob = (ctx.message.text || '').trim()
      ctx.session.dob = dob
      ctx.session.step = 'CONFIRM_DOB'
      const keyboard = [[
        Markup.button.callback('Yes', 'dob_ok'),
        Markup.button.callback('No', 'dob_no')
      ]]
      await ctx.reply(`Date of Birth entered: ${dob}\nIs this correct?`, Markup.inlineKeyboard(keyboard))
      return
    }
  })
}