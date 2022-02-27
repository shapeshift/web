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

import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import path from 'path'
import isDev from 'electron-is-dev'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { app, Menu, Tray, BrowserWindow, nativeTheme, ipcMain, nativeImage } from 'electron'
import usb from 'usb'
import AutoLaunch from 'auto-launch'
import swaggerUi from 'swagger-ui-express'
//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";
const isLinux =
    process.platform !== "darwin" && process.platform !== "win32";


log.transports.file.level = "debug";
autoUpdater.logger = log;

//core libs
let {
    getPaths
} = require('@pioneer-sdk/coins')

let {
    getConfig,
    innitConfig,
    getWallets
} = require("keepkey-config")

// eslint-disable-next-line react-hooks/rules-of-hooks
const adapter = NodeWebUSBKeepKeyAdapter.useKeyring(new Keyring())
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { Server } from 'http'
import fs from 'fs'

const appExpress = express()
appExpress.use(cors())
appExpress.use(bodyParser.urlencoded({ extended: false }))
appExpress.use(bodyParser.json())

//DB persistence

const dbDirPath = isDev ? path.join(__dirname, '../.KeepKey') : path.join(app.getPath('userData'), './.KeepKey')
const dbPath = path.join(dbDirPath, './db')

if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbDirPath)
    fs.closeSync(fs.openSync(dbPath, 'w'))
}

const Datastore = require('nedb')
    , db = new Datastore({ filename: dbPath, autoload: true });

const TAG = ' | KK-MAIN | '

let wait = require('wait-promise');
let sleep = wait.sleep;
let server: Server
let tray: Tray
let USER: {
    online: boolean,
    accounts: Array<{
        pubkey: any;
        caip: string;
    }>,
    balances: any[]
} = {
    online: false,
    accounts: [],
    balances: []
}
let STATE = 0
let USERNAME
let CONFIG
let WALLETS
let CONTEXT
let isQuitting = false
let eventIPC = {}
let APPROVED_ORIGINS: string[] = []

const assetsDirectory = path.join(__dirname, '../assets')
const EVENT_LOG: Array<{ read: { data: string } }> = []
let SIGNED_TX = null
let USER_APPROVED_PAIR: boolean
let USER_REJECT_PAIR: boolean
let skipUpdateTimeout: NodeJS.Timeout
let windowShowInterval: NodeJS.Timeout
let splash: BrowserWindow
let mainWindow: BrowserWindow
let shouldShowWindow = false;

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

const lightDark = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

const menuTemplate: any = [
    {
        label: 'Bridge Not Running',
        enabled: false,
        type: 'normal',
        icon: path.join(assetsDirectory, 'status/unknown.png')
    },
    { type: 'separator' },
    {
        label: 'Show App',
        click: function () {
            log.info('show App')
            if (mainWindow.isVisible()) {
                mainWindow.hide()
                app.dock.hide()
            } else {
                mainWindow.show()
                app.dock.hide()
            }
        }
    },
    { type: 'separator' },
    {
        label: 'Start Bridge',
        click: function () {
            start_bridge(eventIPC)
            log.info('start bridge!!')
        },
        enabled: true
    },
    {
        label: 'Stop Bridge',
        enabled: false,
        click: function () {
            log.info('stop bridge')
            stop_bridge(eventIPC)
        }
    },
    //
    { type: 'separator' },
    {
        label: 'Toggle App',
        click: function () {
            log.info('show App')
            if (mainWindow.isVisible()) {
                mainWindow.hide()
                app.dock.hide()
            } else {
                mainWindow.show()
                app.dock.hide()
            }
        }
    },
    {
        label: 'Disable Auto Launch',
        click: function () {
            log.info('show App')
            //kkAutoLauncher.disable()
        }
    },
    {
        label: 'Quit KeepKey Bridge',
        type: 'normal',
        click: function () {
            log.info('quit bridge')
            app.quit()
            process.exit(0)
        }
    }
]

const createTray = eventIpc => {
    eventIPC = eventIpc
    const trayIcon = `${lightDark}/keepKey/unknown.png`
    tray = new Tray(nativeImage.createFromPath(path.join(assetsDirectory, trayIcon)))
    const contextMenu = Menu.buildFromTemplate(menuTemplate)
    tray.setContextMenu(contextMenu)
}

