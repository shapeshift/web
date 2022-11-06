import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { Device } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { Server } from 'http'
import { ipcMain, app } from 'electron'
import { db } from '../db'
import { RegisterRoutes } from './routes/routes'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
import { windows } from '../main'
import { IpcQueueItem } from './types'
import { CONNECTED, HARDWARE_ERROR, KKStateController, NEEDS_INITIALIZE, REQUEST_BOOTLOADER_MODE, UPDATE_BOOTLOADER, UPDATE_FIRMWARE } from './kk-state-controller'


const queueIpcEvent = (eventName: string, args: any) => {
    if (!renderListenersReady || !windows?.mainWindow || windows.mainWindow.isDestroyed()) {
        return ipcQueue.push({ eventName, args })
    }
    else {
        return windows.mainWindow.webContents.send(eventName, args)
    }
}

const Controller = new KKStateController(queueIpcEvent)

const appExpress = express()
appExpress.use(cors())
appExpress.use(bodyParser.urlencoded({ extended: true }))
appExpress.use(bodyParser.json())
import { downloadFirmware, getLatestFirmwareData, loadFirmware } from './kk-state-controller/firmwareUtils'
import { shared } from '../shared'
import { createAndUpdateTray } from '../tray'

//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

export let server: Server
export let bridgeRunning = false

export let bridgeClosing = false

let ipcQueue = new Array<IpcQueueItem>()

type MessageAndEvent = { ipcMessage: string, event: any }
export type KeepkeyState = {
    state: MessageAndEvent | undefined
    device: Device | undefined,
    transport: TransportDelegate | undefined,
    wallet: KeepKeyHDWallet | undefined
}

export const lastKnownKeepkeyState: KeepkeyState = {
    state: undefined,
    device: undefined,
    transport: undefined,
    wallet: undefined
}

let renderListenersReady = false

export const start_bridge = async (port?: number) => {
    if (bridgeRunning) return
    ipcMain.on('renderListenersReady', async () => {
        renderListenersReady = true
        ipcQueue.forEach((item, idx) => {
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send(item.eventName, item.args)
            ipcQueue.splice(idx, 1);
        })
    })
    let tag = " | start_bridge | "
    let API_PORT = port || 1646

    // send paired apps when requested
    ipcMain.on('@bridge/paired-apps', () => {
        db.find({ type: 'service' }, (err, docs) => {
            queueIpcEvent('@bridge/paired-apps', docs)
        })
    })

    // used only for implicitly pairing the KeepKey web app
    ipcMain.on(`@bridge/add-service`, (event, data) => {
        db.insert({
            type: 'service',
            isKeepKeyDesktop: true,
            addedOn: Date.now(),
            ...data
        })
    })

    // used for unpairing apps
    ipcMain.on(`@bridge/remove-service`, (event, data) => {
        db.remove({ ...data })
    })

    appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    //swagger.json
    appExpress.use('/spec', express.static(path.join(__dirname, '../../api/dist')));

    RegisterRoutes(appExpress);

    log.info(tag, "starting server! **** ")
    server = appExpress.listen(API_PORT, () => {
        log.info(`server started at http://localhost:${API_PORT}`)
    })

    try {
        await Controller.init()
    } catch (e) {
        log.error('failed to init controller, exiting', e)
        // This can be triggered if the keepkey is in a fucked state and gets stuck initializing and then they unplug.
        // We need to have them unplug and fully exit the app to fix it
        app.quit()
        process.exit()
    }

    ipcMain.on('@keepkey/update-firmware', async event => {
        let result = await getLatestFirmwareData()
        let firmware = await downloadFirmware(result.firmware.url)
        if (!firmware) throw Error("Failed to load firmware from url!")
        await loadFirmware(Controller.wallet, firmware)
        event.sender.send('onCompleteFirmwareUpload', {
            bootloader: true,
            success: true
        })
        app.quit()
        app.relaunch();
    })

    ipcMain.on('@keepkey/update-bootloader', async event => {
        let result = await getLatestFirmwareData()
        let firmware = await downloadFirmware(result.bootloader.url)
        await loadFirmware(Controller.wallet, firmware)
        event.sender.send('onCompleteBootloaderUpload', {
            bootloader: true,
            success: true
        })
    })
}

export const stop_bridge = async () => {
    console.log('stopping bridge')
    bridgeClosing = true
    const p = new Promise((resolve) => {
        createAndUpdateTray()
        server.close(() => {
            lastKnownKeepkeyState.transport?.disconnect().then(() => {
                Controller.events.removeAllListeners()
                bridgeRunning = false
                bridgeClosing = false
                createAndUpdateTray()
                resolve(true)
            })
        })
    })
    await p
    console.log('bridge stopped')
}
