import { app, ipcMain } from 'electron';
import { createWindow, windows } from '../../main';
import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { lastKnownKeepkeyState } from '../';
import { GenericResponse, SignedTx, GetPublicKey, Error } from '../types';
import { shared, userType } from '../../shared';
import wait from 'wait-promise'
import { RecoverDevice, LoadDevice, BinanceGetAddress, BTCGetAddress, BTCSignedTx, BTCSignTxKK, CosmosGetAddress, CosmosSignedTx, CosmosSignTx, ETHGetAddress, ETHSignedTx, ETHSignTx, OsmosisGetAddress, PublicKey, ThorchainGetAddress, ThorchainSignTx, ThorchainTx } from '@shapeshiftoss/hdwallet-core'
import { uniqueId } from 'lodash';
import { checkKeepKeyUnlocked, openSignTxWindow } from '../../utils';

@Tags('Recovery Endpoints')
@Route('')
export class GRecoveryController extends Controller {

    private sleep = wait.sleep;


    @Post('/recover')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async recover(@Body() body: RecoverDevice): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.recover(body).then(resolve)
        })
    }

    //change pin
    @Post('/changePin')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async changePin(@Body() body: void): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.changePin().then(resolve)
        })
    }

    @Post('/sendWord')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async sendWord(@Body() body: string): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.sendWord(body).then(resolve)
        })
    }

    @Post('/sendCharacter')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async sendCharacter(@Body() body: string): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.sendCharacter(body).then(resolve)
        })
    }

    @Post('/sendCharacterDelete')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async sendCharacterDelete(@Body() body: void): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.sendCharacterDelete().then(resolve)
        })
    }

    @Post('/sendCharacterDone')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async sendCharacterDone(@Body() body: void): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.sendCharacterDone().then(resolve)
        })
    }

}
