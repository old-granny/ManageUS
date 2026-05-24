// session.ts
import { IDevice } from "src/device/device";

export enum ESessionState {
  CONNECTED,
  HELLO_SENT,
  READY,
  DOWNLOADING,
  RUNNING,
  STOPPING,
}

export interface ISession {
  client: WebSocket;
  state: ESessionState;
  lastSentCommand: number | null;
  deviceState: IDevice | null;
}