#! /bin/python

import logging
import asyncio
import dotenv
import manageus.handler as hadl

LOGGING_LEVEL = logging.DEBUG
LOGGING_FILE = "logs/app.log"

async def main():
    logging.info("DEVICE APP STARTED")
    app = hadl.Handler("", 123456)
    
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
    asyncio.run(main())