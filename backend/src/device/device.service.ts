import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProtocolService } from 'src/protocol/protocol.service';
import { EDeviceState } from './device';
import { ESessionState } from 'src/protocol/session';

@Injectable()
export class DeviceService {
    private readonly logger = new Logger(DeviceService.name);

    constructor(private readonly protoService: ProtocolService) {}


    pairWithDevice(serialNumber: number) {
        const session = this.protoService.getSessionBySerial(serialNumber);

        if(!session){
            throw new NotFoundException(`Wrong serial number ${serialNumber}`);
        }

        this.protoService.sendHello(session.client);

        return {
            device: session.deviceState,
            message: "Pairing requested"
        };
    }

    startSequence(serialNumber: number) {
        const session = this.protoService.getSessionBySerial(serialNumber);

        if(!session){
            throw new NotFoundException(`Wrong serial number ${serialNumber}`);
        }

        if(session.state != ESessionState.READY){
            throw new BadRequestException("The device was not ready")
        }

        this.protoService.sendStartSequence(session.client);

        return {
            device: session.deviceState,
            message: "Start session requested"
        };
    }
}