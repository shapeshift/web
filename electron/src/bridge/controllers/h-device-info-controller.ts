import { app, ipcMain } from 'electron';
import { createWindow, windows } from '../../main';
import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { keepkey } from '../';
import { GenericResponse, SignedTx, GetPublicKey, Error } from '../types';
import { shared, userType } from '../../shared';
import wait from 'wait-promise'
import { ResetDevice, LoadDevice, BinanceGetAddress, BTCGetAddress, BTCSignedTx, BTCSignTxKK, CosmosGetAddress, CosmosSignedTx, CosmosSignTx, ETHGetAddress, ETHSignedTx, ETHSignTx, OsmosisGetAddress, PublicKey, ThorchainGetAddress, ThorchainSignTx, ThorchainTx } from '@shapeshiftoss/hdwallet-core'
import { uniqueId } from 'lodash';
import { openSignTxWindow } from '../../utils';

@Tags('Device Info Endpoints')
@Route('')
export class HDeviceInfoController extends Controller {

    private sleep = wait.sleep;

    @Get('/getNumCoins')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getNumCoins(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.getDeviceID().then(resolve)
        })
    }

    @Get('/getCoinTable')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getCoinTable(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.getCoinTable().then(resolve)
        })
    }

    @Get('/getDeviceID')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getDeviceID(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.getDeviceID().then(resolve)
        })
    }

    @Get('/getVendor')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getVendor(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            resolve(keepkey.wallet.getVendor())
        })
    }


    @Get('/getModel')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getModel(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.getModel().then(resolve)
        })
    }

    @Get('/getFirmwareVersion')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getFirmwareVersion(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.getFirmwareVersion().then(resolve)
        })
    }

    @Get('/getLabel')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async getLabel(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.getLabel().then(resolve)
        })
    }

    @Get('/isInitialized')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async isInitialized(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.isInitialized().then(resolve)
        })
    }

    @Get('/isLocked')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async isLocked(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            keepkey.wallet.isLocked().then(resolve)
        })
    }

    @Get('/hasOnDevicePinEntry')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDevicePinEntry(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            resolve(keepkey.wallet.hasOnDevicePinEntry())
        })
    }

    @Get('/hasOnDevicePassphrase')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDevicePassphrase(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            resolve(keepkey.wallet.hasOnDevicePassphrase())
        })
    }

    @Get('/hasOnDeviceDisplay')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDeviceDisplay(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            resolve(keepkey.wallet.hasOnDeviceDisplay())
        })
    }

    @Get('/hasOnDeviceRecovery')
    @Security("api_key")
    @Response(500, "Internal server error")
    public async hasOnDeviceRecovery(): Promise<ETHSignedTx> {
        return new Promise<any>((resolve, reject) => {
            if (!keepkey.wallet) return reject()

            resolve(keepkey.wallet.hasOnDeviceRecovery())
        })
    }
}
