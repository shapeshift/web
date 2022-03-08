import { app, Menu, nativeImage, nativeTheme, Tray } from 'electron'
import log from 'electron-log'
import path from 'path'
import { bridgeRunning, start_bridge, stop_bridge } from './bridge'
import { assetsDirectory } from './constants'
import { windows } from './main'
import { shared } from './shared'

let tray: Tray
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
        click: function () {
            log.info('show App')
            if (!windows.mainWindow) return
            if (windows.mainWindow.isVisible()) {
                windows.mainWindow.hide()
                app.dock.hide()
            } else {
                windows.mainWindow.show()
                app.dock.hide()
            }
        }
    },
    { type: 'separator' },
    {
        label: 'Start Bridge',
        click: function () {
            if (!bridgeRunning && shared.eventIPC) start_bridge(shared.eventIPC)
            log.info('start bridge!!')
        },
        enabled: true
    },
    {
        label: 'Stop Bridge',
        enabled: false,
        click: function () {
            log.info('stop bridge')
            stop_bridge(shared.eventIPC)
        }
    },
    //
    { type: 'separator' },
    {
        label: 'Toggle App',
        click: function () {
            log.info('show App')
            if (!windows.mainWindow) return
            if (windows.mainWindow.isVisible()) {
                windows.mainWindow.hide()
                app.dock.hide()
            } else {
                windows.mainWindow.show()
                app.dock.hide()
            }
        }
    },
    {
        label: 'Disable Auto Launch',
        click: function () {
            log.info('show App')
            //kkAutoLauncher.disable()
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

export const createTray = eventIpc => {
    shared.eventIPC = eventIpc
    const trayIcon = `${lightDark}/keepKey/unknown.png`
    tray = new Tray(nativeImage.createFromPath(path.join(assetsDirectory, trayIcon)))
    const contextMenu = Menu.buildFromTemplate(menuTemplate)
    tray.setContextMenu(contextMenu)
}

export const updateMenu = status => {
    let icon = 'unknown'
    // eslint-disable-next-line default-case
    switch (status) {
        case -1:
            menuTemplate[0].label = 'Error'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/error.png')
            icon = 'error'
            break
        case 0:
            menuTemplate[0].label = 'Initializing'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/unknown.png')
            icon = 'unknown'
            break
        case 1:
            menuTemplate[0].label = 'No Devices'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/unknown.png')
            icon = 'unknown'
            break
        case 2:
            menuTemplate[0].label = 'Bridge Not Running'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/unknown.png')
            icon = 'unknown'
            break
        case 3:
            menuTemplate[0].label = 'Bridge Running'
            menuTemplate[0].icon = path.join(assetsDirectory, 'status/success.png')
            menuTemplate[2].enabled = false
            menuTemplate[3].enabled = true
            icon = 'success'
            break
    }
    if (icon) {
        const updatedMenu = Menu.buildFromTemplate(menuTemplate)
        tray.setContextMenu(updatedMenu)
        tray.setImage(
            nativeImage.createFromPath(path.join(assetsDirectory, `${lightDark}/keepKey/${icon}.png`))
        )
    }
}