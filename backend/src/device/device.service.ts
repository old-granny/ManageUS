import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProtocolService } from 'src/protocol/protocol.service';

@Injectable()
export class DeviceService {
    private readonly logger = new Logger(DeviceService.name);

    constructor(private readonly protoService: ProtocolService) {}


    pairWithDevice(serialNumber: number) {
        const session = this.protoService.getSessionBySerial(serialNumber);

        if(!session){
            throw new NotFoundException("Wrong serial number");
        }

        this.protoService.sendHello(session.client);

        return {
            device: session.deviceState,
            message: "Pairing requested"
        };
    }
}