const updateMenu = status => {
    let icon = 'unknown'
    // eslint-disable-next-line default-case
    switch (status) {
        case -1:
            menuTemplate[0].label = 'Error'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/error.png')
            icon = 'error'
            break
        case 0:
            menuTemplate[0].label = 'Initializing'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/unknown.png')
            icon = 'unknown'
            break
        case 1:
            menuTemplate[0].label = 'No Devices'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/unknown.png')
            icon = 'unknown'
            break
        case 2:
            menuTemplate[0].label = 'Bridge Not Running'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/unknown.png')
            icon = 'unknown'
            break
        case 3:
            menuTemplate[0].label = 'Bridge Running'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/success.png')
            menuTemplate[2].enabled = false
            menuTemplate[3].enabled = true
            icon = 'success'
            break
    }
    if (icon) {
        const updatedMenu = Menu.buildFromTemplate(menuTemplate)
        tray.setContextMenu(updatedMenu)
        tray.setImage(
            nativeImage.createFromPath(path.join(assetsDirectory, `${lightDark}/keepKey/${icon}.png`))
        )
    }
}

function createWindow() {
    /**
     * Menu Bar
     */
    log.info('Creating window!')

    //Auto launch on startup

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

    /**
     * Initial window options
     *
     * more options: https://www.electronjs.org/docs/api/browser-window
     */
    mainWindow = new BrowserWindow({
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
    if (isDev) mainWindow.webContents.openDevTools()

    const startURL = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../../build/index.html')}`
    log.info('startURL: ', startURL)

    mainWindow.loadURL(startURL)

    mainWindow.on('closed', (event) => {
        mainWindow.destroy()
        stop_bridge(eventIPC)
    })

    mainWindow.once("ready-to-show", () => {
        shouldShowWindow = true;
    });
    // mainWindow.on("closed", () => {

    // });
}

app.setAsDefaultProtocolClient('keepkey')
// Export so you can access it from the renderer thread

app.on('ready', async () => {
    createSplashWindow()
    if (isDev || isLinux) skipUpdateCheck(splash)
    if (!isDev && !isLinux) await autoUpdater.checkForUpdates()
})

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

app.on('before-quit', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isQuitting = true
})

autoUpdater.on("update-available", (info) => {
    splash.webContents.send("@update/download", info);
    // skip the update if it takes more than 1 minute
    skipUpdateTimeout = setTimeout(() => {
        skipUpdateCheck(splash);
    }, 60000);
});


autoUpdater.on("download-progress", (progress) => {
    let prog = Math.floor(progress.percent);
    splash.webContents.send("@update/percentage", prog);
    splash.setProgressBar(prog / 100);
    // stop timeout that skips the update
    if (skipUpdateTimeout) {
        clearTimeout(skipUpdateTimeout);
    }
});


autoUpdater.on("update-downloaded", () => {
    splash.webContents.send("@update/relaunch");
    // stop timeout that skips the update
    if (skipUpdateTimeout) {
        clearTimeout(skipUpdateTimeout);
    }
    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 1000);
});


autoUpdater.on("update-not-available", () => {
    skipUpdateCheck(splash);
});


autoUpdater.on("error", () => {
    skipUpdateCheck(splash);
});


