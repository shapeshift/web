import { app, Menu, nativeImage, nativeTheme, Tray } from 'electron'
import path from 'path'
import { assetsDirectory, isWalletBridgeRunning, tcpBridgeClosing, windows } from './globalState'
import { createMainWindow } from './helpers/utils'
import { startTcpBridge, stopTcpBridge } from './tcpBridge'

export let tray: Tray
const lightDark = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

// createAndUpdateTray must be called anytime bridgeRunning or bridgeCLosing changes
export const createAndUpdateTray = () => {
    if(tray) tray.destroy()
    const menuTemplate: any = [
        {
            label: !isWalletBridgeRunning() ? 'Bridge Not Running!' : 'Bridge Running',
            enabled: false,
            type: 'normal',
            icon: path.join(assetsDirectory, !isWalletBridgeRunning() ? 'status/unknown.png' : 'status/success.png')
        },
        { type: 'separator' },
        {
            label: 'Show App',
            enabled: true,
            click: () => {
                if (!windows.mainWindow) return createMainWindow()
                if (windows.mainWindow.isDestroyed()) {
                    createMainWindow();
                } else {
                    windows.mainWindow.show();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Start Bridge',
            click: () => startTcpBridge(),
            enabled: !isWalletBridgeRunning() && !tcpBridgeClosing
        },
        {
            label: !tcpBridgeClosing ? 'Stop Bridge' : 'Bridge Closing, please wait...',
            enabled: !tcpBridgeClosing && isWalletBridgeRunning(),
            click: stopTcpBridge
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
    const trayIcon = !isWalletBridgeRunning() ? `${lightDark}/keepKey/unknown.png` : `${lightDark}/keepKey/success.png`
    tray = new Tray(nativeImage.createFromPath(path.join(assetsDirectory, trayIcon)))
    const contextMenu = Menu.buildFromTemplate(menuTemplate)
    tray.setContextMenu(contextMenu)
}