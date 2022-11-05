import { app, Menu, nativeImage, nativeTheme, Tray } from 'electron'
import log from 'electron-log'
import path from 'path'
import { bridgeRunning, start_bridge, stop_bridge } from './bridge'
import { assetsDirectory } from './constants'
import { createWindow, windows } from './main'

export let tray: Tray
const lightDark = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'


export const menuTemplate: any = [
    {
        label: 'Bridge Not Running',
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
                windows.mainWindow.focus();
            }
        },
    },
    { type: 'separator' },
    {
        label: 'Start Bridge',
        click: function () {
            if (!bridgeRunning) start_bridge()
            log.info('start bridge!!')
        },
        enabled: true
    },
    {
        label: 'Stop Bridge',
        enabled: false,
        click: function () {
            log.info('stop bridge')
            stop_bridge()
        }
    },
    //
    { type: 'separator' },
    {
        label: 'Toggle App',
        click: () => {
            if (!windows.mainWindow) return createWindow()
            if (windows.mainWindow.isDestroyed()) {
                createWindow();
            } else {
                windows.mainWindow.focus();
            }
        },
    },
    {
        label: 'Disable Auto Launch',
        click: function () {
            log.info('show App')
            //kkAutoLauncher.disable()
        }
    },
    {
        label: 'Open dev tools',
        type: 'normal',
        click: () => {
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.openDevTools()
        }
    },
    {
        label: 'Quit KeepKey Bridge',
        type: 'normal',
        click: function () {
            log.info('quit bridge')
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

export const updateTrayIcon = (state: string) => {
    const trayIcon = `${lightDark}/keepKey/${state}.png`
    tray.setImage(nativeImage.createFromPath(path.join(assetsDirectory, trayIcon)))
    const newTemplate = menuTemplate
    switch (state) {
        case "error":
            newTemplate[0].label = "KeepKey Disconnected/Errored"
            break;
        case "success":
            newTemplate[0].label = "Bridge running"
            break;
        default:
            newTemplate[0].label = "Bridge Not Running"
            break;
    }
    newTemplate[0].icon = path.join(assetsDirectory, `status/${state}.png`)
    const contextMenu = Menu.buildFromTemplate(menuTemplate)
    tray.setContextMenu(contextMenu)
}

