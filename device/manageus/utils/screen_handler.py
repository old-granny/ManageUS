import pygame
import threading
import queue
import time
import logging
import moviepy
import numpy as np


class ScreenHandler:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self._initialized = True

        self.logger = logging.getLogger("ScreenHandler")
        self.running = threading.Event()
        self.running.set()

        self.command_queue = queue.Queue()

        self.screen = None
        self.clock = None
        self.current_surface = None

    # ------------------------
    # RENDER LOOP (MUST CALL FROM MAIN THREAD)
    # ------------------------
    def run(self):
        """Blocks and runs the Pygame event/render loop on the main thread."""
        pygame.init()
        pygame.mouse.set_visible(False)

        self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
        self.clock = pygame.time.Clock()

        self.logger.info("Render loop started on main thread")

        while self.running.is_set():
            # EVENTS
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running.clear()
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        self.running.clear()

            # COMMANDS
            self._process_commands()

            # DRAW
            self.screen.fill((0, 0, 0))

            if self.current_surface:
                self.screen.blit(self.current_surface, (0, 0))

            pygame.display.flip()
            self.clock.tick(60)

        pygame.quit()

    def _process_commands(self):
        while True:
            try:
                cmd = self.command_queue.get_nowait()
            except queue.Empty:
                break

            t = cmd["type"]

            if t == "IMAGE":
                self._cmd_image(cmd)
            elif t == "TEXT":
                self._cmd_text(cmd)
            elif t == "VIDEO_FRAME":
                self._cmd_video_frame(cmd)
            elif t == "CLEAR":
                self.current_surface = None

    # ------------------------
    # COMMAND IMPLEMENTATIONS
    # ------------------------
    def _cmd_image(self, cmd):
        # Note: Depending on image size, loading here might cause a slight frame stutter.
        # For heavy images, consider loading the surface in the worker thread and passing it.
        img = pygame.image.load(cmd["path"]).convert()
        img = pygame.transform.scale(img, self.screen.get_size())
        self.current_surface = img

    def _cmd_text(self, cmd):
        surface = pygame.Surface(self.screen.get_size())
        surface.fill(cmd["bg_color"])

        # Use default font if none provided
        font_name = cmd["font_name"] or pygame.font.get_default_font()
        font = pygame.font.Font(font_name, cmd["font_size"])
        text_surface = font.render(cmd["text"], True, cmd["text_color"])

        rect = text_surface.get_rect(center=surface.get_rect().center)
        surface.blit(text_surface, rect)

        self.current_surface = surface

    def _cmd_video_frame(self, cmd):
        frame = cmd["frame"]
        surface = pygame.surfarray.make_surface(frame.swapaxes(0, 1))
        surface = pygame.transform.scale(surface, self.screen.get_size())
        self.current_surface = surface

    # ------------------------
    # PUBLIC API (THREAD SAFE)
    # ------------------------
    def show_image(self, path):
        self.command_queue.put({"type": "IMAGE", "path": path})

    def show_text(self, text, font_size=48, text_color=(255, 255, 255), bg_color=(0, 0, 0), font_name=None):
        self.command_queue.put({
            "type": "TEXT",
            "text": text,
            "font_size": font_size,
            "text_color": text_color,
            "bg_color": bg_color,
            "font_name": font_name
        })

    def show_video_frames(self, frames):
        def worker():
            for f in frames:
                if not self.running.is_set():
                    break
                self.command_queue.put({"type": "VIDEO_FRAME", "frame": f})
                time.sleep(1 / 30)

        threading.Thread(target=worker, daemon=True).start()

    def clear(self):
        self.command_queue.put({"type": "CLEAR"})

    def close(self):
        self.running.clear()


# Task definitions remain the same
class ImageDisplayTask:
    def __init__(self, path):
        self.screen = ScreenHandler()
        self.path = path

    def show(self):
        self.screen.show_image(self.path)

    def remove_surface(self):
        self.screen.clear()



class VideoDisplayTask:
    def __init__(self, path):
        self.screen = ScreenHandler()
        self.clip = moviepy.VideoFileClip(path)

    def show(self):
        frames = self.clip.iter_frames(dtype="uint8")
        self.screen.show_video_frames(frames)


class TextDisplayTask:
    def __init__(self, text):
        self.screen = ScreenHandler()
        self.text = text

    def show(self):
        self.screen.show_text(self.text)