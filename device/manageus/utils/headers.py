import struct
from dataclasses import dataclass
from typing import ClassVar


HELLO = 0x01
HELLO_ACK = 0x02

ACK = 0x03
NACK = 0x04

DOWNLOAD_SEQUENCE = 0x05
START_SEQUENCE = 0x06
HEARTBEAT = 0x07
SEQUENCE_INFO = 0x09
STOP_SEQUENCE = 0x0A


@dataclass
class Command:

    commandId:int
    flags: int
    reserved:int
    payloadLength: int
    payload: bytes = b''

    fmt = ">BBHI"

    def pack(self):
        self.payloadLength = len(self.payload)
        return struct.pack(self.fmt, self.commandId, self.flags, self.reserved, self.payloadLength) + self.payload

    @classmethod
    def unpack(cls, raw:bytes) -> "Command":
        size = struct.calcsize(cls.fmt)
        commandId, flags, reserved, payloadLength = struct.unpack(cls.fmt, raw[:size])
        payload = raw[size:]
        return cls(commandId, flags, reserved, payloadLength, raw)
    