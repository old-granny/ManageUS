import logging
import threading
import queue
import manageus.utils.headers as headers
from enum import Enum
import manageus.runner.config as config
import time

class EngineCode(Enum):
    ENGINE_SUCCESS=0
    ENGINE_STILL_RUNNING_CODE = 1
    ENGINE_INTERRUPT = -1
    ENGINE_WRONG_CONFIG = -2
    ENGINE_ERROR = -3

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
    
    def arranged_task_frame(self, tasks: list[config.task.tasks.Task], runtimeTick: float, frameBuffSecond: float = 3.0) -> dict:
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
        self.logger.debug("ENGINE RUNNER ON")
        conf = config.Config()
        retCode = conf.read()
        if retCode < 0:
            self.erno = retCode
            self.runnerExitCode = EngineCode.ENGINE_WRONG_CONFIG
            return
        try:
            tasks = sorted(conf.get_tasks(), key=lambda t: t.startTime)

            TICK            = 0.05   # smaller tick → better timing resolution
            frameBuffSecond = 3.0
            task_cursor     = 0

            frame, cnt     = self.arranged_task_frame(tasks, 0.0, frameBuffSecond)
            next_recompute = frameBuffSecond

            # Use a real clock so accumulated sleep error never drifts
            start_real = time.perf_counter()

            self.logger.debug(f"Initial frame: {list(frame.keys())}")

            while not self.stopEvent.is_set():
                runnerTime = time.perf_counter() - start_real

                # 1. Fire every task whose scheduled time has arrived, then
                #    remove it from the frame so it is never re-checked.
                due = sorted(t for t in frame if runnerTime >= t)
                for scheduled_time in due:
                    for task in frame[scheduled_time]:
                        if self.stopEvent.is_set():
                            break
                        if not task.is_running():
                            self.logger.info(f"Starting task at t={scheduled_time:.3f}s")
                            threading.Thread(target=task.run, daemon=True).start()
                    del frame[scheduled_time]

                # 2. Advance to the next frame window when the current one expires.
                #    Always update next_recompute so we don't re-enter every tick.
                if runnerTime >= next_recompute:
                    task_cursor += cnt
                    if task_cursor < len(tasks):
                        frame, cnt = self.arranged_task_frame(
                            tasks[task_cursor:], runnerTime, frameBuffSecond
                        )
                    next_recompute = runnerTime + frameBuffSecond

                # 3. Exit once every task has been scheduled and finished running.
                if task_cursor >= len(tasks) and not frame:
                    if all(not t.is_running() for t in tasks):
                        break

                # stopEvent.wait() doubles as sleep AND instant wake-up on stop
                self.stopEvent.wait(TICK)

        except Exception as e:
            self.logger.error(f"Fail with the engine Sequence {e}")
            self.runnerExitCode = EngineCode.ENGINE_ERROR

        if not self.stopEvent.is_set():
            self.runnerExitCode = EngineCode.ENGINE_SUCCESS
        else:
            self.runnerExitCode = EngineCode.ENGINE_INTERRUPT

        self.logger.info(f"EXIT CODE {self.runnerExitCode}")


    def download_config(self, payload: bytes):
        with open(config.Config.CONFIG_FILE_ARCH, "wb") as f:
            f.write(payload)

    def start_runner(self):
        if self.runner.is_alive():
            self.logger.warning("Runner already running! Ignoring the command")
            return False
        self.stopEvent.clear()
        self.runner = threading.Thread(target=self._runner, daemon=True)
        self.runner.start()
        return True


    def stop_runner(self):
        if not self.runner.is_alive():
            self.logger.warning("Runner not started")
            return False
        
        self.stopEvent.set()