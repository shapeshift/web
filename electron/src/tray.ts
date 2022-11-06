import { app, Menu, nativeImage, nativeTheme, Tray } from 'electron'
import path from 'path'
import { start_bridge, stop_bridge, bridgeRunning, bridgeClosing } from './bridge'
import { assetsDirectory } from './constants'
import { createWindow, kkAutoLauncher, windows } from './main'

export let tray: Tray
const lightDark = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

// createTray must be called anytime bridgeRunning or bridgeCLosing changes
const menuTemplate: any = [
    {
        label: "Bridge Not Running",
        enabled: false,
        type: 'normal',
        icon: path.join(assetsDirectory, 'status/unknown.png')
    },
    { type: 'separator' },
    {
        label: 'Show App',
        enabled: true,
        click: () => {
            if (!windows.mainWindow) return createWindow()
            if (windows.mainWindow.isDestroyed()) {
                createWindow();
            } else {
                windows.mainWindow.show();
            }
        },
    },
    { type: 'separator' },
    {
        label: 'Start Bridge',
        click: start_bridge,
        enabled: !bridgeRunning && !bridgeClosing
    },
    {
        label: !bridgeClosing ? 'Stop Bridge' : 'Bridge Closing, please wait...',
        enabled: !bridgeClosing && bridgeRunning,
        click: stop_bridge
    },
    { type: 'separator' },
    {
        label: 'Disable Auto Launch',
        click: kkAutoLauncher.disable
    },
    {
        label: 'Open dev tools',
        click: () => windows.mainWindow && !windows.mainWindow.isDestroyed() && windows.mainWindow.webContents.openDevTools()
    },
    {
        label: 'Quit KeepKey Bridge',
        click: function () {
            app.quit()
            process.exit(0)
        }
    }
]

export const createTray = () => {
    const trayIcon = `${lightDark}/keepKey/unknown.png`
    tray = new Tray(nativeImage.createFromPath(path.join(assetsDirectory, trayIcon)))
    const contextMenu = Menu.buildFromTemplate(menuTemplate)
    tray.setContextMenu(contextMenu)
}

export const updateTray = (state?: string) => {
    let trayIcon = !bridgeRunning ? `${lightDark}/keepKey/unknown.png` : `${lightDark}/keepKey/success.png`
    menuTemplate[0].label = !bridgeRunning ? 'Bridge Not Running!' : 'Bridge Running'
    if (state) {
        trayIcon = `${lightDark}/keepKey/${state}.png`
        switch (state) {
            case "error":
                menuTemplate[0].label = "KeepKey Disconnected/Errored"
                break;
            case "success":
                menuTemplate[0].label = "Bridge running"
                break;
            default:
                menuTemplate[0].label = "Bridge Not Running"
                break;
        }
        menuTemplate[0].icon = path.join(assetsDirectory, `status/${state}.png`)
    }
    tray.setImage(nativeImage.createFromPath(path.join(assetsDirectory, trayIcon)))
    const contextMenu = Menu.buildFromTemplate(menuTemplate)
    tray.setContextMenu(contextMenu)
}

