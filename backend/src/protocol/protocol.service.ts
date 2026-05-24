import { Injectable, Logger } from '@nestjs/common';
import type { WebSocket } from 'ws';
import { CommandId } from './protocol.constants';
import { CommandDto } from './command.dto';

import { ISession, ESessionState } from './session';
import { EDeviceState, IDevice } from 'src/device/device';

@Injectable()
export class ProtocolService {
  private readonly logger = new Logger(ProtocolService.name);
  private readonly sessions = new Map<WebSocket, ISession>();

  registerClient(client: WebSocket): void {
    this.sessions.set(client, {
      client,
      state: ESessionState.CONNECTED,
      lastSentCommand: null,
      deviceState: null
    });
    this.logger.log('Session created');
  }

  getSessionBySerial(serialNumber: number): ISession | undefined {
    this.logger.log(this.sessions);
    return [...this.sessions.values()].find(s => s.deviceState?.serial_number === serialNumber);
  }

  removeClient(client: WebSocket): void {
    this.sessions.delete(client);
    this.logger.log('Session removed');
  }

  getSession(client: WebSocket): ISession | undefined {
    return this.sessions.get(client);
  }

  sendHello(client: WebSocket): void {
    this.logger.log('Sending HELLO');
    this.sessions.get(client)!.state = ESessionState.HELLO_SENT;
    this.sessions.get(client)!.lastSentCommand = CommandId.HELLO;
    client.send(new CommandDto({ commandId: CommandId.HELLO }).pack());
  }

  sendDownloadSequence(client: WebSocket, payload: Buffer): void {
    this.logger.log('Sending DOWNLOAD_SEQUENCE');
    client.send(new CommandDto({ commandId: CommandId.DOWNLOAD_SEQUENCE, payload }).pack());
  }

  sendStartSequence(client: WebSocket): void {
    this.logger.log('Sending START_SEQUENCE');
    client.send(new CommandDto({ commandId: CommandId.START_SEQUENCE }).pack());
  }

  handleHeartbeat(client: WebSocket, cmd: CommandDto): void {
    try {
      const device: IDevice = JSON.parse(cmd.payload.toString('utf-8'));
      const session = this.sessions.get(client)!;
      session.deviceState = device;

      this.logger.log(
        `HEARTBEAT — serial: ${device.serial_number} | state: ${EDeviceState[device.state]} | pairing: ${device.pairing}`
      );

      //client.send(new CommandDto({ commandId: CommandId.ACK }).pack());
    } catch (e) {
      this.logger.error('Failed to parse HEARTBEAT payload', e);
      //client.send(new CommandDto({ commandId: CommandId.NACK }).pack());
    }
  }

  sendStopSequence(client: WebSocket): void {
    this.logger.log('Sending STOP_SEQUENCE');
    client.send(new CommandDto({ commandId: CommandId.STOP_SEQUENCE }).pack());
  }


  handleHelloAck(client: WebSocket, cmd: CommandDto): void {
    const session = this.sessions.get(client)!;
    if (session.state !== ESessionState.HELLO_SENT) {
      this.logger.warn(`Unexpected HELLO_ACK in state ${ESessionState[session.state]}`);
      return;
    }
    session.state = ESessionState.READY;
    this.logger.log('HELLO_ACK received — handshake complete, device is READY');
  }

  handleAck(client: WebSocket, cmd: CommandDto): void {
    const session = this.sessions.get(client)!;
    this.logger.log(`ACK received for command 0x${session.lastSentCommand?.toString(16)} in state ${ESessionState[session.state]}`);

    switch (session.lastSentCommand) {
      case CommandId.DOWNLOAD_SEQUENCE:
        this.logger.log('Download acknowledged — ready to start');
        break;
      case CommandId.START_SEQUENCE:
        this.logger.log('Start acknowledged — sequence running');
        break;
      case CommandId.STOP_SEQUENCE:
        session.state = ESessionState.READY;
        this.logger.log('Stop acknowledged — device back to READY');
        break;
    }
  }

  handleNack(client: WebSocket, cmd: CommandDto): void {
    this.logger.log('HEARTBEAT received');
    client.send(new CommandDto({ commandId: CommandId.ACK }).pack());
  }

  handleSequenceInfo(client: WebSocket, cmd: CommandDto): void {
    this.logger.log('SEQUENCE_INFO received');
  }
}