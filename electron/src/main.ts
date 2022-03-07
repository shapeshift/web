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
import { autoUpdater } from 'electron-updater'
import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import usb from 'usb'
import AutoLaunch from 'auto-launch'

log.transports.file.level = "debug";
autoUpdater.logger = log;

let {
    getConfig,
    innitConfig,
    getWallets,
} = require("keepkey-config")

// eslint-disable-next-line react-hooks/rules-of-hooks

import fs from 'fs'
//Modules
import { update_keepkey_status } from './keepkey'
import { bridgeRunning, start_bridge, stop_bridge } from './bridge'
import { shared } from './shared'
import { createTray } from './tray'
import { isWin, isLinux, isMac } from './constants'
import { db } from './db'
import { getDevice } from './wallet'
import { Keyring, HDWallet } from '@shapeshiftoss/hdwallet-core'




const TAG = ' | MAIN | '



let CONFIG
let WALLETS
let CONTEXT
let isQuitting = false
let APPROVED_ORIGINS: string[] = []

let USER_APPROVED_PAIR: boolean
let USER_REJECT_PAIR: boolean
let skipUpdateTimeout: NodeJS.Timeout
let windowShowInterval: NodeJS.Timeout
let shouldShowWindow = false;


export const windows: {
    mainWindow: undefined | BrowserWindow,
    splash: undefined | BrowserWindow
} = {
    mainWindow: undefined,
    splash: undefined
}

const kkAutoLauncher = new AutoLaunch({
    name: 'KeepKey Client'
})

/*
    Electron Settings
 */

try {
    if (isWin && nativeTheme.shouldUseDarkColors === true) {
        require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
    }
} catch (_) { }

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
    global.__statics = __dirname
}


function createWindow() {
    // const keyring = new Keyring()
    // getDevice(keyring).then((wallet) => {
    //     if (wallet instanceof Error) return
    //     // @ts-ignore
    //     wallet.btcGetAddress({
    //         addressNList: [2147483732, 2147483648, 2147483648, 0, 0],
    //         coin: 'Bitcoin',
    //         scriptType: 'p2wpkh',
    //         showDisplay: false
    //     }).then(console.log)
    // })
    /**
     * Menu Bar
     */
    log.info('Creating window!')

    //Auto launch on startup
    if (!isDev) {
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

    /**
     * Initial window options
     *
     * more options: https://www.electronjs.org/docs/api/browser-window
     */
    windows.mainWindow = new BrowserWindow({
        width: isDev ? 960 : 460,
        height: 780,
        show: false,
        backgroundColor: 'white',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true
        }
    })

    //TODO remove/ flag on dev
    if (isDev) windows.mainWindow.webContents.openDevTools()

    const startURL = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../../build/index.html')}`
    log.info('startURL: ', startURL)

    windows.mainWindow.loadURL(startURL)

    windows.mainWindow.on('closed', (event) => {
        if (windows.mainWindow) windows.mainWindow.destroy()
        stop_bridge(shared.eventIPC)
    })

    windows.mainWindow.once("ready-to-show", () => {
        shouldShowWindow = true;
    });

    db.findOne({ type: 'user' }, (err, doc) => {
        if (doc) shared.USER = doc.user
    })
}

app.setAsDefaultProtocolClient('keepkey')
// Export so you can access it from the renderer thread

app.on('ready', async () => {
    createSplashWindow()
    if (!windows.splash) return
    if (isDev || isLinux) skipUpdateCheck(windows.splash)
    if (!isDev && !isLinux) await autoUpdater.checkForUpdates()
})

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit()
    }
})

app.on('activate', () => {
    if (windows.mainWindow === null) {
        createWindow()
    }
})

app.on('before-quit', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isQuitting = true
})

autoUpdater.on("update-available", (info) => {
    if (!windows.splash) return
    windows.splash.webContents.send("@update/download", info);
    // skip the update if it takes more than 1 minute
    skipUpdateTimeout = setTimeout(() => {
        if (!windows.splash) return
        skipUpdateCheck(windows.splash);
    }, 60000);
});


autoUpdater.on("download-progress", (progress) => {
    let prog = Math.floor(progress.percent);
    if (windows.splash) windows.splash.webContents.send("@update/percentage", prog);
    if (windows.splash) windows.splash.setProgressBar(prog / 100);
    // stop timeout that skips the update
    if (skipUpdateTimeout) {
        clearTimeout(skipUpdateTimeout);
    }
});


autoUpdater.on("update-downloaded", () => {
    if (windows.splash) windows.splash.webContents.send("@update/relaunch");
    // stop timeout that skips the update
    if (skipUpdateTimeout) {
        clearTimeout(skipUpdateTimeout);
    }
    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 1000);
});


autoUpdater.on("update-not-available", () => {
    if (!windows.splash) return
    skipUpdateCheck(windows.splash);
});


