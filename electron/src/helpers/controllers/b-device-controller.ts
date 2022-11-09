import { Body, Controller, Get, Post, Route, Tags, Response } from 'tsoa';
import { kkStateController, setDeviceBusyRead, setDeviceBusyWrite, deviceBusyRead, deviceBusyWrite } from '../../globalState';
import { WriteBody } from '../types';

export let lastReadTime = 0
export let lastWriteTime = 0

// returns length of time any current requests have been open to the device
// helps us determine if we should close right away on exit or wait for current requests to finish
export const checkIfStuck = () => {

    let pendingReadLength = 0
    let pendingWriteLength = 0

    if(deviceBusyRead) pendingReadLength = Date.now() - lastReadTime
    if(deviceBusyWrite) pendingWriteLength = Date.now() - lastWriteTime

    return pendingReadLength > pendingWriteLength ? pendingReadLength : pendingWriteLength
}

@Tags('Raw KeepKey Device I/0 Endpoints')
@Route('exchange')
export class BDeviceController extends Controller {
    @Get('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async readDevice() {
        try {
            lastReadTime = Date.now()
            setDeviceBusyRead(true)
            // console.log('readDevice')
            let resp = await kkStateController.transport?.readChunk() ?? ''
            setDeviceBusyRead(false)
            return {
                data: Buffer.from(resp as any).toString('hex')
            }
        } catch (e) {
            setDeviceBusyRead(false)
            throw(e)
        }
    }

    @Post('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async writeDevice(@Body() body: WriteBody) {
        try {
            lastWriteTime = Date.now()
            setDeviceBusyWrite(true)
            // console.log('writeDevice')
            let msg = Buffer.from(body.data, 'hex') ?? ''
            kkStateController.transport?.writeChunk(msg)
            setDeviceBusyWrite(false)
            return { output: msg.toString() }
        } catch (e) {
            setDeviceBusyWrite(false)
            throw(e)
        }
    }
}
