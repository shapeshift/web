import { app, ipcMain } from 'electron';
import { windows } from '../../main';
import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { keepkey } from '../';
import { GenericResponse, SignedTx } from '../responses';
import { shared, userType } from '../../shared';
import wait from 'wait-promise'

@Tags('Secured Endpoints')
@Route('')
export class SecuredController extends Controller {

    private sleep = wait.sleep;

    @Get('/auth/verify')
    @Security("api_key")
    @Response(401, "Please provice a valid serviceKey")
    public async verifyAuth(): Promise<GenericResponse> {
        return {
            success: true
        }
    }

    @Get('/user')
    @Security("api_key")
    @Response(401, "Please provice a valid serviceKey")
    public async user(): Promise<userType> {
        return shared.USER
    }

    @Post('/getPublicKeys')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getPublicKeys(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/getPublicKeys', { body })
            ipcMain.once(`@hdwallet/response/getPublicKeys`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/btcGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async btcGetAddress(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/btcGetAddress', { body })
            ipcMain.once(`@hdwallet/response/btcGetAddress`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/ethGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async ethGetAddress(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/ethGetAddress', { body })
            ipcMain.once(`@hdwallet/response/ethGetAddress`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/thorchainGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async thorchainGetAddress(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/thorchainGetAddress', { body })
            ipcMain.once(`@hdwallet/response/thorchainGetAddress`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/osmosisGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async osmosisGetAddress(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/osmosisGetAddress', { body })
            ipcMain.once(`@hdwallet/response/osmosisGetAddress`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/binanceGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async binanceGetAddress(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/binanceGetAddress', { body })
            ipcMain.once(`@hdwallet/response/binanceGetAddress`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/cosmosGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async cosmosGetAddress(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/cosmosGetAddress', { body })
            ipcMain.once(`@hdwallet/response/cosmosGetAddress`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/btcSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async btcSignTx(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/btcSignTx', { body })
            ipcMain.once(`@hdwallet/response/btcSignTx`, (event, data) => {
                resolve(data)
            })
        })
    }


    @Post('/thorchainSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async thorchainSignTx(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/thorchainSignTx', { body })
            ipcMain.once(`@hdwallet/response/thorchainSignTx`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/cosmosSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async cosmosSignTx(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/cosmosSignTx', { body })
            ipcMain.once(`@hdwallet/response/cosmosSignTx`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/osmosisSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async osmosisSignTx(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/osmosisSignTx', { body })
            ipcMain.once(`@hdwallet/response/osmosisSignTx`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/ethSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async ethSignTx(@Body() body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/ethSignTx', { body })
            ipcMain.once(`@hdwallet/response/ethSignTx`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/sign')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async signTransaction(@Body() body: any): Promise<SignedTx> {
        return new Promise<SignedTx>(async (resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed() || !keepkey.event) return reject()

            windows.mainWindow.setAlwaysOnTop(true)
            if (!windows.mainWindow.isVisible()) {
                windows.mainWindow.show()
                app.dock.show()
            }

            keepkey.event.sender.send('signTx', { payload: body })
            //hold till signed
            while (!shared.SIGNED_TX) {
                console.log("waiting!")
                await this.sleep(300)
            }
            resolve({ success: true, status: 'signed', signedTx: shared.SIGNED_TX })
            shared.SIGNED_TX = null
        })
    }
}
