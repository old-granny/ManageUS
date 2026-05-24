from abc import abstractmethod, ABC
import tasks
import threading

class Task(ABC):

    def __init__(self, startTime, expectedEndTime, args):
        super().__init__()
        self.startTime = startTime
        self.expectedEndTime=  expectedEndTime
        self.args = args
        self.returnCode=  0
        self._running = threading.Event()

    @abstractmethod
    def run(self):
        pass


    def is_running(self):
        return self._running.is_set()

    def return_code(self) -> int:
        return self.returnCode


class NoneTask(Task):
    pass

def get_task(config) -> "Task":
    return tasks.TASK_TYPES.get(config["task_id"], NoneTask)