import { Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { lastKnownKeepkeyState } from '../';
import wait from 'wait-promise'
import { ETHSignedTx } from '@shapeshiftoss/hdwallet-core'
import { checkKeepKeyUnlocked } from '../../utils';

@Tags('Device Info Endpoints')
@Route('')
export class HDeviceInfoController extends Controller {

    private sleep = wait.sleep;

    @Get('/getNumCoins')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getNumCoins(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.getDeviceID().then(resolve)
        })
    }

    @Get('/getCoinTable')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getCoinTable(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.getCoinTable().then(resolve)
        })
    }

    @Get('/getDeviceID')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getDeviceID(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.getDeviceID().then(resolve)
        })
    }

    @Get('/getVendor')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getVendor(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            resolve(lastKnownKeepkeyState.wallet.getVendor())
        })
    }


    @Get('/getModel')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getModel(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.getModel().then(resolve)
        })
    }

    @Get('/getFirmwareVersion')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getFirmwareVersion(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.getFirmwareVersion().then(resolve)
        })
    }

    @Get('/getLabel')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getLabel(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.getLabel().then(resolve)
        })
    }

    @Get('/isInitialized')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async isInitialized(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.isInitialized().then(resolve)
        })
    }

    @Get('/isLocked')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async isLocked(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!lastKnownKeepkeyState.wallet) return reject()

            lastKnownKeepkeyState.wallet.isLocked().then(resolve)
        })
    }

    @Get('/hasOnDevicePinEntry')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDevicePinEntry(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            resolve(lastKnownKeepkeyState.wallet.hasOnDevicePinEntry())
        })
    }

    @Get('/hasOnDevicePassphrase')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDevicePassphrase(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            resolve(lastKnownKeepkeyState.wallet.hasOnDevicePassphrase())
        })
    }

    @Get('/hasOnDeviceDisplay')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDeviceDisplay(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            resolve(lastKnownKeepkeyState.wallet.hasOnDeviceDisplay())
        })
    }

    @Get('/hasOnDeviceRecovery')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDeviceRecovery(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!lastKnownKeepkeyState.wallet) return reject()

            resolve(lastKnownKeepkeyState.wallet.hasOnDeviceRecovery())
        })
    }
}
