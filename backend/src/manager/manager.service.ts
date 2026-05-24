import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProtocolService } from 'src/protocol/protocol.service';
import { ESessionState } from 'src/protocol/session';

@Injectable()
export class ManagerService {
  private readonly logger = new Logger(ManagerService.name);

  private activeSerial: number | null = null;
  private pendingZip: Buffer | null = null;

  constructor(private readonly protoService: ProtocolService) {}

  connect(code: number): { message: string } {
    const session = this.protoService.getSessionBySerial(code);
    if (!session) {
      throw new NotFoundException(`No device found with serial ${code}`);
    }
    this.protoService.sendHello(session.client);
    this.activeSerial = code;
    return { message: 'Pairing requested' };
  }

  uploadZip(buffer: Buffer): { message: string } {
    this.pendingZip = buffer;
    this.logger.log(`ZIP stored — ${buffer.length} bytes`);
    return { message: 'ZIP uploaded' };
  }

  sendZip(): { message: string } {
    if (this.activeSerial === null) {
      throw new BadRequestException('No device connected');
    }
    if (!this.pendingZip) {
      throw new BadRequestException('No ZIP uploaded yet');
    }
    const session = this.protoService.getSessionBySerial(this.activeSerial);
    if (!session) {
      throw new NotFoundException(`Device ${this.activeSerial} is no longer connected`);
    }
    if (session.state !== ESessionState.READY) {
      throw new BadRequestException('Device is not ready (handshake incomplete)');
    }
    this.protoService.sendDownloadSequence(session.client, this.pendingZip);
    return { message: 'DOWNLOAD_SEQUENCE sent' };
  }

  startSequence(): { message: string } {
    if (this.activeSerial === null) {
      throw new BadRequestException('No device connected');
    }
    const session = this.protoService.getSessionBySerial(this.activeSerial);
    if (!session) {
      throw new NotFoundException(`Device ${this.activeSerial} is no longer connected`);
    }
    if (session.state !== ESessionState.READY) {
      throw new BadRequestException('Device is not ready');
    }
    this.protoService.sendStartSequence(session.client);
    return { message: 'START_SEQUENCE sent' };
  }

  stopSequence(): { message: string } {
    if (this.activeSerial === null) {
      throw new BadRequestException('No device connected');
    }
    const session = this.protoService.getSessionBySerial(this.activeSerial);
    if (!session) {
      throw new NotFoundException(`Device ${this.activeSerial} is no longer connected`);
    }
    this.protoService.sendStopSequence(session.client);
    return { message: 'STOP_SEQUENCE sent' };
  }

  reset(): { message: string } {
    this.activeSerial = null;
    this.pendingZip = null;
    return { message: 'Manager reset' };
  }
}
