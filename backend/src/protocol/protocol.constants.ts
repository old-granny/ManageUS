export const CommandId = {
  HELLO:             0x01,
  HELLO_ACK:         0x02,
  ACK:               0x03,
  NACK:              0x04,
  DOWNLOAD_SEQUENCE: 0x05,
  START_SEQUENCE:    0x06,
  HEARTBEAT:         0x07,
  SEQUENCE_INFO:     0x09,
  STOP_SEQUENCE:     0x0A,
} as const;

export type CommandId = typeof CommandId[keyof typeof CommandId];

export const COMMAND_HEADER_SIZE = 8; 