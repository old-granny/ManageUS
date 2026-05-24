import logging
import os
import zipfile
import json
import manageus.runner.task as task
import shutil

class Config:

    CONFIG_FILE_ARCH = "./config/config.zip"
    CONFIG_FILE = "./config/output/config/config.json"
    ASSETS_DIR = "./config/output/config/assets"
    CONFIG_DIR = "./config/output"

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.jsonData = None
        self.logger.info("Config created")
        self.tasks: list[task.Task] = []
    
    def get_tasks(self):
        return self.tasks

    def read(self):
        self.logger.debug("READ CONF START")
        if os.path.exists(self.CONFIG_DIR):
            self.logger.warning(f"output dir already exist. deleting it")
            shutil.rmtree(self.CONFIG_DIR)
        
        if not os.path.exists(self.CONFIG_FILE_ARCH):
            self.logger.error("No config file downloaded")
            return -1
        
        try:
            with zipfile.ZipFile(self.CONFIG_FILE_ARCH) as z:
                z.extractall(self.CONFIG_DIR)
                self.logger.info("Config File extracted")
        except Exception as e:
            self.logger.error(f"Cannot extract the config file: {e}")
            return -2
        
        if not os.path.exists(self.CONFIG_FILE):
            self.logger.error("Config file not found")
            return -3
        
        if not os.path.exists(self.ASSETS_DIR):
            self.logger.error("Assets directory not found")
            return -3
        
        try:
            with open(self.CONFIG_FILE, "r") as file:
                self.jsonData = json.loads(file.read())

            self.sceneName = self.jsonData["scene_name"]
            self.fileVersion = self.jsonData["file_version"]

            self.sequence = self.jsonData["sequence"]
            self.logger.debug(f"SEQUENCE: {self.sequence}")
        except Exception as e:
            self.logger.error(f"Wrong format for config file: {e}")
            return -4
        
        try:
            for conf in self.sequence:
                temp = task.get_task(conf)
                if temp is task.tasks.NoneTask:
                    raise Exception(f"None class detected for config: {conf}")
                self.logger.debug(f"{temp} added")
                self.tasks.append(temp)
        except Exception as e:
            self.logger.error(f"Fail parsing the config: {e}")
            return -5
        
        self.logger.info("Config reading done")
        return 0
        

        

