from manageus.runner.base_task import Task
from playsound import playsound
import os

class AudioTask(Task):

    CONFIG_DIR = "./config/output"

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    

    def run(self):
        self._running.set()
        try:
            file_path = os.path.join(self.CONFIG_DIR, self.args.get("file"))
            playsound(file_path)
        finally:
            self._running.clear()