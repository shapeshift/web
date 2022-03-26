import { ipcMain } from "electron";
import { createWindow, windows } from "./main";

export const openSignTxWindow = async (signArgs: any) => {
    let prevContentSize = { width: 0, height: 0 }
    let windowWasPreviouslyOpen = false

    if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
        if (!await createWindow()) return
    } else {
        windows.mainWindow.focus()
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
        if (windowWasPreviouslyOpen && windows.mainWindow.minimizable) {
            console.log('prevContentSize', prevContentSize)
            windows.mainWindow.setContentSize(prevContentSize.width, prevContentSize.height)
            windows.mainWindow.minimize()
        }
        else if (windows.mainWindow.closable) windows.mainWindow.close()
    })
}
