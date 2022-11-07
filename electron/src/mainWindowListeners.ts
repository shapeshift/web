import { shell } from "electron"
import { ALLOWED_HOSTS, setShouldShowWindow, windows } from "./helpers/globalState"
import { skipUpdateCheckCompleted } from "./helpers/updater"

export const startMainWindowListeners = () => {
    windows.mainWindow?.removeAllListeners('closed')
    windows.mainWindow?.removeAllListeners('ready-to-show')

    windows.mainWindow?.on('closed', () => {
        if (windows.mainWindow) {
            windows.mainWindow.destroy()
            windows.mainWindow = undefined
        }
    })

    windows.mainWindow?.once('ready-to-show', () => {
        setShouldShowWindow(true)
        if (skipUpdateCheckCompleted) windows.mainWindow?.show()
    })

    windows.mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
        let urlObj = new URL(url)
        let urlHost = urlObj.hostname;
        if (ALLOWED_HOSTS.includes(urlHost)) return { action: 'allow' }
        shell.openExternal(url)
        return { action: 'deny' }
    })

    windows.mainWindow?.webContents.on("will-navigate", (event, url) => {
        let urlObj = new URL(url);
        let urlHost = urlObj.hostname;
        if (!ALLOWED_HOSTS.includes(urlHost)) {
            event.preventDefault()
            shell.openExternal(url)
        }
    })
}