export enum EDeviceState {
    INIT,
    DISCONNECTED,
    IDLE,
    RUNNING,
    ERROR
};

export interface IDevice {
    serial_number: number;
    state:EDeviceState;
    pairing:number
};