"""
Main server for phone control application using MAI-UI-8B model.
"""
import os
import sys
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../src"))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from adb_controller import ADBController
from mai_naivigation_agent import MAIUINaivigationAgent


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Request/Response models
class ExecuteRequest(BaseModel):
    instruction: str


class TapRequest(BaseModel):
    x: int
    y: int


class SwipeRequest(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    duration: int = 300


class TextRequest(BaseModel):
    text: str


class KeyRequest(BaseModel):
    key: str  # BACK, HOME, ENTER, etc.


# Global state
class AppState:
    def __init__(self):
        self.adb: Optional[ADBController] = None
        self.agent: Optional[MAIUINaivigationAgent] = None
        self.execution_history: List[Dict[str, Any]] = []
        self.current_task: Optional[str] = None
        self.is_running = False
        self.websocket_clients: List[WebSocket] = []

    def reset(self):
        """Reset application state."""
        self.execution_history = []
        self.current_task = None
        self.is_running = False
        if self.agent:
            self.agent.reset()


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager."""
    # Initialize ADB
    try:
        app_state.adb = ADBController()
        logger.info(f"ADB initialized: {app_state.adb.screen_width}x{app_state.adb.screen_height}")
    except Exception as e:
        logger.error(f"Failed to initialize ADB: {e}")
        logger.warning("Application will start but ADB features will be unavailable")

    # Initialize MAI-UI Agent
    try:
        app_state.agent = MAIUINaivigationAgent(
            llm_base_url="http://10.184.60.127:8090/v1",
            model_name="MAI-UI-8B",
            runtime_conf={
                "history_n": 1,  # 只保留最近1步历史，避免超出模型长度限制
                "temperature": 0.0,
                "top_k": -1,
                "top_p": 1.0,
                "max_tokens": 2048,
            },
        )
        logger.info("MAI-UI Agent initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize MAI-UI Agent: {e}")
        logger.warning("Application will start but AI agent features will be unavailable")

    yield

    # Cleanup
    logger.info("Shutting down...")


app = FastAPI(title="Phone Controller - MAI-UI", lifespan=lifespan)

# Mount static files
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")
app.mount("/templates", StaticFiles(directory="../frontend/templates"), name="templates")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve main page."""
    with open("../frontend/templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/status")
async def get_status():
    """Get current status."""
    return {
        "adb_connected": app_state.adb is not None,
        "screen_size": {
            "width": app_state.adb.screen_width if app_state.adb else 0,
            "height": app_state.adb.screen_height if app_state.adb else 0,
        } if app_state.adb else None,
        "is_running": app_state.is_running,
        "current_task": app_state.current_task,
    }


@app.get("/api/screenshot")
async def get_screenshot():
    """Get current screenshot."""
    if not app_state.adb:
        raise HTTPException(status_code=400, detail="ADB not initialized")

    try:
        screenshot = app_state.adb.capture_screen()
        import base64
        return {
            "image": base64.b64encode(screenshot).decode('utf-8'),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tap")
async def tap(request: TapRequest):
    """Tap on screen."""
    if not app_state.adb:
        raise HTTPException(status_code=400, detail="ADB not initialized")

    try:
        app_state.adb.tap(request.x, request.y)
        return {"status": "success", "action": "tap", "x": request.x, "y": request.y}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/swipe")
async def swipe(request: SwipeRequest):
    """Swipe on screen."""
    if not app_state.adb:
        raise HTTPException(status_code=400, detail="ADB not initialized")

    try:
        app_state.adb.swipe(request.x1, request.y1, request.x2, request.y2, request.duration)
        return {
            "status": "success",
            "action": "swipe",
            "start": [request.x1, request.y1],
            "end": [request.x2, request.y2],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/input")
async def input_text(request: TextRequest):
    """Input text."""
    if not app_state.adb:
        raise HTTPException(status_code=400, detail="ADB not initialized")

    try:
        app_state.adb.input_text(request.text)
        return {"status": "success", "action": "input", "text": request.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/key")
async def press_key(request: KeyRequest):
    """Press key."""
    if not app_state.adb:
        raise HTTPException(status_code=400, detail="ADB not initialized")

    try:
        app_state.adb.press_key(request.key)
        return {"status": "success", "action": "key", "key": request.key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/execute")
async def execute_task(request: ExecuteRequest):
    """Execute a task using the agent."""
    if not app_state.adb:
        raise HTTPException(status_code=400, detail="ADB not initialized")

    if not app_state.agent:
        raise HTTPException(status_code=400, detail="Agent not initialized")

    if app_state.is_running:
        raise HTTPException(status_code=400, detail="Another task is already running")

    try:
        app_state.reset()
        app_state.current_task = request.instruction
        app_state.is_running = True

        # Run task in background
        asyncio.create_task(run_task(request.instruction))

        return {"status": "started", "task": request.instruction}

    except Exception as e:
        app_state.is_running = False
        raise HTTPException(status_code=500, detail=str(e))


async def run_task(instruction: str):
    """Run task in background."""
    try:
        max_steps = 20
        step_count = 0

        while step_count < max_steps and app_state.is_running:
            # Capture screen
            screenshot = app_state.adb.capture_screen_to_pil()

            # Get prediction from MAI-UI agent
            obs = {"screenshot": screenshot}
            prediction_text, action = app_state.agent.predict(instruction, obs)

            # Record step
            step = {
                "step": step_count + 1,
                "prediction": prediction_text,
                "action": action,
                "timestamp": datetime.now().isoformat(),
            }
            app_state.execution_history.append(step)

            # Broadcast to websocket clients
            await broadcast_update(step)

            # Check if we should terminate
            if not action or action.get("action") is None:
                logger.info("Agent returned no action or error")
                break

            action_type = action.get("action")
            logger.info(f"[DEBUG] Action type: {action_type}, Full action: {action}")

            if action_type == "terminate":
                app_state.is_running = False
                logger.info(f"Task terminated with status: {action.get('status')}")
                break

            elif action_type == "wait":
                logger.info("[DEBUG] Executing: wait")
                await asyncio.sleep(1)

            elif action_type == "answer":
                logger.info(f"[DEBUG] Executing: answer - {action.get('text')}")

            elif action_type == "click":
                coord = action.get("coordinate", [])
                logger.info(f"[DEBUG] Executing: click, raw coordinate: {coord}")
                if len(coord) == 2:
                    x = int(coord[0] * app_state.adb.screen_width)
                    y = int(coord[1] * app_state.adb.screen_height)
                    logger.info(f"[DEBUG] Screen size: {app_state.adb.screen_width}x{app_state.adb.screen_height}, Calculated pixels: ({x}, {y})")
                    app_state.adb.tap(x, y)
                    logger.info(f"Clicked at ({x}, {y})")
                    await asyncio.sleep(1)
                else:
                    logger.error(f"[ERROR] Invalid coordinate format: {coord}")

            elif action_type == "long_press":
                coord = action.get("coordinate", [])
                if len(coord) == 2:
                    x = int(coord[0] * app_state.adb.screen_width)
                    y = int(coord[1] * app_state.adb.screen_height)
                    app_state.adb.long_press(x, y)
                    logger.info(f"Long pressed at ({x}, {y})")
                    await asyncio.sleep(1)

            elif action_type == "type":
                text = action.get("text", "")
                app_state.adb.input_text(text)
                logger.info(f"Typed text: {text}")
                await asyncio.sleep(0.5)

            elif action_type == "swipe":
                direction = action.get("direction", "up")
                coord = action.get("coordinate", [])
                if len(coord) == 2:
                    x = int(coord[0] * app_state.adb.screen_width)
                    y = int(coord[1] * app_state.adb.screen_height)
                    # Calculate swipe direction
                    if direction == "up":
                        x1, y1, x2, y2 = x, y, x, y - 500
                    elif direction == "down":
                        x1, y1, x2, y2 = x, y, x, y + 500
                    elif direction == "left":
                        x1, y1, x2, y2 = x, y, x - 500, y
                    elif direction == "right":
                        x1, y1, x2, y2 = x, y, x + 500, y
                    else:
                        x1, y1, x2, y2 = x, y, x, y - 500
                    app_state.adb.swipe(x1, y1, x2, y2)
                    logger.info(f"Swiped {direction} from ({x1}, {y1}) to ({x2}, {y2})")
                    await asyncio.sleep(1)

            elif action_type == "drag":
                start_coord = action.get("start_coordinate", [])
                end_coord = action.get("end_coordinate", [])
                if len(start_coord) == 2 and len(end_coord) == 2:
                    x1 = int(start_coord[0] * app_state.adb.screen_width)
                    y1 = int(start_coord[1] * app_state.adb.screen_height)
                    x2 = int(end_coord[0] * app_state.adb.screen_width)
                    y2 = int(end_coord[1] * app_state.adb.screen_height)
                    app_state.adb.swipe(x1, y1, x2, y2)
                    logger.info(f"Dragged from ({x1}, {y1}) to ({x2}, {y2})")
                    await asyncio.sleep(1)

            elif action_type == "system_button":
                button = action.get("button", "")
                key_map = {
                    "back": "KEYCODE_BACK",
                    "home": "KEYCODE_HOME",
                    "enter": "KEYCODE_ENTER",
                    "menu": "KEYCODE_MENU",
                }
                if button in key_map:
                    app_state.adb.press_key(key_map[button])
                    logger.info(f"Pressed button: {button}")
                    await asyncio.sleep(1)

            elif action_type == "open":
                app_name = action.get("text", "")
                logger.info(f"Request to open app: {app_name}")
                # Note: Opening apps by name requires additional implementation
                await asyncio.sleep(1)

            step_count += 1

    except Exception as e:
        logger.error(f"Error running task: {e}")
        import traceback
        traceback.print_exc()
        step = {
            "step": step_count + 1,
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }
        app_state.execution_history.append(step)
        await broadcast_update(step)

    finally:
        app_state.is_running = False


async def broadcast_update(message: Dict[str, Any]):
    """Broadcast update to all websocket clients."""
    for client in app_state.websocket_clients:
        try:
            await client.send_json(message)
        except Exception as e:
            logger.error(f"Error broadcasting to client: {e}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    app_state.websocket_clients.append(websocket)

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        app_state.websocket_clients.remove(websocket)


@app.get("/api/history")
async def get_history():
    """Get execution history."""
    return {"history": app_state.execution_history}


@app.post("/api/stop")
async def stop_task():
    """Stop current task."""
    app_state.is_running = False
    return {"status": "stopped"}


@app.post("/api/reset")
async def reset_state():
    """Reset application state."""
    app_state.reset()
    return {"status": "reset"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
