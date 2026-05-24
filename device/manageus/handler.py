import logging
import asyncio
from enum import Enum

import utils.socket_client as sock
import utils.headers as headers
import engine as en
import json
import utils.gpio as gpio
import utils.screen_handler as sc

class Handler:
    class HandlerState(Enum):
        INIT = 0
        DISCONNECTED = 1
        IDLE = 2
        RUNNING = 3
        ERROR = 4

    
    RETRY_DELAY_S = 4
    HEART_BEAT_DELAY_S = 1
    
    def __init__(self, url, serialNumber):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.server = sock.SocketClient(url)
        self.engine = en.Engine()
        self.state = self.HandlerState.INIT
        self.serialNumber = serialNumber
        self.pairingCode = 0
        self.logger.info(f"Handler instancied for {self.serialNumber}")
        self._setup_gpio()
        self._setup_screen()

    def _setup_screen(self):
        sc.ScreenHandler()

    def _setup_gpio(self):
        gpio.setmode(gpio.BCM)
        gpio.setup(gpio.ROPE_DOWN, gpio.OUT)
        gpio.setup(gpio.ROPE_UP, gpio.OUT)
        gpio.setup(gpio.FIRE_1, gpio.OUT)
        gpio.setup(gpio.FIRE_2, gpio.OUT)
        gpio.setup(gpio.FIRE_3, gpio.OUT)
        gpio.setup(gpio.LED_1, gpio.OUT)
        gpio.setup(gpio.LED_2, gpio.OUT)
        gpio.setup(gpio.LED_3, gpio.OUT)
        gpio.setup(gpio.LED_4, gpio.OUT)
        gpio.setup(gpio.CURTAINS_OPEN, gpio.OUT)
        gpio.setup(gpio.CURTAINS_CLOSE, gpio.OUT)

    async def _check_internet(self, host="8.8.8.8", port=53, timeout=3.0):
        try:
            await asyncio.wait_for(
                asyncio.open_connection(host, port), 
                timeout=timeout
            )
            return True
        except (asyncio.TimeoutError, OSError):
            return False
    
    async def _heart_beat(self):
        self.logger.info("HEARTBEAT SEQUENCE STARTED")
        while True:
            heartBeatMsg = {
                "serial_number": self.serialNumber,
                "state": self.state,
                "pairing": self.pairingCode
            }

            msg = headers.Command(headers.HEARTBEAT, 0, 0, 0, json.dumps(heartBeatMsg).encode())
            await self.server.add_msg(msg)
            await asyncio.sleep(self.HEART_BEAT_DELAY_S)


    async def _msg_management(self):
        asyncio.create_task(self._heart_beat())
        self.logger.info("MSG MANAGEMENT STARTED")
        while True:
            engineMsg = self.engine.get_msg()
            if engineMsg is not None:
                self.server.add_msg(engineMsg)

    async def _send_ack(self):
        msg = headers.Command(headers.ACK, 0, 0, 0, [])
        await self.server.add_msg(msg)

    async def _send_nack(self):
        msg = headers.Command(headers.NACK, 0, 0, 0, [])
        await self.server.add_msg(msg)

    async def _main_loop(self):
        t = sc.TextDisplayTask(f"Paring number: {self.serialNumber}")
        while True:
            income = await self.server.get_msg()
            
            match income.commandId:
                case headers.HELLO:
                    if self.pairingCode == 0:
                        msg = headers.Command(headers.HELLO_ACK, 0, 0, 0, [])
                        t.remove_surface()
                        await self.server.add_msg(msg)
                    else:
                        await self._send_nack()
                case headers.START_SEQUENCE:
                    if self.engine.start_runner():
                        await self._send_ack()
                    else:
                        await self._send_nack()
                case headers.STOP_SEQUENCE:
                    if self.engine.stop_runner():
                        await self._send_ack()
                    else:
                        await self._send_nack()
                case headers.DOWNLOAD_SEQUENCE:
                    await asyncio.to_thread(self.engine.download_config(income.payload))
                    await self._send_ack()
                case _:
                    self.logger.warning("Unknown command.. ignoring")
            

    async def start_handler(self):
        sc.TextDisplayTask("Checking WIFI connection...").show()
        while not await self._check_internet():
            self.logger.critical(f"No internet connection.. retrying in {self.RETRY_DELAY_S} seconds")
            await asyncio.sleep(self.RETRY_DELAY_S)
        
        sc.TextDisplayTask("Checking Server connection...").show()
        while not await self.server.connect():
            self.logger.warning(f"Can't connect to the server right now... retrying in {self.RETRY_DELAY_S} seconds")
            await asyncio.sleep(self.RETRY_DELAY_S)
        
        self.tick = asyncio.create_task(self._msg_management())


        self.state = self.HandlerState.IDLE

        try:
            await asyncio.gather(self._main_loop())
        finally:
            gpio.cleanup()