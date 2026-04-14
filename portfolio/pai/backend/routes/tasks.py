from flask import Blueprint, request, jsonify
import requests
import os
import datetime
import re
from models.task_store import get_all_tasks, add_task, update_task_status, get_memory_context, add_memory

tasks_bp = Blueprint('tasks', __name__)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

@tasks_bp.route('/tasks', methods=['GET'])
def get_tasks():
    return jsonify(get_all_tasks())

@tasks_bp.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = add_task(data['title'], data['scheduledTime'], data.get('description', ''))
    return jsonify(task), 201

@tasks_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task = update_task_status(task_id, data['status'])
    return jsonify(task) if task else (jsonify({"error": "Not found"}), 404)

@tasks_bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get('message', '')
    history = data.get('history', [])
    
    # 1. Build Context
    today = datetime.date.today().isoformat()
    active_tasks = [t for t in get_all_tasks() if t['status'] != 'done']
    memory = get_memory_context()
    
    system_prompt = f"""
    You are PAI, a high-performance productivity mentor.
    Date: {today}
    User Memory: {memory}
    Active Sprint: {len(active_tasks)} tasks.
    
    RULES:
    - AI PERSONALITY: Professional, motivational, and concise. Use Emojis! 🚀
    - FORMATTING: Never write lists inline. ALWAYS use bullet points and structure your output with line breaks for readability.
    - AGENTIC ACTION: To add multiple tasks, use [AGENT_ADD_TASKS: Task1 | Task2 | Task3].
    - MEMORY: To remember a fact, use [MEMORY_UPDATE: User likes X].
    - RESPONSE: Focus on the user's goal. Don't repeat yourself.
    """

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-6:]:
        messages.append({"role": "user" if h['type'] == 'user' else "assistant", "content": h['text']})
    messages.append({"role": "user", "content": user_msg})

    try:
        payload = {
            "model": "meta/llama-3.1-8b-instruct",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 512
        }
        headers = {"Authorization": f"Bearer {NVIDIA_API_KEY}"}
        response = requests.post(API_URL, headers=headers, json=payload, timeout=25)
        response.raise_for_status()
        ai_reply = response.json()['choices'][0]['message']['content']
        
        # 2. Intercept Agentic Tags
        action_tasks = []
        
        # Tasks intercept
        task_match = re.search(r'\[AGENT_ADD_TASKS:\s*(.*?)\]', ai_reply)
        if task_match:
            task_list = [t.strip() for t in task_match.group(1).split('|')]
            for t_title in task_list:
                new_t = add_task(t_title, today)
                action_tasks.append(new_t)
            ai_reply = re.sub(r'\[AGENT_ADD_TASKS:.*?\]', '', ai_reply).strip()

        # Memory intercept
        mem_match = re.search(r'\[MEMORY_UPDATE:\s*(.*?)\]', ai_reply)
        if mem_match:
            add_memory(mem_match.group(1))
            ai_reply = re.sub(r'\[MEMORY_UPDATE:.*?\]', '', ai_reply).strip()

        return jsonify({
            "reply": ai_reply,
            "actionTasks": action_tasks
        })

    except Exception as e:
        return jsonify({"error": str(e), "reply": "Connection issue. Stay focused!"}), 500
