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

            led_id = self.args.get("led_id")
            mode = self.args.get("mode")
            
            match led_id:
                case "1":
                    self._set_pin(gpio.LED_1, mode)
                case "2":
                    self._set_pin(gpio.LED_2, mode)
                case "3":
                    self._set_pin(gpio.LED_3, mode)
                case "4":
                    self._set_pin(gpio.LED_4, mode)
                case _:
                    pass

        finally:
            self._running.clear()
