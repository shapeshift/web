const TAG = " | KEEPKEY_BRIDGE | "

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
import { appStartCalled, windows } from '../main'
import { shared } from "../shared";
import { IpcQueueItem } from './types'
import { KKController } from './kk-controller'

const Controller = new KKController()

const appExpress = express()
appExpress.use(cors())
appExpress.use(bodyParser.urlencoded({ extended: true }))
appExpress.use(bodyParser.json())
import wait from 'wait-promise'
import { downloadFirmware, getLatestFirmwareData, loadFirmware } from './kk-controller/firmwareUtils'
const sleep = wait.sleep;
//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

export let server: Server
export let bridgeRunning = false
let ipcQueue = new Array<IpcQueueItem>()

export const lastKnownKeepkeyState: {
    STATE: number,
    STATUS: string,
    device: Device | undefined,
    transport: TransportDelegate | undefined,
    wallet: KeepKeyHDWallet | undefined
} = {
    STATE: 0,
    STATUS: 'preInit',
    device: undefined,
    transport: undefined,
    wallet: undefined
}

export const start_bridge = (port?: number) => new Promise<void>(async (resolve, reject) => {
    ipcMain.on('@app/start', async (event, data) => {
        let newQueue = [...ipcQueue]
        await new Promise(() => {
            const endIdx = ipcQueue.length - 1
            ipcQueue.forEach((item, idx) => {
                log.info('ipcEventCalledFromQueue: ' + item.eventName)
                if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send(item.eventName, item.args)
                ipcQueue.splice(idx, 1);
            })
        })
        ipcQueue = [...newQueue]
    })
    let tag = " | start_bridge | "
    let API_PORT = port || 1646

    // send paired apps when requested
    ipcMain.on('@bridge/paired-apps', (event) => {
        db.find({ type: 'service' }, (err, docs) => {
            queueIpcEvent('@bridge/paired-apps', docs)
        })
    })

    // used only for implicitly pairing the KeepKey web app
    ipcMain.on(`@bridge/add-service`, (event, data) => {
        db.insert({
            type: 'service',
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

    //port
    try {
        log.info(tag, "starting server! **** ")
        server = appExpress.listen(API_PORT, () => {
            queueIpcEvent('@bridge/started', {})
            log.info(`server started at http://localhost:${API_PORT}`)
        })
    } catch (e) {
        log.info('e: ', e)
    }

    bridgeRunning = true

    try {
        log.info("Starting Hardware Controller")

        Controller.events.on('logs', async function (event) {
            console.log('event is', event)
            if(event.bootloaderUpdateNeeded && !event.bootloaderMode) {
                queueIpcEvent('requestBootloaderMode', {})
            } else if (event.bootloaderUpdateNeeded && event.bootloaderMode) {
                queueIpcEvent('updateBootloader', {event})
            } else if (event.firmwareUpdateNeededNotBootloader) {
                queueIpcEvent('updateFirmware', {event})
            } else if(event.needsInitialize) {
                queueIpcEvent('needsInitialize', {})
            } else if(event.ready) {
                queueIpcEvent('@keepkey/connected', { status: lastKnownKeepkeyState.STATUS })
                lastKnownKeepkeyState.device = Controller.device
                lastKnownKeepkeyState.wallet = Controller.wallet
                lastKnownKeepkeyState.transport = Controller.transport
            }
        })
        Controller.events.on('error', function (event) {
            queueIpcEvent('@keepkey/hardwareError', { event })
        })

        //Init MUST be AFTER listeners are made (race condition)
        await Controller.init()

        //
        ipcMain.on('@keepkey/update-firmware', async event => {
            const tag = TAG + ' | onUpdateFirmware | '
            try {
                let result = await getLatestFirmwareData()

                let firmware = await downloadFirmware(result.firmware.url)
                if (!firmware) throw Error("Failed to load firmware from url!")

                const updateResponse = await loadFirmware(Controller.wallet, firmware)
                log.info(tag, "updateResponse: ", updateResponse)

                event.sender.send('onCompleteFirmwareUpload', {
                    bootloader: true,
                    success: true
                })
                app.quit();
                app.relaunch();
            } catch (e) {
                log.error(tag, e)
                app.quit();
                app.relaunch();
            }
        })

        ipcMain.on('@keepkey/update-bootloader', async event => {
            const tag = TAG + ' | onUpdateBootloader | '
            try {
                log.info(tag, "checkpoint: ")
                let result = await getLatestFirmwareData()
                let firmware = await downloadFirmware(result.bootloader.url)
                const updateResponse = await loadFirmware(Controller.wallet, firmware)
                log.info(tag, "updateResponse: ", updateResponse)
                event.sender.send('onCompleteBootloaderUpload', {
                    bootloader: true,
                    success: true
                })
            } catch (e) {
                log.error(tag, e)
                app.quit();
                app.relaunch();
            }
        })

        ipcMain.on('@keepkey/info', async (event, data) => {
            const tag = TAG + ' | onKeepKeyInfo | '
            try {
                shared.KEEPKEY_FEATURES = data
            } catch (e) {
                log.error('e: ', e)
                log.error(tag, e)
            }
        })

    } catch (e) {
        log.error(e)
    }


    resolve()
})

export const stop_bridge = () => new Promise<void>((resolve, reject) => {
    try {
        log.info('server: ', server)
        server.close(() => {
            log.info('Closed out remaining connections')
        })
        bridgeRunning = false
        resolve()
    } catch (e) {
        log.error(e)
        reject()
    }
})

export const queueIpcEvent = (eventName: string, args: any) => {
    if (!appStartCalled) {
        return ipcQueue.push({ eventName, args })
    }
    else if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
        return windows.mainWindow.webContents.send(eventName, args)
    }
}
