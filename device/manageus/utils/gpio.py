import platform

def _is_pi() -> bool:
    try:
        with open("/proc/device-tree/model") as f:
            return "Raspberry Pi" in f.read()
    except FileNotFoundError:
        return False


# MAPPING WITH RASPI GPIO PINS
ROPE_UP=17
ROPE_DOWN=27

FIRE_1 = 6
FIRE_2 = 5
FIRE_3 = 4

LED_1 = 10
LED_2 = 9
LED_3 = 11
LED_4 = 25

CURTAINS_OPEN =  26
CURTAINS_CLOSE = 16


if _is_pi():
    import RPi.GPIO as _gpio # pyright: ignore[reportMissingModuleSource]

    def setup(pin, mode):       _gpio.setup(pin, mode)
    def output(pin, state):     _gpio.output(pin, state)
    def input(pin) -> bool:     return _gpio.input(pin)
    def setmode(mode):          _gpio.setmode(mode)
    def cleanup():              _gpio.cleanup()

    BCM = _gpio.BCM
    OUT = _gpio.OUT
    IN  = _gpio.IN
    HIGH = _gpio.HIGH
    LOW  = _gpio.LOW

    def initialize():
        _gpio.setmode(_gpio.BCM)
        for pin in [LED_1, LED_2, LED_3, LED_4,
                    FIRE_1, FIRE_2, FIRE_3,
                    ROPE_UP, ROPE_DOWN,
                    CURTAINS_OPEN, CURTAINS_CLOSE]:
            _gpio.setup(pin, _gpio.OUT, initial=_gpio.LOW)

else:
    import logging
    log = logging.getLogger("[GPIO]")

    _pins: dict[int, bool] = {}

    BCM  = "BCM"
    OUT  = "OUT"
    IN   = "IN"
    HIGH = True
    LOW  = False

    def setmode(mode):
        log.info(f"setmode({mode})")

    def setup(pin, mode, initial=False):
        _pins[pin] = initial
        log.info(f"setup(pin={pin}, mode={mode}, initial={initial})")

    def initialize():
        log.info("initialize() [stub]")
        for pin in [LED_1, LED_2, LED_3, LED_4,
                    FIRE_1, FIRE_2, FIRE_3,
                    ROPE_UP, ROPE_DOWN,
                    CURTAINS_OPEN, CURTAINS_CLOSE]:
            setup(pin, OUT, initial=False)

    def output(pin, state):
        _pins[pin] = state
        log.info(f"output(pin={pin}, state={state})")

    def input(pin) -> bool:
        val = _pins.get(pin, False)
        log.info(f"input(pin={pin}) -> {val}")
        return val

    def cleanup():
        _pins.clear()
        log.info("cleanup()")