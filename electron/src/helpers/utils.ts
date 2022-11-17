import { BrowserWindow, ipcMain } from "electron"
import { startTcpBridge } from "../tcpBridge"
import { deviceBusyRead, deviceBusyWrite, ipcQueue, kkStateController, renderListenersReady, settings, windows } from "../globalState"
import isDev from 'electron-is-dev'
import { startWindowListeners } from "../windowListeners"
import path from 'path';
import log from 'electron-log'

export const openSignTxWindow = async (signArgs: any) => {
    log.info(" | openSignTxWindow | ")
    let prevContentSize = { width: 0, height: 0 }
    let windowWasPreviouslyOpen = false

    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
        if (!await createMainWindow()) return
    }
    if(!windows.mainWindow) throw Error("Failed to start App!")
    windows.mainWindow.focus()
    windows.mainWindow.setAlwaysOnTop(true)
    windowWasPreviouslyOpen = true
    const contentSize = windows.mainWindow.getContentSize()
    prevContentSize = { width: contentSize[0], height: contentSize[1] }

    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return
    if (!windowWasPreviouslyOpen) windows.mainWindow.focus()
    // windows.mainWindow.setContentSize(400, 780)
    windows.mainWindow.webContents.send('@account/sign-tx', signArgs);

    ipcMain.once('@modal/sign-close', () => {
        if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return
        windows.mainWindow.setAlwaysOnTop(false)
        if (windowWasPreviouslyOpen && windows.mainWindow.minimizable) {
            console.log('prevContentSize', prevContentSize)
            windows.mainWindow.setContentSize(prevContentSize.width, prevContentSize.height)
            windows.mainWindow.minimize()
        }
        else if (windows.mainWindow.closable) windows.mainWindow.close()
    })
}

export const checkKeepKeyUnlocked = async () => {
    if (!kkStateController.wallet) return
    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
        if (!await createMainWindow()) return
    } else {
        let isLocked
        try {
            isLocked = await kkStateController.wallet.isLocked()
        }catch(e) {
            console.log('error is', e)
        }
        console.log("KEEPKEY LOCKED: ", isLocked)
        if (isLocked) {
            windows.mainWindow.focus()
            windows.mainWindow.webContents.send('@modal/pin');
        } else {
            return
        }
    }
    const p = new Promise( (resolve: any) => {
        ipcMain.once("@modal/pin-close", () => {
            return resolve()
        })
    })
    await p
}

export const getWallectConnectUri = (inputUri: string): string | undefined => {
    const uri = inputUri.replace("keepkey://", "")
    if (!uri.startsWith('wc')) return
    else return decodeURIComponent(uri.replace("wc/?uri=", "").replace("wc?uri=", ""))
}


export const queueIpcEvent = (eventName: string, args: any) => {
    if (!renderListenersReady || !windows?.mainWindow || windows.mainWindow.isDestroyed()) {
        log.info('queued ipc event: ', eventName)
        return ipcQueue.push({ eventName, args })
    }
    else {
        log.info('renderListenersReady skipping queue: ', eventName)
        return windows.mainWindow.webContents.send(eventName, args)
    }
}

export const createMainWindow = async () => {
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

    windows.mainWindow.loadURL(isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../../../build/index.html')}`)

    startWindowListeners()

    return true
}

// hack to detect when the keepkey is busy so we can be careful not to do 2 things at once
export const watchForDeviceBusy = () => {
    let lastDeviceBusyRead = false
    let lastDeviceBusyWrite = false
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
}