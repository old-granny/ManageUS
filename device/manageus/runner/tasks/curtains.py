from runner.task import Task
import utils.gpio as gpio
import time

class CurtainsTask(Task):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    

    def run(self):
        try:
            self._running.set()

            mode = self.args.get("mode")

            if mode == "OPEN":
                gpio.output(gpio.CURTAINS_OPEN, gpio.HIGH)
            elif mode == "CLOSE":
                gpio.output(gpio.CURTAINS_CLOSE, gpio.HIGH)
            
            elapse = self.expectedEndTime - self.startTime

            time.sleep(elapse)

            gpio.output(gpio.CURTAINS_OPEN, gpio.LOW)
            gpio.output(gpio.CURTAINS_CLOSE, gpio.LOW)

        finally:
            self._running.clear()
