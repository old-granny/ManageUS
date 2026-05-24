import pygame
import sys
import threading
import time
import logging
import moviepy

# Parent Class: Singleton handler running on a background thread
class ScreenHandler:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ScreenHandler, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not ScreenHandler._initialized:
            pygame.init()
            self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
            self.clock = pygame.time.Clock()
            self.running = True
            self.current_surface = None  # Holds whatever image/surface is active
            self.lock = threading.Lock() # Prevents race conditions during image swaps
            self.logger = logging.getLogger(self.__class__.__name__)
            
            # Start the non-blocking background render loop
            self.loop_thread = threading.Thread(target=self._render_loop, daemon=True)
            self.loop_thread.start()
            self.logger.info("Screen Handler instancied")
            ScreenHandler._initialized = True
    
    def remove_surface(self):
        with self.lock:
            self.current_surface = None

    def _render_loop(self):
        """ This method runs continuously in the background thread """
        self.logger.info("Render loop started")
        while self.running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT or (event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE):
                    self.running = False

            # Draw the background color
            self.screen.fill((0, 0, 0))

            # Thread-safe blitting of the active surface
            with self.lock:
                if self.current_surface:
                    self.screen.blit(self.current_surface, (0, 0))

            pygame.display.flip()
            self.clock.tick(60)
            
        pygame.quit()

    def set_display_surface(self, pygame_surface):
        """ Allows tasks to change the screen content instantly """
        with self.lock:
            self.current_surface = pygame_surface

    def close_screen(self):
        self.running = False


# Subclass: Concrete task that pushes images without blocking code execution
class ImageDisplayTask(ScreenHandler):
    def __init__(self, imagePath):
        super().__init__()
        # Load and scale the image safely
        rawImage = pygame.image.load(imagePath)
        self.scaledImage = pygame.transform.scale(rawImage, self.screen.get_size())

    def show(self):
        """ Sets the image and exits immediately without blocking """
        self.set_display_surface(self.scaledImage)


class VideoDisplayTask(ScreenHandler):
    def __init__(self, videoPath):
        super().__init__()
        self._clip    = moviepy.VideoFileClip(videoPath)
        self._playing = threading.Event()

    def show(self):
        threading.Thread(target=self._play, daemon=True).start()

    def _play(self):
        self._playing.set()
        fps      = self._clip.fps
        interval = 1.0 / fps

        for frame in self._clip.iter_frames(dtype="uint8"):
            if not self._playing.is_set():
                break
            surface = pygame.surfarray.make_surface(frame.swapaxes(0, 1))
            scaled  = pygame.transform.scale(surface, self.screen.get_size())
            self.set_display_surface(scaled)  # thread-safe via ScreenHandler.lock
            time.sleep(interval)

        self._playing.clear()
        self._clip.close()

    def stop(self):
        self._playing.clear()


class TextDisplayTask(ScreenHandler):
    def __init__(
        self,
        text,
        font_size=48,
        text_color=(255, 255, 255),
        bg_color=(0, 0, 0),
        font_name=None,
    ):
        super().__init__()

        self.text = text
        self.bg_color = bg_color

        # Create font
        self.font = pygame.font.Font(font_name, font_size)

        # Render text
        self.text_surface = self.font.render(self.text, True, text_color)

        # Create background surface
        self.display_surface = pygame.Surface(self.screen.get_size())
        self.display_surface.fill(self.bg_color)

        # Center text
        text_rect = self.text_surface.get_rect(
            center=self.display_surface.get_rect().center
        )

        # Draw text onto background
        self.display_surface.blit(self.text_surface, text_rect)

    def show(self):
        """Sets the centered text display"""
        self.set_display_surface(self.display_surface)