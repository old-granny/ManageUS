from runner.task import Task
import pygame
from utils.screen_handler import VideoDisplayTask, ImageDisplayTask
import time
import logging

class ScreenTask(Task):

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
                    img = ImageDisplayTask(path)
                    img.show()
                    elapse = self.expectedEndTime - self.startTime
                    time.sleep(elapse)
                    img.remove_surface()

                elif type == "VIDEO":
                    VideoDisplayTask(path).show()
        finally:
            self._running.clear()