import { Body, Controller, Get, Post, Route, Tags, Response } from 'tsoa';
import { kkStateController, setDeviceBusyRead, setDeviceBusyWrite } from '../globalState';
import { WriteBody } from '../types';
//route
@Tags('Raw KeepKey Device I/0 Endpoints')
@Route('exchange')
export class BDeviceController extends Controller {
    @Get('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async readDevice() {
        try {
            setDeviceBusyRead(true)
            console.log('readDevice')
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
            setDeviceBusyWrite(true)
            console.log('writeDevice')
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
