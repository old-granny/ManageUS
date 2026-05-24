import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { DeviceService } from './device.service';

@Controller("devices")
export class DeviceController {
    constructor(private readonly serv: DeviceService) {}

    @Post(":serial/hello")
    sendHello(@Param('serial') serial:string){
        return this.serv.pairWithDevice(Number(serial));
    }
};