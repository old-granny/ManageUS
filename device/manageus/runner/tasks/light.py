from manageus.runner.base_task import Task
import manageus.utils.gpio as gpio


class LightTask(Task):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__(startTime, expectedEndTime, args)
    
    def _set_pin(self, pin, mode):
        if mode == "ON":
            gpio.output(pin, gpio.HIGH)
        elif mode == "OFF":
            gpio.output(pin, gpio.LOW)

    def run(self):
        try:
            self._running.set()

            id = self.args.get("ID")
            mode = self.args.get("mode")
            
            match id:
                case "LED_1":
                    self._set_pin(gpio.LED_1, mode)
                case "LED_2":
                    self._set_pin(gpio.LED_2, mode)
                case "LED_3":
                    self._set_pin(gpio.LED_3, mode)
                case "LED_4":
                    self._set_pin(gpio.LED_4, mode)
                case _:
                    pass

        finally:
            self._running.clear()
