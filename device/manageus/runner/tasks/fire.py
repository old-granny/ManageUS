from manageus.runner.base_task import Task
import manageus.utils.gpio as gpio

class FireTask(Task):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    

    def run(self):
        try:
            self._running.set()

            fire_id = self.args.get("fire_id")
            mode = self.args.get("mode", "ON")
            state = gpio.HIGH if mode == "ON" else gpio.LOW

            match fire_id:
                case "1":
                    gpio.output(gpio.FIRE_1, state)
                case "2":
                    gpio.output(gpio.FIRE_2, state)
                case "3":
                    gpio.output(gpio.FIRE_3, state)
                case _:
                    pass

        finally:
            self._running.clear()
