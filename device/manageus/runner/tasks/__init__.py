from manageus.runner.tasks.audio import AudioTask
from manageus.runner.tasks.rope import RopeTask
from manageus.runner.tasks.curtains import CurtainsTask
from manageus.runner.tasks.fire import FireTask
from manageus.runner.tasks.light import LightTask
from manageus.runner.tasks.screen import ScreenTask
from manageus.runner.base_task import Task

class NoneTask(Task):
    None

TASK_TYPES = {
    "audio": AudioTask,
    "rope": RopeTask,
    "curtains": CurtainsTask,
    "fire": FireTask,
    "light": LightTask,
    "screen": ScreenTask
}