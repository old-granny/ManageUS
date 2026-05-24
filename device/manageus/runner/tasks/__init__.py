from audio import AudioTask
from rope import RopeTask
from curtains import CurtainsTask
from fire import FireTask
from light import LightTask
from screen import ScreenTask

TASK_TYPES = {
    "audio": AudioTask,
    "rope": RopeTask,
    "curtains": CurtainsTask,
    "fire": FireTask,
    "light": LightTask,
    "screen": ScreenTask
}