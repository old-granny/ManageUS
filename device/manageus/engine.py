import logging
import threading
import queue
import utils.headers as headers
from enum import Enum
import runner.config as config
import time

class EngineCode(Enum):
    ENGINE_SUCCESS=0
    ENGINE_STILL_RUNNING_CODE = 1
    ENGINE_INTERRUPT = -1
    ENGINE_WRONG_CONFIG = -2

class Engine:

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

        self.sendQueue:queue.Queue[headers.Command] = queue.Queue()
        
        self.runner = threading.Thread(target=self._runner, daemon=True)
        self.runnerExitCode = 0
        self.erno = 0
        self.logger.info("Engine Instancied")

        self.stopEvent = threading.Event()
    

    def get_msg(self):
        if self.sendQueue.empty():
            return None
        
        return self.sendQueue.get_nowait()
    
    def get_runner_exit_code(self):
        if self.runner.is_alive():
            self.logger.warning("Runner still running.. ignoring")
            return EngineCode.ENGINE_STILL_RUNNING_CODE
        
        return self.runnerExitCode
    
    def arranged_task_frame(self, tasks: list[config.task.Task], runtimeTick: float, frameBuffSecond: float = 3.0) -> dict:
        window_end = runtimeTick + frameBuffSecond
        frame: dict[float, list] = {}
        cnt = 0

        for task in tasks:
            if task.startTime >= window_end:
                break
            frame.setdefault(task.startTime, []).append(task)
            cnt+=1

        return frame, cnt


    def _runner(self):
        conf = config.Config()
        retCode = conf.read()
        if retCode < 0:
            self.erno = retCode
            self.runnerExitCode = EngineCode.ENGINE_WRONG_CONFIG
            return

        tasks = sorted(conf.get_tasks(), key=lambda t: t.startTime)

        runnerTime      = 0.0
        frameBuffSecond = 3.0
        task_cursor     = 0

        frame, cnt          = self.arranged_task_frame(tasks[task_cursor:], runnerTime, frameBuffSecond)
        next_recompute = runnerTime + frameBuffSecond

        while not self.stopEvent.is_set():
            time.sleep(0.1)
            runnerTime += 0.1

            if runnerTime >= next_recompute:
                task_cursor   += cnt  # skip all tasks from the exhausted frame
                frame,cnt          = self.arranged_task_frame(tasks[task_cursor:], runnerTime, frameBuffSecond)
                next_recompute = runnerTime + frameBuffSecond
            
            if task_cursor >= len(tasks):
                break

            if runnerTime in frame:
                for task in frame[runnerTime]:
                    if self.stopEvent.is_set():
                        break
                    if not task.is_running():
                        threading.Thread(target=task.run, daemon=True).start()
        
        if not self.stopEvent:
            self.runnerExitCode = EngineCode.ENGINE_SUCCESS
        else:
            self.runnerExitCode = EngineCode.ENGINE_INTERRUPT


    def download_config(self, payload: bytes):
        with open(config.Config.CONFIG_FILE_ARCH, "wb") as f:
            f.write(payload)

    def start_runner(self):
        if self.runner.is_alive():
            self.logger.warning("Runner already running! Ignoring the command")
            return False
        self.stopEvent.clear()
        self.runner.start()
        return True


    def stop_runner(self):
        if not self.runner.is_alive():
            self.logger.warning("Runner not started")
            return False
        
        self.stopEvent.set()