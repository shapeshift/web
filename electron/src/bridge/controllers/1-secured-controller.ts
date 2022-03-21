import { app, ipcMain } from 'electron';
import { createWindow, windows } from '../../main';
import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { keepkey } from '../';
import { GenericResponse, SignedTx, GetPublicKey, Error } from '../types';
import { shared, userType } from '../../shared';
import wait from 'wait-promise'
import { BinanceGetAddress, BTCGetAddress, BTCSignedTx, BTCSignTxKK, CosmosGetAddress, CosmosSignedTx, CosmosSignTx, ETHGetAddress, ETHSignedTx, ETHSignTx, OsmosisGetAddress, PublicKey, ThorchainGetAddress, ThorchainSignTx, ThorchainTx } from '@shapeshiftoss/hdwallet-core'
import { uniqueId } from 'lodash';

@Tags('Secured Endpoints')
@Route('')
export class SecuredController extends Controller {

    private sleep = wait.sleep;

    @Get('/auth/verify')
    @Security("api_key")
    @Response(401, "Please provide a valid serviceKey")
    public async verifyAuth(): Promise<GenericResponse> {
        return {
            success: true
        }
    }

    @Get('/user')
    @Security("api_key")
    @Response(401, "Please provide a valid serviceKey")
    public async user(): Promise<userType> {
        return shared.USER
    }

    @Post('/getPublicKeys')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getPublicKeys(@Body() body: GetPublicKey[]): Promise<Array<PublicKey | null>> {
        return new Promise<Array<PublicKey | null>>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            // @ts-ignore
            keepkey.wallet.getPublicKeys(body).then(resolve)
        })
    }

    @Post('/btcGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async btcGetAddress(@Body() body: BTCGetAddress): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.btcGetAddress(body).then(resolve)
        })
    }

    @Post('/ethGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async ethGetAddress(@Body() body: ETHGetAddress): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.ethGetAddress(body).then(resolve)
        })
    }

    @Post('/thorchainGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async thorchainGetAddress(@Body() body: ThorchainGetAddress): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.thorchainGetAddress(body).then(resolve)
        })
    }

    @Post('/osmosisGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async osmosisGetAddress(@Body() body: OsmosisGetAddress): Promise<any> {
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
    public async binanceGetAddress(@Body() body: BinanceGetAddress): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.binanceGetAddress(body).then(resolve)
        })
    }

    @Post('/cosmosGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async cosmosGetAddress(@Body() body: CosmosGetAddress): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.cosmosGetAddress(body).then(resolve)
        })
    }

    @Post('/btcSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async btcSignTx(@Body() body: any): Promise<BTCSignedTx> {
        // BTCSignTxKK results in a circular import
        return new Promise<BTCSignedTx>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.btcSignTx(body).then(resolve)
        })
    }


    @Post('/thorchainSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async thorchainSignTx(@Body() body: ThorchainSignTx): Promise<ThorchainTx> {
        return new Promise<ThorchainTx>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.thorchainSignTx(body).then(resolve)
        })
    }

    @Post('/cosmosSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async cosmosSignTx(@Body() body: CosmosSignTx): Promise<CosmosSignedTx> {
        return new Promise<CosmosSignedTx>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.cosmosSignTx(body).then(resolve)
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
    public async ethSignTx(@Body() body: ETHSignTx): Promise<ETHSignedTx> {
        return new Promise<ETHSignedTx>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.ethSignTx(body).then(resolve)
        })
    }

    @Post('/sign')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async signTransaction(@Body() body: any): Promise<SignedTx | Error> {
        return new Promise<SignedTx | Error>(async (resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
                if (!await createWindow()) return reject()
            }

            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.setAlwaysOnTop(true)
            if (!windows.mainWindow.isFocusable) {
                windows.mainWindow.focus()
                app.dock.show()
            }

            const internalNonce = uniqueId()
            windows.mainWindow.webContents.send('@account/sign-tx', { payload: body, nonce: internalNonce })

            ipcMain.once(`@account/tx-signed-${internalNonce}`, async (event, data) => {
                if (data.nonce === internalNonce) {
                    resolve({ success: true, status: 'signed', signedTx: data.signedTx })
                }
            })

            ipcMain.once(`@account/tx-rejected-${internalNonce}`, async (event, data) => {
                if (data.nonce === internalNonce) {
                    resolve({ success: false, reason: 'User rejected TX' })
                }
            })
        })
    }
}
