import { app, BrowserWindow } from "electron";
import { createMainWindow, settings } from "./main";
import { windows } from "./helpers/globalState";

export const startAppListeners = () => {
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
    });
    
    app.on('window-all-closed', () => {
        if (!settings.shouldMinimizeToTray) app.quit()
    })
    
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
    
}