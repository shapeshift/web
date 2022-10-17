import { app, ipcMain } from 'electron';
import { createWindow, windows } from '../../main';
import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { keepkey } from '../';
import { GenericResponse, SignedTx, GetPublicKey, Error } from '../types';
import { shared, userType } from '../../shared';
import wait from 'wait-promise'
import { EosGetPublicKey, RippleGetAddress, BinanceGetAddress, BTCGetAddress, BTCSignedTx, BTCSignTxKK, CosmosGetAddress, CosmosSignedTx, CosmosSignTx, ETHGetAddress, ETHSignedTx, ETHSignTx, OsmosisGetAddress, PublicKey, ThorchainGetAddress, ThorchainSignTx, ThorchainTx } from '@shapeshiftoss/hdwallet-core'
import { uniqueId } from 'lodash';
import { openSignTxWindow } from '../../utils';

@Tags('KeepKey Wallet Endpoints')
@Route('')
export class DPubkeyController extends Controller {

    private sleep = wait.sleep;

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

    @Post('/rippleGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async rippleGetAddress(@Body() body: RippleGetAddress): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.rippleGetAddress(body).then(resolve)
        })
    }

    @Post('/eosGetPublicKey')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async eosGetPublicKey(@Body() body: EosGetPublicKey): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.eosGetPublicKey(body).then(resolve)
        })
    }

}
