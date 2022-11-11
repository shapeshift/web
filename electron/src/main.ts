import isDev from 'electron-is-dev'
import log from 'electron-log'
import { app, nativeTheme } from 'electron'
import * as Sentry from '@sentry/electron'
import { config as dotenvConfig } from 'dotenv'
import { startUpdaterListeners } from './updaterListeners'
import fs from 'fs'
import { PLUGIN } from './helpers/kk-state-controller'
import {
  isWin,
  kkAutoLauncher,
  kkStateController,
  settings
} from './globalState'
import { startIpcListeners } from './ipcListeners'
import { startAppListeners } from './appListeners'
import { queueIpcEvent, watchForDeviceBusy } from './helpers/utils'

if (!app.requestSingleInstanceLock()) app.quit()

log.transports.file.level = 'debug'

Sentry.init({ dsn: process.env.SENTRY_DSN })

watchForDeviceBusy()

dotenvConfig()

startAppListeners()
startIpcListeners()
startUpdaterListeners()


//Auto launch on startup
if (!isDev && settings.shouldAutoLunch) {
  kkAutoLauncher.enable()
  kkAutoLauncher.isEnabled().then(function (isEnabled) {
    if (isEnabled) {
      return
    }
    kkAutoLauncher.enable()
  })
}

try {
  if (isWin && nativeTheme.shouldUseDarkColors === true) {
    fs.unlinkSync(
      require('path').join(app.getPath('userData'), 'DevTools Extensions')
    )
  }
} catch (_) {}

if (process.defaultApp) {
  app.setAsDefaultProtocolClient('keepkey')
}

watchForDeviceBusy()
