from manageus.runner.base_task import Task
import manageus.utils.gpio as gpio
import time

class RopeTask(Task):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    

    def run(self):
        self._running.set()
        try:
            mode = self.args.get("mode")
            if mode == "UP":
                gpio.output(17, gpio.HIGH)
            elif mode == "DOWN":
                gpio.output(27, gpio.HIGH)

            elapse = self.expectedEndTime-self.startTime
            time.sleep(elapse)

            gpio.output(17, gpio.LOW)
            gpio.output(27, gpio.LOW)
        finally:
            self._running.clear()
