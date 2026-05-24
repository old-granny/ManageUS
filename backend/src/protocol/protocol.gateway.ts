import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import {Logger }  from '@nestjs/common';
import type { WebSocket }        from 'ws';
import { CommandId }             from './protocol.constants';
import { CommandDto }            from './command.dto';
import { ProtocolService } from './protocol.service';

@WebSocketGateway({ path: '/ws' })
export class ProtocolGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ProtocolGateway.name);

  constructor(private readonly protocolService: ProtocolService) {}

  handleConnection(client: WebSocket) {
    this.logger.log('Client connected');
    this.protocolService.registerClient(client)
    client.on('message', (data: Buffer) => {
      const cmd = CommandDto.unpack(data);
      this.route(client, cmd);
    });
  }

  handleDisconnect(client: WebSocket) {
    this.protocolService.removeClient(client);
  }

  private route(client: WebSocket, cmd: CommandDto): void {
    switch (cmd.commandId) {
        case CommandId.HELLO_ACK:      return this.protocolService.handleHelloAck(client, cmd);
        case CommandId.ACK:            return this.protocolService.handleAck(client, cmd);
        case CommandId.NACK:           return this.protocolService.handleNack(client, cmd);
        case CommandId.SEQUENCE_INFO:  return this.protocolService.handleSequenceInfo(client, cmd);
        case CommandId.HEARTBEAT: return this.protocolService.handleHeartbeat(client, cmd);
        default:
        this.logger.warn(`Unexpected commandId from device: 0x${cmd.commandId.toString(16)}`);
    }
    }

  send(client: WebSocket, cmd: CommandDto): void {
    client.send(cmd.pack());
  }
}