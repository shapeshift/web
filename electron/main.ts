const { app, BrowserWindow, screen: electronScreen } = require('electron');

const createMainWindow = () => {
    let mainWindow = new BrowserWindow({
        width: electronScreen.getPrimaryDisplay().workArea.width,
        height: electronScreen.getPrimaryDisplay().workArea.height,
        show: false,
        backgroundColor: 'white',
        webPreferences: {
            nodeIntegration: false
        }
    });
    const startURL = 'http://localhost:3000';

    mainWindow.loadURL(startURL);

    mainWindow.once('ready-to-show', () => mainWindow.show());

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (!BrowserWindow.getAllWindows().length) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
