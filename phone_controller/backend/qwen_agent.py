"""
Qwen Agent for phone control using OpenAI SDK.
"""
import json
import re
import base64
from io import BytesIO
from typing import Dict, Any, List, Tuple, Optional
from PIL import Image
from openai import OpenAI


class QwenPhoneAgent:
    """Agent for controlling phone using Qwen vision model."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model_name: str = "qwen-vl-max",
    ):
        """
        Initialize Qwen agent.

        Args:
            api_key: API key for Qwen/DashScope.
            base_url: Base URL for API.
            model_name: Model name to use.
        """
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model_name = model_name
        self.history: List[Dict[str, Any]] = []

    def _pil_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string."""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

    def reset(self) -> None:
        """Reset conversation history."""
        self.history = []

    def get_system_prompt(self) -> str:
        """Get system prompt for the agent."""
        return """You are a phone control assistant. You can see the phone screen and control it.

Available actions:
1. click - Tap on screen: {"action": "click", "coordinate": [x, y]}
2. long_press - Long press: {"action": "long_press", "coordinate": [x, y]}
3. type - Input text: {"action": "type", "text": "your text"}
4. swipe - Swipe: {"action": "swipe", "direction": "up|down|left|right", "coordinate": [x, y]}
5. drag - Drag: {"action": "drag", "start_coordinate": [x1, y1], "end_coordinate": [x2, y2]}
6. system_button - Press button: {"action": "system_button", "button": "back|home|enter"}
7. wait - Wait: {"action": "wait"}
8. answer - Answer user: {"action": "answer", "text": "your response"}
9. terminate - Task done: {"action": "terminate", "status": "success|fail"}

Coordinates should be normalized to [0, 1] range (0,0 is top-left, 1,1 is bottom-right).

Output format:
<thinking>
Your thinking process here
</thinking>
<invoke>
{"action": "action_name", ...arguments}
</invoke>

Important:
- Analyze the screen carefully before taking action
- Be precise with coordinates
- Think step by step
- Use "terminate" when task is complete
"""

    def predict(
        self,
        instruction: str,
        screenshot: Image.Image,
        screen_width: int,
        screen_height: int,
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """
        Predict next action based on instruction and screenshot.

        Args:
            instruction: User instruction.
            screenshot: Current screen screenshot.
            screen_width: Screen width in pixels.
            screen_height: Screen height in pixels.

        Returns:
            Tuple of (thinking, action_dict).
        """
        # Build messages
        messages = [
            {
                "role": "system",
                "content": [{"type": "text", "text": self.get_system_prompt()}]
            },
        ]

        # Add history
        for item in self.history:
            messages.append(item)

        # Add current request
        user_content = [
            {
                "type": "text",
                "text": f"Task: {instruction}\n\nScreen size: {screen_width}x{screen_height}\n\nWhat should I do next?"
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{self._pil_to_base64(screenshot)}"
                }
            }
        ]

        messages.append({
            "role": "user",
            "content": user_content
        })

        try:
            # Call API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=2048,
                temperature=0.0,
            )

            result = response.choices[0].message.content.strip()
            print(f"Model response:\n{result}")

            # Parse response
            thinking, action = self._parse_response(result)

            # Add to history
            self.history.append({
                "role": "user",
                "content": user_content
            })
            self.history.append({
                "role": "assistant",
                "content": [{"type": "text", "text": result}]
            })

            return thinking, action

        except Exception as e:
            print(f"Error calling model: {e}")
            return f"Error: {e}", None

    def _parse_response(self, response: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """
        Parse model response to extract thinking and action.

        Args:
            response: Raw model response.

        Returns:
            Tuple of (thinking, action_dict).
        """
        thinking = None
        action = None

        # Extract thinking
        thinking_match = re.search(r'<thinking>(.*?)</thinking>', response, re.DOTALL)
        if thinking_match:
            thinking = thinking_match.group(1).strip()

        # Extract invoke/action
        invoke_match = re.search(r'<invoke>(.*?)</invoke>', response, re.DOTALL)
        if invoke_match:
            try:
                action = json.loads(invoke_match.group(1).strip())
            except json.JSONDecodeError:
                print(f"Failed to parse action JSON: {invoke_match.group(1)}")
        else:
            # Try to find JSON without tags
            json_match = re.search(r'\{[^}]*"action"[^}]*\}', response, re.DOTALL)
            if json_match:
                try:
                    action = json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass

        return thinking, action
