import { ipcMain } from 'electron';
import { kkStateController, windows } from '../../main';
import { Body, Controller, Post, Security, Route, Tags, Response } from 'tsoa';
import { GetPublicKey } from '../types';
import { EosGetPublicKey, RippleGetAddress, BinanceGetAddress, ETHGetAddress, OsmosisGetAddress, PublicKey, ThorchainGetAddress, CosmosGetAddress, BTCGetAddress } from '@shapeshiftoss/hdwallet-core'
import { checkKeepKeyUnlocked } from '../utils';
@Tags('KeepKey Wallet Endpoints')
@Route('')
export class DPubkeyController extends Controller {

    @Post('/getPublicKeys')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getPublicKeys(@Body() body: GetPublicKey[]): Promise<Array<PublicKey | null>> {
        return new Promise<Array<PublicKey | null>>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            // @ts-ignore
            kkStateController.wallet.getPublicKeys(body).then(resolve)
        })
    }

    @Post('/btcGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async btcGetAddress(@Body() body: BTCGetAddress): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.btcGetAddress(body).then(resolve)
        })
    }

    @Post('/ethGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async ethGetAddress(@Body() body: ETHGetAddress): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.ethGetAddress(body).then(resolve)
        })
    }

    @Post('/thorchainGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async thorchainGetAddress(@Body() body: ThorchainGetAddress): Promise<string | null> {
        return new Promise<string | null>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.thorchainGetAddress(body).then(resolve)
        })
    }

    @Post('/osmosisGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async osmosisGetAddress(@Body() body: OsmosisGetAddress): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
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
        return new Promise<string>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.binanceGetAddress(body).then(resolve)
        })
    }

    @Post('/cosmosGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async cosmosGetAddress(@Body() body: CosmosGetAddress): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.cosmosGetAddress(body).then(resolve)
        })
    }

    @Post('/rippleGetAddress')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async rippleGetAddress(@Body() body: RippleGetAddress): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.rippleGetAddress(body).then(resolve)
        })
    }

    @Post('/eosGetPublicKey')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async eosGetPublicKey(@Body() body: EosGetPublicKey): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.eosGetPublicKey(body).then(resolve)
        })
    }

}
