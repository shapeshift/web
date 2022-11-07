import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { Server } from 'http'
import { ipcMain, app } from 'electron'
import { db } from '../db'
import { RegisterRoutes } from './routes/routes'
import { kkStateController, windows } from '../main'
import { IpcQueueItem } from './types'
import { downloadFirmware, getLatestFirmwareData, loadFirmware } from './kk-state-controller/firmwareUtils'
import { createAndUpdateTray } from '../tray'
import { deviceBusyRead, deviceBusyWrite } from './controllers/b-device-controller'
import { CONNECTED } from './kk-state-controller'


//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

export let server: Server

// tcp server portion of the bridge
export let tcpBridgeRunning = false
export let tcpBridgeStarting = false

export let tcpBridgeClosing = false

// tcp bridge running and keepkey is successfully connected
export let isWalletBridgeRunning = () => kkStateController?.lastState === CONNECTED && tcpBridgeRunning



let ipcQueue = new Array<IpcQueueItem>()

export const queueIpcEvent = (eventName: string, args: any) => {
    if (!renderListenersReady || !windows?.mainWindow || windows.mainWindow.isDestroyed()) {
        return ipcQueue.push({ eventName, args })
    }
    else {
        return windows.mainWindow.webContents.send(eventName, args)
    }
}    

let renderListenersReady = false

// to keep track of device becomes busy or unbusy
let lastDeviceBusyRead = false
let lastDeviceBusyWrite = false

export const startTcpBridge = async (port?: number) => {
    if (tcpBridgeRunning || tcpBridgeStarting) return
    tcpBridgeStarting = true
    // web render thread has indicated it is ready to receive ipc messages
    // send any that have queued since then
    ipcMain.on('renderListenersReady', async () => {
        renderListenersReady = true
        ipcQueue.forEach((item, idx) => {
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send(item.eventName, item.args)
            ipcQueue.splice(idx, 1);
        })
    })
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

    ipcMain.on('@keepkey/update-firmware', async event => {
        let result = await getLatestFirmwareData()
        let firmware = await downloadFirmware(result.firmware.url)
        if (!firmware) throw Error("Failed to load firmware from url!")
        await loadFirmware(kkStateController.wallet, firmware)
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
        await loadFirmware(kkStateController.wallet, firmware)
        event.sender.send('onCompleteBootloaderUpload', {
            bootloader: true,
            success: true
        })
    })

    const appExpress = express()
    appExpress.use(cors())
    appExpress.use(bodyParser.urlencoded({ extended: true }))
    appExpress.use(bodyParser.json())

    appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    //swagger.json
    appExpress.use('/spec', express.static(path.join(__dirname, '../../api/dist')));

    RegisterRoutes(appExpress);

    await new Promise( (resolve) =>  server = appExpress.listen(API_PORT, () => resolve(true)))
    log.info(`server started at http://localhost:${API_PORT}`)

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

    tcpBridgeStarting = false
    tcpBridgeRunning = true

    createAndUpdateTray()
}

export const stopBridge = async () => {
    if(tcpBridgeClosing) return false
    tcpBridgeClosing = true
    await new Promise(async (resolve) => {
        createAndUpdateTray()
        if(server) {
            server?.close(async () => {
                await kkStateController.transport?.disconnect()
                tcpBridgeRunning = false
                tcpBridgeClosing = false
                createAndUpdateTray()
                resolve(true)
            })
        } else {
            await kkStateController.transport?.disconnect()
            tcpBridgeRunning = false
            tcpBridgeClosing = false
            createAndUpdateTray()
            resolve(true)
        }
    })
    return true
}
