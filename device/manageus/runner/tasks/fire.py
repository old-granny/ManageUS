from manageus.runner.base_task import Task
import manageus.utils.gpio as gpio

class FireTask(Task):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    

    def run(self):
        try:
            self._running.set()

            id = self.args.get("ID")

            match id:
                case "FIRE_1":
                    gpio.output(gpio.FIRE_1, gpio.HIGH)
                case "FIRE_2":
                    gpio.output(gpio.FIRE_2, gpio.HIGH)
                case "FIRE_3":
                    gpio.output(gpio.FIRE_3, gpio.HIGH)
                case _:
                    pass

        finally:
            self._running.clear()
