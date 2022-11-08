// @ts-nocheck
import { app, ipcMain } from 'electron';
import { createMainWindow, windows } from '../../main';
import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { kkStateController } from '../kk-state-controller';
import { GenericResponse, SignedTx, GetPublicKey, Error } from '../types';
import { shared, userType } from '../../shared';
import wait from 'wait-promise'
import { EosToSignTx, EosTxSigned, BinanceSignedTx, BinanceSignTx, RippleSignedTx, RippleSignTx, BinanceGetAddress, BTCGetAddress, BTCSignedTx, BTCSignTxKK, CosmosGetAddress, CosmosSignedTx, CosmosSignTx, ETHGetAddress, ETHSignedTx, ETHSignTx, OsmosisGetAddress, PublicKey, ThorchainGetAddress, ThorchainSignTx, ThorchainTx } from '@shapeshiftoss/hdwallet-core'
import { uniqueId } from 'lodash';
import { openSignTxWindow } from '../utils';
import { checkKeepKeyUnlocked } from '../utils';

@Tags('KeepKey signTx Endpoints')
@Route('')
export class ESignController extends Controller {

    private sleep = wait.sleep;

    @Post('/btcSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async btcSignTx(@Body() body: any): Promise<BTCSignedTx> {
        // BTCSignTxKK results in a circular import
        return new Promise<BTCSignedTx>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.btcSignTx(body).then(resolve)
        })
    }


    @Post('/thorchainSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async thorchainSignTx(@Body() body: ThorchainSignTx): Promise<ThorchainTx> {
        return new Promise<ThorchainTx>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.thorchainSignTx(body).then(resolve)
        })
    }

    @Post('/cosmosSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async cosmosSignTx(@Body() body: CosmosSignTx): Promise<CosmosSignedTx> {
        return new Promise<CosmosSignedTx>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.cosmosSignTx(body).then(resolve)
        })
    }

    @Post('/osmosisSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async osmosisSignTx(@Body() body: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return reject()

            windows.mainWindow.webContents.send('@hdwallet/osmosisSignTx', { body })
            ipcMain.once(`@hdwallet/response/osmosisSignTx`, (event, data) => {
                resolve(data)
            })
        })
    }

    @Post('/rippleSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async rippleSignTx(@Body() body: RippleSignTx): Promise<RippleSignedTx> {
        return new Promise<RippleSignedTx>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.rippleSignTx(body).then(resolve)
        })
    }

    @Post('/binanceSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    //TODO unknown type  Error: Unknown type: TupleType
    public async binanceSignTx(@Body() body: any): Promise<any> {
        return new Promise<BinanceSignedTx>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.binanceSignTx(body).then(resolve)
        })
    }

    @Post('/ethSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async ethSignTx(@Body() body: any): Promise<ETHSignedTx> {
        return new Promise<ETHSignedTx>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.ethSignTx(body).then(resolve)
        })
    }

    @Post('/eosSignTx')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async eosSignTx(@Body() body: any): Promise<any> {
        return new Promise<EosTxSigned>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.eosSignTx(body).then(resolve)
        })
    }

    @Post('/sign')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async signTransaction(@Body() body: any): Promise<SignedTx | Error> {
        return new Promise<SignedTx | Error>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            const internalNonce = uniqueId()
            openSignTxWindow({ payload: body, nonce: internalNonce })

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
