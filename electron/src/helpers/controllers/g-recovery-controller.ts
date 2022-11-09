import { Body, Controller, Post, Security, Route, Tags, Response, Middlewares } from 'tsoa';
import wait from 'wait-promise'
import { RecoverDevice, ETHSignedTx } from '@shapeshiftoss/hdwallet-core'
import { checkKeepKeyUnlocked } from '../utils'
import { kkStateController } from '../../globalState'
import { logger } from '../middlewares/logger';
@Tags('Recovery Endpoints')
@Route('')
export class GRecoveryController extends Controller {

    private sleep = wait.sleep;


    @Post('/recover')
    @Security("api_key")
    @Middlewares([logger])
    @Response(500, "Internal server error")
    public async recover(@Body() body: RecoverDevice): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.recover(body).then(resolve)
        })
    }

    //change pin
    @Post('/changePin')
    @Security("api_key")
    @Middlewares([logger])
    @Response(500, "Internal server error")
    public async changePin(@Body() body: void): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.changePin().then(resolve)
        })
    }

    @Post('/sendWord')
    @Security("api_key")
    @Middlewares([logger])
    @Response(500, "Internal server error")
    public async sendWord(@Body() body: string): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.sendWord(body).then(resolve)
        })
    }

    @Post('/sendCharacter')
    @Security("api_key")
    @Middlewares([logger])
    @Response(500, "Internal server error")
    public async sendCharacter(@Body() body: string): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.sendCharacter(body).then(resolve)
        })
    }

    @Post('/sendCharacterDelete')
    @Security("api_key")
    @Middlewares([logger])
    @Response(500, "Internal server error")
    public async sendCharacterDelete(@Body() body: void): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.sendCharacterDelete().then(resolve)
        })
    }

    @Post('/sendCharacterDone')
    @Security("api_key")
    @Middlewares([logger])
    @Response(500, "Internal server error")
    public async sendCharacterDone(@Body() body: void): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.sendCharacterDone().then(resolve)
        })
    }

}
