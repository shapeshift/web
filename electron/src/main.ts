/**
 *
 * =====================================================================================
 *  =  ====  ===================  ====  ===================     ==  =====================
 *  =  ===  ====================  ===  ===================  ===  =  =====================
 *  =  ==  =====================  ==  ===================  =======  =================  ==
 *  =  =  =====   ===   ==    ==  =  =====   ==  =  =====  =======  =  ==   ==  = ==    =
 *  =     ====  =  =  =  =  =  =     ====  =  =  =  =====  =======  ====  =  =     ==  ==
 *  =  ==  ===     =     =  =  =  ==  ===     ==    =====  =======  =  =     =  =  ==  ==
 *  =  ===  ==  ====  ====    ==  ===  ==  =======  =====  =======  =  =  ====  =  ==  ==
 *  =  ====  =  =  =  =  =  ====  ====  =  =  =  =  ======  ===  =  =  =  =  =  =  ==  ==
 *  =  ====  ==   ===   ==  ====  ====  ==   ===   ========     ==  =  ==   ==  =  ==   =
 *  =====================================================================================
 *  KeepKey client
 *    - A companion application for the keepkey device
 *
 *  Features:
 *    * KeepKey bridge (express server on port: localhost:1646
 *    * invocation support (web app pairing similar UX to BEX embedding like Metamask)
 *
 *
 *  Notes:
 *    This will "pair" a users wallet with the pioneer api.
 *      Note: This is exporting a pubkey wallet of the users connected wallet and storing it service side
 *
 *    This pubkey wallet is also available to be read by any paired apikey
 *              (generally stored in an Web Applications local storage).
 *
 *    paired API keys allow any application to request payments from the users wallet
 *      * all payment requests are queued in this main process
 *          and must receive manual user approval before signing
 *
 *    P.S. use a keepkey!
 *                                                -Highlander
 */

import path from 'path'
import isDev from 'electron-is-dev'
import log from 'electron-log'
import { app, BrowserWindow, nativeTheme, ipcMain, shell } from 'electron'
import AutoLaunch from 'auto-launch'
import * as Sentry from "@sentry/electron";
import { config as dotenvConfig } from 'dotenv'
import { bridgeRunning, start_bridge } from './bridge'
import { shared } from './shared'
import { isWin, ALLOWED_HOSTS } from './constants'
import { db } from './db'
import { Settings } from './settings'
import { setupAutoUpdater, skipUpdateCheckCompleted } from './updater'
import fs from 'fs'

dotenvConfig()

log.transports.file.level = "debug";
setupAutoUpdater()

Sentry.init({ dsn: process.env.SENTRY_DSN });

export const settings = new Settings()

// dont allow muliple windows to open
if(!app.requestSingleInstanceLock()) app.quit()

const TAG = ' | MAIN | '

export let shouldShowWindow = false;


export const windows: {
    mainWindow: undefined | BrowserWindow,
    splash: undefined | BrowserWindow
} = {
    mainWindow: undefined,
    splash: undefined
}

export const kkAutoLauncher = new AutoLaunch({
    name: 'KeepKey Desktop'
})

try {
    if (isWin && nativeTheme.shouldUseDarkColors === true) {
        // require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
        fs.unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
    }
} catch (_) { }

if (process.defaultApp) {
    app.setAsDefaultProtocolClient('keepkey')
}

export const createWindow = () => new Promise<boolean>(async (resolve, reject) => {
    log.info('Creating window!')

    //Auto launch on startup
    if (!isDev && settings.shouldAutoLunch) {
        kkAutoLauncher.enable()
        kkAutoLauncher
            .isEnabled()
            .then(function (isEnabled) {
                if (isEnabled) {
                    return
                }
                kkAutoLauncher.enable()
            })
            .catch(function (e) {
                log.error('failed to enable auto launch: ', e)
            })
    }

    if (settings.shouldAutoStartBridge) await start_bridge(settings.bridgeApiPort)

    windows.mainWindow = new BrowserWindow({
        focusable: true,
        width: isDev ? 1960 : 960,
        height: 780,
        show: false,
        backgroundColor: 'white',
        autoHideMenuBar: true,
        webPreferences: {
            webviewTag: true,
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true
        }
    })

    if (isDev) windows.mainWindow.webContents.openDevTools()

    const startURL = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../../build/index.html')}`
    log.info('startURL: ', startURL)

    windows.mainWindow.loadURL(startURL)

    windows.mainWindow.removeAllListeners('closed')
    windows.mainWindow.removeAllListeners('ready-to-show')

    windows.mainWindow.on('closed', () => {
        if (windows.mainWindow) {
            windows.mainWindow.destroy()
            windows.mainWindow = undefined
        }
    })

    windows.mainWindow.once('ready-to-show', () => {
        shouldShowWindow = true;
        if (skipUpdateCheckCompleted) windows.mainWindow?.show()
    });

    db.findOne({ type: 'user' }, (err, doc) => {
        if (doc) shared.USER = doc.user
    })

    windows.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        let urlObj = new URL(url);
        let urlHost = urlObj.hostname;
        if (ALLOWED_HOSTS.includes(urlHost)) return { action: 'allow' }
        shell.openExternal(url);
        return { action: 'deny' }
    })

    windows.mainWindow.webContents.on("will-navigate", (event, url) => {
        let urlObj = new URL(url);
        let urlHost = urlObj.hostname;
        if (!ALLOWED_HOSTS.includes(urlHost)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
})

app.on("second-instance", async () => {
    if (windows.mainWindow) {
        if (windows.mainWindow.isDestroyed()) {
            await createWindow();
        } else if (windows.mainWindow.isMinimized()) {
            windows.mainWindow.restore();
        }
        windows.mainWindow.focus();
    } else {
        await createWindow();
    }
});

app.on('window-all-closed', () => {
    if (!bridgeRunning || !settings.shouldMinimizeToTray) app.quit()
})

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// C:\Users\amito\AppData\Local\Programs\keepkey-desktop\resources\app.asar\electron\dist
log.info("__dirname", __dirname)
ipcMain.on('@app/get-asset-url', (event, data) => {
    const assetUrl = !isDev ? `file://${path.resolve(__dirname, "../../build/", data.assetPath)}` : data.assetPath
    event.sender.send(`@app/get-asset-url-${data.nonce}`, { nonce: data.nonce, assetUrl })
})

ipcMain.on("@app/version", (event, _data) => {
    event.sender.send("@app/version", app.getVersion());
})
