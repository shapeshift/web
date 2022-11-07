import path from 'path'
import isDev from 'electron-is-dev'
import log from 'electron-log'
import { app, BrowserWindow, nativeTheme, ipcMain, shell, IpcMainEvent } from 'electron'
import AutoLaunch from 'auto-launch'
import * as Sentry from "@sentry/electron";
import { config as dotenvConfig } from 'dotenv'
import { Settings } from './helpers/settings'
import { setupAutoUpdater, skipUpdateCheckCompleted } from './helpers/updater'
import fs from 'fs'
import { CONNECTED, DISCONNECTED, HARDWARE_ERROR, KKStateController, PLUGIN } from './helpers/kk-state-controller'
import { createAndUpdateTray } from './tray'
import { downloadFirmware, getLatestFirmwareData, loadFirmware } from './helpers/kk-state-controller/firmwareUtils'
import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { RegisterRoutes } from './helpers/routes/routes'
import { deviceBusyRead, deviceBusyWrite } from './helpers/controllers/b-device-controller'
import { ALLOWED_HOSTS, db, ipcQueue, isWin, renderListenersReady, server, setRenderListenersReady, setServer, setTcpBridgeClosing, setTcpBridgeRunning, setTcpBridgeStarting, tcpBridgeClosing, tcpBridgeRunning, tcpBridgeStarting, windows } from './helpers/globalState'
import { startIpcListeners } from './ipcListeners'
import { startAppListeners } from './appListeners'
import { startMainWindowListeners } from './mainWindowListeners'

export const shared: {
    USER: userType,
    eventIPC: IpcMainEvent | null,
    KEEPKEY_FEATURES: Record<string, unknown>
} = {
    USER: {
        online: false,
        accounts: [],
        balances: []
    },
    eventIPC: null,
    KEEPKEY_FEATURES: {},
}

export type userType = {
    online: boolean,
    accounts: Array<{
        pubkey: any;
        caip: string;
    }>,
    balances: any[]
}

// to keep track of device becomes busy or unbusy
let lastDeviceBusyRead = false
let lastDeviceBusyWrite = false

// tcp bridge running and keepkey is successfully connected
export let isWalletBridgeRunning = () => kkStateController?.lastState === CONNECTED && tcpBridgeRunning

export const queueIpcEvent = (eventName: string, args: any) => {
    if (!renderListenersReady || !windows?.mainWindow || windows.mainWindow.isDestroyed()) {
        return ipcQueue.push({ eventName, args })
    }
    else {
        return windows.mainWindow.webContents.send(eventName, args)
    }
}

// hack to detect when the keepkey is busy so we can be careful not to do 2 things at once
setInterval( () => {
    // busy state has changed somehow
    if(lastDeviceBusyRead !== deviceBusyRead || lastDeviceBusyWrite !== deviceBusyWrite)
    {
        if(deviceBusyRead === false && deviceBusyWrite === false) {
            queueIpcEvent('deviceNotBusy', {})
        } else {
            queueIpcEvent('deviceBusy', {})
        }
    }
    lastDeviceBusyRead = deviceBusyRead
    lastDeviceBusyWrite = deviceBusyWrite
}, 1000)

export const startTcpBridge = async (port?: number) => {
    if (tcpBridgeRunning || tcpBridgeStarting) return
    setTcpBridgeStarting(true)
    let API_PORT = port || 1646

    const appExpress = express()
    appExpress.use(cors())
    appExpress.use(bodyParser.urlencoded({ extended: true }))
    appExpress.use(bodyParser.json())

    const swaggerDocument = require(path.join(__dirname, '../api/dist/swagger.json'))
    if (!swaggerDocument) throw Error("Failed to load API SPEC!")

    appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    //swagger.json
    appExpress.use('/spec', express.static(path.join(__dirname, '../../api/dist')));

    RegisterRoutes(appExpress);

    await new Promise( (resolve) =>  setServer(appExpress.listen(API_PORT, () => resolve(true))))
    log.info(`Tcp bridge started at http://localhost:${API_PORT}`)

    setTcpBridgeStarting(false)
    setTcpBridgeRunning(true)
    createAndUpdateTray()
}

export const stopTcpBridge = async () => {
    if(tcpBridgeClosing) return false
    setTcpBridgeClosing(true)
    await new Promise(async (resolve) => {
        createAndUpdateTray()
        if(server) {
            server?.close(async () => {
                await kkStateController.transport?.disconnect()
                setTcpBridgeRunning(false)
                setTcpBridgeClosing(false)
                createAndUpdateTray()
                resolve(true)
            })
        } else {
            await kkStateController.transport?.disconnect()
            setTcpBridgeRunning(false)
            setTcpBridgeClosing(false)
            createAndUpdateTray()
            resolve(true)
        }
    })
    return true
}

dotenvConfig()

log.transports.file.level = "debug";
setupAutoUpdater()

Sentry.init({ dsn: process.env.SENTRY_DSN });

export const settings = new Settings()

// dont allow muliple windows to open
if (!app.requestSingleInstanceLock()) app.quit()

export let shouldShowWindow = false;

export const kkAutoLauncher = new AutoLaunch({
    name: 'KeepKey Desktop'
})

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
}


try {
    if (isWin && nativeTheme.shouldUseDarkColors === true) {
        // require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
        fs.unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
    }
} catch (_) { }

if (process.defaultApp) {
    app.setAsDefaultProtocolClient('keepkey')
}

const onKKStateChange = async (eventName: string, args: any) => {
    // try to start the tcp bridge if not already running
    if (eventName === CONNECTED) await startTcpBridge()
    else if (eventName === DISCONNECTED || eventName === HARDWARE_ERROR)  await stopTcpBridge()
    createAndUpdateTray()
    return queueIpcEvent(eventName, args)
}

export const kkStateController = new KKStateController(onKKStateChange)
// send a plugin event if its not unplugged
if(kkStateController.lastState !== 'DISCONNECTED')
    queueIpcEvent(PLUGIN, {})


export const createMainWindow = () => new Promise<boolean>(async (resolve, reject) => {
    try {
        await kkStateController.syncState()
    } catch (e: any) {
        if (e.toString().includes('claimInterface error')) {
            windows?.splash?.webContents.send("@update/errorClaimed")
            await new Promise( () => 0 )
        } else {
            windows?.splash?.webContents.send("@update/errorReset")
            await new Promise( () => 0 )
        }
    }

    if (settings.shouldAutoStartBridge) await startTcpBridge(settings.bridgeApiPort)

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

    db.findOne({ type: 'user' }, (err, doc) => {
        if (doc) shared.USER = doc.user
    })

    if (isDev) windows.mainWindow.webContents.openDevTools()

    const startURL = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../../build/index.html')}`

    windows.mainWindow.loadURL(startURL)

    startMainWindowListeners()
})

startAppListeners()
startIpcListeners()