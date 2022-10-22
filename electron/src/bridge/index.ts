
const TAG = " | KEEPKEY_BRIDGE | "

import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { Device } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Server } from 'http'
import { ipcMain, app } from 'electron'
import { updateMenu } from '../tray'
import { db } from '../db'
import { RegisterRoutes } from './routes/routes'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
import { appStartCalled, windows } from '../main'
import { updateConfig } from "keepkey-config";
import { shared } from "../shared";
import { KeepKey } from '@keepkey/keepkey-hardware-controller'
import { IpcQueueItem } from './types'

const Controller = new KeepKey({})

const appExpress = express()
appExpress.use(cors())
appExpress.use(bodyParser.urlencoded({ extended: true }))
appExpress.use(bodyParser.json())
import wait from 'wait-promise'
const sleep = wait.sleep;
//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

export let server: Server
export let bridgeRunning = false
let ipcQueue = new Array<IpcQueueItem>()

export const keepkey: {
    STATE: number,
    STATUS: string,
    device: Device | undefined,
    transport: TransportDelegate | undefined,
    keyring: Keyring | undefined,
    wallet: KeepKeyHDWallet | undefined
} = {
    STATE: 0,
    STATUS: 'preInit',
    device: undefined,
    transport: undefined,
    keyring: undefined,
    wallet: undefined
}

export const start_bridge = (port?: number) => new Promise<void>(async (resolve, reject) => {
    ipcMain.on('@app/start', async (event, data) => {
        log.info('Checking ipcEvent queue')
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
    try {

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
                // keepkey.STATE = 3
                // keepkey.STATUS = 'bridge online'
                // queueIpcEvent('setKeepKeyState', { state: keepkey.STATE })
                // queueIpcEvent('setKeepKeyStatus', { status: keepkey.STATUS })
                updateMenu(keepkey.STATE)
            })
        } catch (e) {
            keepkey.STATE = -1
            keepkey.STATUS = 'bridge error'
            queueIpcEvent('@keepkey/state', { state: keepkey.STATE })
            updateMenu(keepkey.STATE)
            log.info('e: ', e)
        }

        bridgeRunning = true

        try {
            log.info("Starting Hardware Controller")

            //sub ALL events
            //state
            Controller.events.on('state', function (event) {
                log.info("*** state change: ", event)
                keepkey.STATE = event.state
                keepkey.STATUS = event.status
                queueIpcEvent('@keepkey/state', { state: keepkey.STATE })

                if(event.status === 'device connected') {
                    queueIpcEvent('@keepkey/connected', { status: keepkey.STATUS })
                }
                switch (event.state) {
                    case 0:
                        log.info(tag, "No Devices connected")
                        queueIpcEvent('closeBootloaderUpdate', {})
                        queueIpcEvent('closeFirmwareUpdate', {})
                        queueIpcEvent('@keepkey/hardwareError', { event })
                        break;
                    case 1:
                        queueIpcEvent('@onboard/open', event)
                        // queueIpcEvent('@onboard/open', event)
                        break;
                    case 2:
                        queueIpcEvent('setUpdaterMode', true)
                        queueIpcEvent('@onboard/open', event)
                        break;
                    case 5:
                        queueIpcEvent('closeBootloaderUpdate', {})
                        queueIpcEvent('closeFirmwareUpdate', {})
                        //launch init seed window?
                        keepkey.device = Controller.device
                        // @ts-ignore
                        keepkey.wallet = Controller.wallet
                        keepkey.transport = Controller.transport
                        break;
                    case 6:
                        keepkey.device = Controller.device
                        // @ts-ignore
                        keepkey.wallet = Controller.wallet
                        keepkey.transport = Controller.transport
                        break;
                    default:
                    //unhandled
                }
            })

            //errors
            Controller.events.on('error', function (event) {
                log.info("error event: ", event)
                queueIpcEvent('@keepkey/hardwareError', { event })
            })
            // queueIpcEvent('@onboard/open', {})
            //logs
            Controller.events.on('logs', function (event) {
                log.info("logs event: ", event)
                if (event.newDevice) {
                    //push new event
                    queueIpcEvent('@onboard/newKeepKey', event)
                }

                if (event.bootloaderUpdateNeeded || event.firmwareUpdateNeeded) {
                    queueIpcEvent('@onboard/open', event)
                    queueIpcEvent('@onboard/state', event)
                }
            })
            //Init MUST be AFTER listeners are made (race condition)
            Controller.init()

            //
            ipcMain.on('@keepkey/update-firmware', async event => {
                const tag = TAG + ' | onUpdateFirmware | '
                try {
                    log.info(tag, " checkpoint !!!!")
                    let result = await Controller.getLatestFirmwareData()
                    log.info(tag, " result: ", result)

                    let firmware = await Controller.downloadFirmware(result.firmware.url)
                    if (!firmware) throw Error("Failed to load firmware from url!")

                    const updateResponse = await Controller.loadFirmware(firmware)
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
                    let result = await Controller.getLatestFirmwareData()
                    let firmware = await Controller.downloadFirmware(result.bootloader.url)
                    const updateResponse = await Controller.loadFirmware(firmware)
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

    } catch (e) {
        log.error(e)
    }
})

export const stop_bridge = () => new Promise<void>((resolve, reject) => {
    try {
        log.info('server: ', server)
        server.close(() => {
            log.info('Closed out remaining connections')
            keepkey.STATE = 2
            keepkey.STATUS = 'device connected'
            queueIpcEvent('@keepkey/state', { state: keepkey.STATE })
            updateMenu(keepkey.STATE)
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
        log.info('ipcEventQueued: ' + eventName)
        return ipcQueue.push({ eventName, args })
    }
    else if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
        log.info('ipcEventCalled: ' + eventName)
        return windows.mainWindow.webContents.send(eventName, args)
    }
}
