from runner.task import Task
from playsound import playsound

class AudioTask(Task):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    

    def run(self):
        self._running.set()
        try:
            playsound(self.args.get("file"))
        finally:
            self._running.clear()