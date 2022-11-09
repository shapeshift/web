import { app, BrowserWindow } from "electron";
import { isLinux, settings, windows, bridgeLogger } from "./globalState";
import { createUpdaterSplashWindow, skipUpdateCheck } from "./updaterListeners";
import isDev from 'electron-is-dev'
import { autoUpdater } from 'electron-updater'
import { createMainWindow } from "./helpers/utils";

export const startAppListeners = () => {

    // app entry point
    // creates splash window to look for updates and then start the main window
    app.on('ready', () => {
        createUpdaterSplashWindow()
        settings.loadSettingsFromDb().then(async (settings) => {
            autoUpdater.autoDownload = settings.shouldAutoUpdate
            autoUpdater.allowPrerelease = settings.allowPreRelease
            if (!windows.splash) return
            if (isDev || isLinux || !settings.shouldAutoUpdate) skipUpdateCheck(windows.splash)
            if (!isDev && !isLinux) await autoUpdater.checkForUpdates()
        })
    })

    app.on("second-instance", async () => {
        if (windows.mainWindow) {
            if (windows.mainWindow.isDestroyed()) {
                await createMainWindow();
            } else if (windows.mainWindow.isMinimized()) {
                windows.mainWindow.restore();
            }
            windows.mainWindow.focus();
        } else {
            await createMainWindow();
        }
    })
    
    app.on('window-all-closed', () => {
        if (!settings.shouldMinimizeToTray) app.quit()
    })
    
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    })

    app.on("before-quit", ()=>{
        bridgeLogger.saveLogs()
    })
    
}