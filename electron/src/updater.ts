import { autoUpdater } from 'electron-updater'
import { isLinux } from './constants';
import { createWindow, settings, shouldShowWindow, windows } from './main';
import isDev from 'electron-is-dev'
import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';
import path from 'path';

let skipUpdateTimeout: NodeJS.Timeout;
let windowShowInterval: NodeJS.Timeout
export let skipUpdateCheckCompleted = false

export const setupAutoUpdater = () => {
    autoUpdater.logger = log;

    app.on('ready', () => {
        createSplashWindow()

        settings.loadSettingsFromDb().then(async (settings) => {
            autoUpdater.autoDownload = settings.shouldAutoUpdate
            autoUpdater.allowPrerelease = settings.allowPreRelease

            if (!windows.splash) return
            if (isDev || isLinux || !settings.shouldAutoUpdate) skipUpdateCheck(windows.splash)
            if (!isDev && !isLinux) await autoUpdater.checkForUpdates()
        })
    })

    autoUpdater.on("update-available", (info) => {
        if (skipUpdateCheckCompleted) return
        if (!windows.splash) return
        windows.splash.webContents.send("@update/download", info);
        // skip the update if it takes more than 1 minute
        skipUpdateTimeout = setTimeout(() => {
            if (!windows.splash) return
            skipUpdateCheck(windows.splash);
        }, 60000);
    });


    autoUpdater.on("download-progress", (progress) => {
        let prog = Math.floor(progress.percent);
        if (windows.splash && !windows.splash.isDestroyed()) windows.splash.webContents.send("@update/percentage", prog);
        if (windows.splash && !windows.splash.isDestroyed()) windows.splash.setProgressBar(prog / 100);
        if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send("@update/percentage", prog);
        if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.setProgressBar(prog / 100);
        // stop timeout that skips the update
        if (skipUpdateTimeout) {
            clearTimeout(skipUpdateTimeout);
        }
    });


    autoUpdater.on("update-downloaded", () => {
        if (skipUpdateCheckCompleted) return
        if (windows.splash) windows.splash.webContents.send("@update/relaunch");
        // stop timeout that skips the update
        if (skipUpdateTimeout) {
            clearTimeout(skipUpdateTimeout);
        }
        setTimeout(() => {
            autoUpdater.quitAndInstall();
        }, 1000);
    });


    autoUpdater.on("update-not-available", () => {
        if (skipUpdateCheckCompleted) return
        if (!windows.splash) return
        skipUpdateCheck(windows.splash);
    });


    autoUpdater.on("error", () => {
        if (skipUpdateCheckCompleted) return
        if (!windows.splash) return
        skipUpdateCheck(windows.splash);
    });


    ipcMain.on('@app/update', async (event, data) => {
        if (isDev) return event.sender.send('@app/update', { updateInfo: { version: app.getVersion() } })
        const update = await autoUpdater.checkForUpdates()
        autoUpdater.autoDownload = settings.shouldAutoUpdate
        event.sender.send('@app/update', update)
    })

    ipcMain.on('@app/download-updates', async (event, data) => {
        await autoUpdater.downloadUpdate()
        event.sender.send('@app/download-updates')
    })

    ipcMain.on('@app/install-updates', async (event, data) => {
        autoUpdater.quitAndInstall()
    })
}


export const skipUpdateCheck = (splash: BrowserWindow) => {
    createWindow();
    splash.webContents.send("@update/notfound");
    if (isLinux || isDev) {
        splash.webContents.send("@update/skipCheck");
    }
    // stop timeout that skips the update
    if (skipUpdateTimeout) {
        clearTimeout(skipUpdateTimeout);
    }

    let intervalCount = 0
    windowShowInterval = setInterval(() => {
        intervalCount++

        // hacky way to detect keepkey error and tell them to unplug
        if(intervalCount >= 10) {
            clearInterval(windowShowInterval)
            splash.webContents.send("@update/errorReset")
        }

        if (shouldShowWindow) {
            if (windows.splash) splash.webContents.send("@update/launch")
            clearInterval(windowShowInterval)
            setTimeout(() => {
                if (windows.splash) splash.destroy()
                if (windows.mainWindow) windows.mainWindow.show();
            }, 800);
        }
    }, 1000);
    skipUpdateCheckCompleted = true
}

export const createSplashWindow = () => {
    windows.splash = new BrowserWindow({
        width: 300,
        height: 410,
        transparent: true,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    windows.splash.loadFile(
        path.join(__dirname, "../resources/splash/splash-screen.html")
    );
}

export const setAllowPreRelease = (value: boolean) => {
    autoUpdater.allowPrerelease = value
}