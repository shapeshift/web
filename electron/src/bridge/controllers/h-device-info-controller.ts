import { Controller, Get, Security, Route, Tags, Response } from 'tsoa';
import { kkStateController } from '../';
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
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.getDeviceID().then(resolve)
        })
    }

    @Get('/getCoinTable')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getCoinTable(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.getCoinTable().then(resolve)
        })
    }

    @Get('/getDeviceID')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getDeviceID(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.getDeviceID().then(resolve)
        })
    }

    @Get('/getVendor')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getVendor(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            resolve(kkStateController.wallet.getVendor())
        })
    }


    @Get('/getModel')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getModel(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.getModel().then(resolve)
        })
    }

    @Get('/getFirmwareVersion')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getFirmwareVersion(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.getFirmwareVersion().then(resolve)
        })
    }

    @Get('/getLabel')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getLabel(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.getLabel().then(resolve)
        })
    }

    @Get('/isInitialized')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async isInitialized(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.isInitialized().then(resolve)
        })
    }

    @Get('/isLocked')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async isLocked(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!kkStateController.wallet) return reject()

            kkStateController.wallet.isLocked().then(resolve)
        })
    }

    @Get('/hasOnDevicePinEntry')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDevicePinEntry(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            resolve(kkStateController.wallet.hasOnDevicePinEntry())
        })
    }

    @Get('/hasOnDevicePassphrase')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDevicePassphrase(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            resolve(kkStateController.wallet.hasOnDevicePassphrase())
        })
    }

    @Get('/hasOnDeviceDisplay')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDeviceDisplay(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            resolve(kkStateController.wallet.hasOnDeviceDisplay())
        })
    }

    @Get('/hasOnDeviceRecovery')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDeviceRecovery(): Promise<ETHSignedTx> {
        return new Promise<any>(async (resolve, reject) => {
            await checkKeepKeyUnlocked()
            if (!kkStateController.wallet) return reject()

            resolve(kkStateController.wallet.hasOnDeviceRecovery())
        })
    }
}
