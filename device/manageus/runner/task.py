import manageus.runner.tasks as tasks

def get_task(config) -> "tasks.Task":
    return tasks.TASK_TYPES.get(config["task_id"], tasks.NoneTask)(config["start_time"], config["expected_end_time"], config["args"])