autoUpdater.on("error", () => {
    if (!windows.splash) return
    skipUpdateCheck(windows.splash);
});


ipcMain.on('@account/tx-signed', async (event, data) => {
    const tag = TAG + ' | onSignedTx | '
    try {
        log.info(tag, 'event: onSignedTx: ', data)
        console.log("onSignedTx: ", data)
        shared.SIGNED_TX = data
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('@modal/close', async (event, data) => {
    if (!windows.mainWindow) return
    const tag = TAG + ' | onCloseModal | '
    try {
        windows.mainWindow.setAlwaysOnTop(false)
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('@account/info', async (event, data) => {
    const tag = TAG + ' | onAccountInfo | '
    try {
        console.log("data: ", data)
        if (data.length > 0 && shared.USER.accounts.length === 0) {
            shared.USER.online = true
            for (let i = 0; i < data.length; i++) {
                let entry = data[i]
                let caip = Object.keys(entry)
                let pubkey = entry[caip[0]]
                let entryNew: any = {
                    pubkey,
                    caip: caip[0]
                }
                //TODO parse this better
                if (entryNew.caip === 'eip155:1') {
                    entryNew.network = "ETH"
                }
                if (entryNew.caip === 'bip122:000000000019d6689c085ae165831e93') {
                    entryNew.network = "BTC"
                }
                shared.USER.accounts.push(entryNew)
            }
            db.findOne({ type: 'user' }, (err, doc) => {
                if (!doc) db.insert({ type: 'user', user: shared.USER })
                db.update({ type: 'user' }, { type: 'user', user: shared.USER })
            })
        }
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('@account/balance', async (event, data) => {
    const tag = TAG + ' | onBalanceInfo | '
    try {
        console.log("data: ", data)
        if (data.length > 0) {
            shared.USER.balances = data
        }
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on("@app/version", (event, _data) => {
    event.sender.send("@app/version", app.getVersion());
})

const skipUpdateCheck = (splash: BrowserWindow) => {
    createWindow();
    splash.webContents.send("@update/notfound");
    if (isLinux || isDev) {
        splash.webContents.send("@update/skipCheck");
    }
    // stop timeout that skips the update
    if (skipUpdateTimeout) {
        clearTimeout(skipUpdateTimeout);
    }
    windowShowInterval = setInterval(() => {
        if (shouldShowWindow) {
            if (windows.splash) splash.webContents.send("@update/launch");
            clearInterval(windowShowInterval);
            setTimeout(() => {
                if (windows.splash) splash.destroy();
                if (windows.mainWindow) windows.mainWindow.show();
            }, 800);
        }
    }, 1000);
}

const createSplashWindow = () => {
    windows.splash = new BrowserWindow({
        width: 300,
        height: 410,
        transparent: true,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    windows.splash.loadFile(
        path.join(__dirname, "../resources/splash/splash-screen.html")
    );
}


ipcMain.on('@bridge/stop', async event => {
    const tag = TAG + ' | onStartBridge | '
    try {
        stop_bridge(event)
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@bridge/start', async event => {
    const tag = TAG + ' | onStartBridge | '
    try {
        if (!bridgeRunning) start_bridge(event)
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@app/start', async (event, data) => {
    const tag = TAG + ' | onStartApp | '
    try {
        log.info(tag, 'event: onStartApp: ', data)

        //load DB
        try {
            db.find({}, function (err, docs) {
                for (let i = 0; i < docs.length; i++) {
                    let doc = docs[i]
                    APPROVED_ORIGINS.push(doc.origin)
                }
            });
            log.info(tag, "APPROVED_ORIGINS: ", APPROVED_ORIGINS)
            event.sender.send('loadOrigins', { payload: APPROVED_ORIGINS })
        } catch (e) {
            log.error("failed to load db: ", e)
        }

        try {
            //is there config
            let config = getConfig()
            console.log("config: ", config)

            if (!config) {
                //if not init
                await innitConfig()
                config = getConfig()
            }
            CONFIG = config

            //wallets
            WALLETS = await getWallets()

        } catch (e) {
            log.error('Failed to create tray! e: ', e)
        }

        //onStart
        try {
            update_keepkey_status(event)
        } catch (e) {
            log.error(e)
        }

        try {
            createTray(event)
        } catch (e) {
            log.error('Failed to create tray! e: ', e)
        }
        try {
            if (!bridgeRunning) start_bridge(event)
        } catch (e) {
            log.error('Failed to start_bridge! e: ', e)
        }

        usb.on('attach', function (device) {
            log.info('attach device: ', device)
            event.sender.send('attach', { device })
            if (!bridgeRunning) start_bridge(event)
            update_keepkey_status(event)
        })

        usb.on('detach', function (device) {
            log.info('detach device: ', device)
            event.sender.send('detach', { device })
            //stop_bridge(event)
            update_keepkey_status(event)
        })
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})
