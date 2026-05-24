from manageus.runner.base_task import Task
import pygame
from manageus.utils.screen_handler import VideoDisplayTask, ImageDisplayTask
import time
import logging
import os

class ScreenTask(Task):
    CONFIG_DIR = "./config/output"
    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
        self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
    

    def run(self):
        try:
            self._running.set()

            type = self.args.get("MEDIA_TYPE")
            path = self.args.get("PATH")
            id = self.args.get("ID")

            if path:
                logging.info(f"SHOWING AT ID : {id}")
                if type == "IMAGE":
                    img = ImageDisplayTask(os.path.join(self.CONFIG_DIR, path))
                    img.show()
                    elapse = self.expectedEndTime - self.startTime
                    time.sleep(elapse)
                    img.remove_surface()

                elif type == "VIDEO":
                    VideoDisplayTask(os.path.join(self.CONFIG_DIR, path)).show()
        finally:
            self._running.clear()