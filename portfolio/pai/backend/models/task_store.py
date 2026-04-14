import json

# In-memory storage for tasks and user memory
tasks = []
user_memory = []

def get_all_tasks():
    return tasks

def add_task(title, scheduled_time, description=""):
    task = {
        "id": len(tasks) + 1,
        "title": title,
        "scheduledTime": scheduled_time,
        "description": description,
        "status": "pending"
    }
    tasks.append(task)
    return task

def update_task_status(task_id, status):
    for t in tasks:
        if t["id"] == task_id:
            t["status"] = status
            return t
    return None

def get_memory_context():
    return "\n".join([f"- {m}" for m in user_memory])

def add_memory(fact):
    if fact not in user_memory:
        user_memory.append(fact)
