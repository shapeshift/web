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
import { app, BrowserWindow, nativeTheme, ipcMain, shell } from 'electron'
import usb from 'usb'
import AutoLaunch from 'auto-launch'
import axios from 'axios'
log.transports.file.level = "debug";
autoUpdater.logger = log;

let {
    getConfig,
    innitConfig,
    getWallets,
} = require("keepkey-config")

// eslint-disable-next-line react-hooks/rules-of-hooks

const Unchained = require('openapi-client-axios').default;


import fs from 'fs'
//Modules
import { update_keepkey_status } from './keepkey'
import { bridgeRunning, keepkey, start_bridge, stop_bridge } from './bridge'
import { shared } from './shared'
import { createTray } from './tray'
import { isWin, isLinux, isMac, ALLOWED_HOSTS } from './constants'
import { db } from './db'
import { getDevice } from './wallet'
import { Keyring, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { pairWalletConnect } from './connect'
import { Settings } from './settings'

export const settings = new Settings()

// dont allow muliple windows to open
const instanceLock = app.requestSingleInstanceLock();


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
let skipUpdateCheckCompleted = false


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

    console.log(settings)
    if (!bridgeRunning && settings.shouldAutoStartBridge) start_bridge(settings.bridgeApiPort)
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
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // offscreen: true,
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

    windows.mainWindow.removeAllListeners('closed')
    windows.mainWindow.removeAllListeners('ready-to-show')
    ipcMain.removeAllListeners('@wallet/connected')

    windows.mainWindow.on('closed', (event) => {
        if (windows.mainWindow) {
            windows.mainWindow.destroy()
            windows.mainWindow = undefined
        }
    })

    windows.mainWindow.once('ready-to-show', () => {
        shouldShowWindow = true;
        if (windows.mainWindow) windows.mainWindow.webContents.send('setKeepKeyState', { state: keepkey.STATE })
        if (windows.mainWindow) windows.mainWindow.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
        if (skipUpdateCheckCompleted) windows.mainWindow?.show()
    });

    ipcMain.on('@wallet/connected', (event, data) => {
        resolve(true)
    })

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


app.setAsDefaultProtocolClient('keepkey')
// Export so you can access it from the renderer thread

app.on('ready', async () => {
    try {
        createTray()
    } catch (e) {
        log.error('Failed to create tray! e: ', e)
    }

    createSplashWindow()
    settings.loadSettingsFromDb().then(async () => {
        if (!windows.splash) return
        if (isDev || isLinux) skipUpdateCheck(windows.splash)
        if (!isDev && !isLinux) await autoUpdater.checkForUpdates()
    })
})

if (!instanceLock) {
    app.quit();
} else {
    app.on("second-instance", (event, argv, workingDirectory) => {
        if (windows.mainWindow) {
            if (windows.mainWindow.isDestroyed()) {
                createWindow();
            } else if (windows.mainWindow.isMinimized()) {
                windows.mainWindow.restore();
            }
            windows.mainWindow.focus();
        } else {
            createWindow();
        }
    });
}

app.on('window-all-closed', () => {
    if (!bridgeRunning || !settings.shouldMinimizeToTray) app.quit()
})

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', async () => {
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
// C:\Users\amito\AppData\Local\Programs\keepkey-desktop\resources\app.asar\electron\dist
log.info("__dirname", __dirname)
ipcMain.on('@app/get-asset-url', (event, data) => {
    const assetUrl = !isDev ? `file://${path.resolve(__dirname, "../../build/", data.assetPath)}` : data.assetPath
    console.log('asset url', assetUrl)
    event.sender.send(`@app/get-asset-url-${data.nonce}`, { nonce: data.nonce, assetUrl })
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
    skipUpdateCheckCompleted = true
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
        await stop_bridge()
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@bridge/start', async event => {
    const tag = TAG + ' | onStartBridge | '
    try {
        if (!bridgeRunning) start_bridge(settings.bridgeApiPort)
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@connect/pair', async (event, data) => {
    const tag = TAG + ' | onPairWalletConnect | '
    try {
        pairWalletConnect(event, data)
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@app/start', async (event, data) => {
    const tag = TAG + ' | onStartApp | '
    try {
        log.info(tag, 'event: onStartApp: ', data)

        // let unchainedEth = new Unchained({
        //     definition:"https://dev-api.ethereum.shapeshift.com/swagger.json"
        // });
        //
        // //TODO moveme
        // await unchainedEth.init()
        //
        //
        // console.log("unchainedEth", unchainedEth);
        // // console.log("unchainedEth", unchainedEth.instance);
        //
        // //getNonce
        // let accountInfo = await unchainedEth.instance.GetAccount("0xfEb8bf56e554fc47639e5Ed9E1dAe21DfF69d6A9")
        // console.log("accountInfo: ",accountInfo)

        let accountInfo = await axios.get("https://dev-api.ethereum.shapeshift.com/api/v1/account/" + "0xfEb8bf56e554fc47639e5Ed9E1dAe21DfF69d6A9")
        console.log("accountInfo: ", accountInfo)

        //load DB
        try {
            log.info(tag, 2)
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
            // createTray(event)
        } catch (e) {
            log.error('Failed to create tray! e: ', e)
        }
        try {
            if (!bridgeRunning && settings.shouldAutoStartBridge) start_bridge(settings.bridgeApiPort)
        } catch (e) {
            log.error('Failed to start_bridge! e: ', e)
        }
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

usb.on('attach', function (device) {
    log.info('attach device: ', device)
    if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send('attach', { device })
    if (!bridgeRunning && settings.shouldAutoStartBridge) start_bridge(settings.bridgeApiPort)
    update_keepkey_status(event)
})

usb.on('detach', function (device) {
    log.info('detach device: ', device)
    if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send('detach', { device })
    //stop_bridge(event)
    update_keepkey_status(event)
})