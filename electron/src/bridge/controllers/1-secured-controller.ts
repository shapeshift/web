import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { keepkey } from '../';



export interface GenericResponse {
    success: boolean
}


@Tags('Secured Endpoints')
@Route('')
export class SecuredController extends Controller {

    @Get('/auth/verify')
    @Security("api_key")
    @Response(401, "Please provice a valid serviceKey")
    public async verifyAuth(): Promise<GenericResponse> {
        return {
            success: true
        }
    }
}
