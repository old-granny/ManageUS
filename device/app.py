#! /bin/python

import logging
import asyncio
import dotenv
import manageus.handler as hadl
import manageus.utils.screen_handler as sc
import manageus.utils.gpio as gpio
import threading

import os
os.environ["SDL_VIDEODRIVER"] = "x11"

LOGGING_LEVEL = logging.DEBUG
LOGGING_FILE = "app.log"

def start_async_loop(loop):
    """Sets the event loop for the background thread and runs it forever."""
    asyncio.set_event_loop(loop)
    loop.run_forever()

async def main():
    logging.info("DEVICE APP STARTED")
    app = hadl.Handler("ws://10.168.70.217:3000/ws", 123456)
    
    await app.start_handler()



if __name__ == '__main__':
    dotenv.load_dotenv(".env")
    logging.basicConfig(
        level=LOGGING_LEVEL,
        format='%(asctime)s [%(name)s] - %(levelname)s - %(message)s',
        handlers=[
            #SocketHandler(os.getenv("LOG_HOST"), os.getenv("LOG_PORT")),
            logging.FileHandler(LOGGING_FILE, mode='a')
        ]
    )
    screen = sc.ScreenHandler()
    gpio.initialize()
    
    # 2. Setup background asyncio thread
    background_loop = asyncio.new_event_loop()
    async_thread = threading.Thread(
        target=start_async_loop, 
        args=(background_loop,), 
        daemon=True
    )
    async_thread.start()

    asyncio.run_coroutine_threadsafe(main(), background_loop)

    
    screen.run()