ipcMain.on('onSignedTx', async (event, data) => {
    const tag = TAG + ' | onSignedTx | '
    try {
        log.info(tag, 'event: onSignedTx: ', data)
        console.log("onSignedTx: ", data)
        SIGNED_TX = data
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('onApproveOrigin', async (event, data) => {
    const tag = TAG + ' | onApproveOrigin | '
    try {
        log.info(tag, "data: ", data)

        //Approve Origin
        APPROVED_ORIGINS.push(data.origin)
        USER_APPROVED_PAIR = true
        //save to db
        let doc = {
            origin: data.origin,
            added: new Date().getTime(),
            isVerified: false
        }
        db.insert(doc, function (err, resp) {
            if (err) log.error("err: ", err)
            log.info("saved origin: ", resp)
        })
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('onRejectOrigin', async (event, data) => {
    const tag = TAG + ' | onRejectOrigin | '
    try {
        log.info(tag, "data: ", data)

        USER_REJECT_PAIR = true
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('onCloseModal', async (event, data) => {
    const tag = TAG + ' | onCloseModal | '
    try {
        mainWindow.setAlwaysOnTop(false)
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('onAccountInfo', async (event, data) => {
    const tag = TAG + ' | onAccountInfo | '
    try {
        console.log("data: ", data)
        if (data.length > 0 && USER.accounts.length === 0) {
            USER.online = true
            for (let i = 0; i < data.length; i++) {
                let entry = data[i]
                let caip = Object.keys(entry)
                let pubkey = entry[caip[0]]
                let entryNew = {
                    pubkey,
                    caip: caip[0]
                }
                USER.accounts.push(entryNew)
            }
        }
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

ipcMain.on('onBalanceInfo', async (event, data) => {
    const tag = TAG + ' | onBalanceInfo | '
    try {
        console.log("data: ", data)
        if (data.length > 0) {
            USER.balances = data
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
            splash.webContents.send("@update/launch");
            clearInterval(windowShowInterval);
            setTimeout(() => {
                splash.destroy();
                mainWindow.show();
            }, 800);
        }
    }, 1000);
}

const createSplashWindow = () => {
    splash = new BrowserWindow({
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
    splash.loadFile(
        path.join(__dirname, "../resources/splash/splash-screen.html")
    );
}



/*
 
  KeepKey Status codes
 
  state : status
  ---------------
     -1 : error
      0 : preInit
      1 : no devices
      2 : device connected
      3 : bridge online
 
 
 */

let STATUS = 'preInit'

const start_bridge = async function (event) {
    let tag = " | start_bridge | "
    try {
        let device
        try {
            device = await adapter.getDevice()
            log.info(tag, "device: ", device)
        } catch (e) {
            STATE = 1
            STATUS = `no devices`
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
            log.info(tray)
        }

        let transport
        if (device) {
            transport = await adapter.getTransportDelegate(device)
            await transport.connect?.()
            log.info(tag, "transport: ", transport)

            STATE = 2
            STATUS = 'keepkey connected'
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
        } else {
            log.info('Can not start! waiting for device connect')
        }

        let API_PORT = process.env['API_PORT_BRIDGE'] || '1646'

        /*
            KeepKey bridge
    
            endpoints:
              raw i/o keepkey bridge:
              status:
              pubkeys:
              sign:
    
    
         */

        //docs
        appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        //swagger.json
        appExpress.use('/spec', express.static(path.join(__dirname, '../api/dist')));

        //status
        appExpress.all('/status', async function (req, res, next) {
            try {
                if (req.method === 'GET') {
                    res.status(200).json({
                        success: true,
                        username: USERNAME,
                        status: STATUS,
                        state: STATE
                    })
                }
                next()
            } catch (e) {
                throw e
            }
        })

        /*
            Protected endpoint middleware
            Only allow approved applications collect data
    
            all routes below are protected
         */
        //TODO
        // let authChecker = (req, res, next) => {
        //   console.log("header: ",req.headers);
        //   const host = req.headers.host;
        //   let origin = req.headers.origin;
        //   const referer = req.headers.referer;
        //   if(!origin) origin = referer
        //   console.log("origin: ",origin);
        //   console.log("host: ",host);
        //   if(!origin) {
        //     res.status(400).json("Unable to determine origin!")
        //   } else if(APPROVED_ORIGINS.indexOf(origin) >= 0){
        //     console.log("Approved origin!")
        //     next();
        //   } else {
        //     event.sender.send('approveOrigin', { origin })
        //   }
        // };
        // appExpress.use(authChecker);

        if (device) {
            appExpress.all('/exchange/device', async function (req, res, next) {
                try {
                    if (req.method === 'GET') {
                        let resp = await transport.readChunk()
                        let output = {
                            data: Buffer.from(resp).toString('hex')
                        }
                        log.info('output: ', output)
                        EVENT_LOG.push({ read: output })
                        event.sender.send('dataSent', { output })
                        if (res.status) res.status(200).json(output)
                    } else if (req.method === 'POST') {
                        let body = req.body
                        let msg = Buffer.from(body.data, 'hex')
                        transport.writeChunk(msg)
                        log.info('input: ', msg.toString('hex'))
                        // EVENT_LOG.push({ write: output })
                        event.sender.send('dataReceive', { output: msg })
                        res.status(200).json({})
                    } else {
                        throw Error('unhandled')
                    }
                    next()
                } catch (e) {
                    throw e
                }
            })
        } else {
            appExpress.all('/exchange/device', async function (req, res, next) {
                try {
                    res.status(200).json({
                        success: false,
                        msg: "Device not connected!"
                    })
                    next()
                } catch (e) {
                    throw e
                }
            })
        }


        //userInfo
        appExpress.all('/user', async function (req, res, next) {
            try {
                if (req.method === 'GET') {
                    res.status(200).json(USER)
                }
                next()
            } catch (e) {
                throw e
            }
        })

        //sign
        appExpress.all('/sign', async function (req, res, next) {
            try {
                console.log("checkpoint1: ")
                if (req.method === 'POST') {
                    let body = req.body
                    console.log("body: ", body)
                    mainWindow.setAlwaysOnTop(true)
                    if (!mainWindow.isVisible()) {
                        mainWindow.show()
                        app.dock.show()
                    }
                    event.sender.send('signTx', { payload: body })
                    //hold till signed
                    while (!SIGNED_TX) {
                        console.log("waiting!")
                        await sleep(300)
                    }
                    res.status(200).json({ success: true, status: 'signed', signedTx: SIGNED_TX })
                    SIGNED_TX = null
                }
                next()
            } catch (e) {
                throw e
            }
        })

        //catchall
        appExpress.use((req, res, next) => {
            const status = 500, message = 'something went wrong. ', data = {}
            //log.info(req.body, { status: status, message: message, data: data })
            try {
                res.status(status).json({ message, data })
            } catch (e) { }
        })

        //port
        try {
            server = appExpress.listen(API_PORT, () => {
                event.sender.send('playSound', { sound: 'success' })
                log.info(`server started at http://localhost:${API_PORT}`)
                STATE = 3
                STATUS = 'bridge online'
                event.sender.send('setKeepKeyState', { state: STATE })
                event.sender.send('setKeepKeyStatus', { status: STATUS })
                updateMenu(STATE)
            })
        } catch (e) {
            event.sender.send('playSound', { sound: 'fail' })
            STATE = -1
            STATUS = 'bridge error'
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
            updateMenu(STATE)
            log.info('e: ', e)
        }

    } catch (e) {
        log.error(e)
    }
}

const stop_bridge = async (event) => {
    try {
        event.sender.send('playSound', { sound: 'fail' })
        log.info('server: ', server)
        server.close(() => {
            log.info('Closed out remaining connections')
            STATE = 2
            STATUS = 'device connected'
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
            updateMenu(STATE)
        })
    } catch (e) {
        log.error(e)
    }
}

ipcMain.on('onStopBridge', async event => {
    const tag = TAG + ' | onStartBridge | '
    try {
        stop_bridge(event)
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('onStartBridge', async event => {
    const tag = TAG + ' | onStartBridge | '
    try {
        start_bridge(event)
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('onStartApp', async (event, data) => {
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
            let allDevices = await usb.getDeviceList()
            log.info(tag, "allDevices: ", allDevices)

            let resultWebUsb = await usb.findByIds(11044, 2)
            if (resultWebUsb) {
                log.info(tag, "KeepKey connected in webusb!")
                //get version
            }

            let resultPreWebUsb = await usb.findByIds(11044, 1)
            if (resultPreWebUsb) {
                log.info(tag, "update required!")
            }

            let resultUpdater = await usb.findByIds(11044, 1)
            if (resultUpdater) {
                log.info(tag, "UPDATER MODE DETECTED!")
            }
        } catch (e) {
            log.error(e)
        }

        try {
            createTray(event)
        } catch (e) {
            log.error('Failed to create tray! e: ', e)
        }
        try {
            start_bridge(event)
        } catch (e) {
            log.error('Failed to start_bridge! e: ', e)
        }

        usb.on('attach', function (device) {
            log.info('attach device: ', device)
            event.sender.send('attach', { device })
            start_bridge(event)
        })

        usb.on('detach', function (device) {
            log.info('detach device: ', device)
            event.sender.send('detach', { device })
            //stop_bridge(event)
        })
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})
