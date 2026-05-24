import { COMMAND_HEADER_SIZE } from "./protocol.constants";
export class CommandDto {
  commandId:     number;
  flags:         number;
  reserved:      number;
  payloadLength: number;
  payload:       Buffer;

  constructor(data: Partial<CommandDto> = {}) {
    this.commandId     = data.commandId     ?? 0;
    this.flags         = data.flags         ?? 0;
    this.reserved      = data.reserved      ?? 0;
    this.payloadLength = data.payloadLength ?? 0;
    this.payload       = data.payload       ?? Buffer.alloc(0);
  }

  pack(): Buffer {
    this.payloadLength = this.payload.length;
    const header = Buffer.alloc(COMMAND_HEADER_SIZE);
    header.writeUInt8(this.commandId,     0);
    header.writeUInt8(this.flags,         1);
    header.writeUInt16BE(this.reserved,   2);
    header.writeUInt32BE(this.payloadLength, 4);
    return Buffer.concat([header, this.payload]);
  }

  static unpack(raw: Buffer): CommandDto {
    const commandId     = raw.readUInt8(0);
    const flags         = raw.readUInt8(1);
    const reserved      = raw.readUInt16BE(2);
    const payloadLength = raw.readUInt32BE(4);
    const payload       = raw.subarray(COMMAND_HEADER_SIZE);

    return new CommandDto({ commandId, flags, reserved, payloadLength, payload });
  }
}