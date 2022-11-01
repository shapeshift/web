import { ipcMain } from "electron";
import { createWindow, windows } from "./main";
import log from 'electron-log'
import { lastKnownKeepkeyState } from "./bridge";

export const openSignTxWindow = async (signArgs: any) => {
    let prevContentSize = { width: 0, height: 0 }
    let windowWasPreviouslyOpen = false

    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
        if (!await createWindow()) return
    } else {
        windows.mainWindow.focus()
        windows.mainWindow.setAlwaysOnTop(true)
        windowWasPreviouslyOpen = true
        const contentSize = windows.mainWindow.getContentSize()
        prevContentSize = { width: contentSize[0], height: contentSize[1] }
    }

    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return
    if (!windowWasPreviouslyOpen) windows.mainWindow.focus()
    windows.mainWindow.setContentSize(400, 780)
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





export const checkKeepKeyUnlocked = () => new Promise<void>(async (resolve, reject) => {
    console.log("CHECKING KEEPKEY LOCKED")
    if (!lastKnownKeepkeyState.wallet) return resolve()

    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
        if (!await createWindow()) return reject()
    } else {
        const isLocked = await lastKnownKeepkeyState.wallet.isLocked()
        console.log("KEEPKEY LOCKED: ", isLocked)
        if (isLocked) {
            windows.mainWindow.focus()
            windows.mainWindow.webContents.send('@modal/pin');
        } else {
            return resolve()
        }
    }

    ipcMain.once("@modal/pin-close", () => {
        return resolve()
    })
})

export const getWallectConnectUri = (inputUri: string): string | undefined => {
    const uri = inputUri.replace("keepkey://", "")
    if (!uri.startsWith('wc')) return
    else return decodeURIComponent(uri.replace("wc/?uri=", "").replace("wc?uri=", ""))
}
