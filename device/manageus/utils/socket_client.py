import asyncio
import logging
import websockets.asyncio.client as ws
import headers

class SocketClient:
    
    def __init__(self, url):
        self.url = url
        self.logger = logging.getLogger(self.__class__.__name__)


        self.connection = None
        self.sendQueue: asyncio.Queue[headers.Command] = asyncio.Queue()
        self.rcvQueue: asyncio.Queue[headers.Command] = asyncio.Queue()

        self.logger.info("Socket client instanciated")

    

    async def connect(self):
        if self.connection:
            self.logger.warning("Already connect to the server.. skipping")
            return True
        
        try:
            self.connection = await ws.connect(self.url)
            self.logger.info("Connection ready")
            return True
        except Exception as e:
            self.logger.error(f"Can't connect to the {self.url}: {e}")
            self.connection = None
            return False
    

    async def disconnect(self):
        if self.connection is None:
            self.logger.warning("Already disconnected")
            return True

        try:
            await self.connection.close()
            self.connection = None
            self.logger.info("Disconnected with the server")
            return True
        except Exception as e:
            self.logger.error(f"Fail to disconnect with the server")
            return False

    async def add_msg(self, msg:headers.Command):
        await self.sendQueue.put(msg)


    async def get_msg(self):
        return await self.rcvQueue.get()

    async def _send(self):
        while True:
            try:
                msg = await self.sendQueue.get()
                await self.connection.send(msg.pack())
            except Exception as e:
                self.logger.error(f"Failing sending message: {e}")
    

    async def _read(self):
        while True:
            try:
                raw = await self.connection.recv(False)
                cmd = headers.Command.unpack(raw)
                await self.rcvQueue.put(cmd)
            except Exception as e:
                self.logger.error(f"Fail reading the message: {e}")