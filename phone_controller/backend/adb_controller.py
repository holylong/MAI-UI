"""
ADB Controller for phone screen capture and control.
"""
import subprocess
import base64
import re
import tempfile
import os
from io import BytesIO
from PIL import Image
from typing import Tuple, Optional


class ADBController:
    """Controller for ADB operations."""

    def __init__(self, device_id: Optional[str] = None):
        """
        Initialize ADB controller.

        Args:
            device_id: Optional device ID. If None, uses the first connected device.
        """
        self.device_id = device_id
        self.screen_width = 0
        self.screen_height = 0
        self._get_device_info()

    def _run_adb_command(self, command: str) -> str:
        """
        Run an ADB command and return the output.

        Args:
            command: ADB command to run (without 'adb' prefix).

        Returns:
            Command output as string.
        """
        full_command = ["adb"]
        if self.device_id:
            full_command.extend(["-s", self.device_id])
        full_command.extend(command.split())

        try:
            result = subprocess.run(
                full_command,
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            raise Exception(f"ADB command timeout: {' '.join(full_command)}")
        except Exception as e:
            raise Exception(f"ADB command failed: {e}")

    def _get_device_info(self) -> None:
        """Get device screen resolution."""
        # Try to get screen size
        output = self._run_adb_command("shell wm size")
        match = re.search(r'Physical size: (\d+)x(\d+)', output)
        if match:
            self.screen_width = int(match.group(1))
            self.screen_height = int(match.group(2))
        else:
            # Default resolution if detection fails
            self.screen_width = 1080
            self.screen_height = 2400

    def get_devices(self) -> list:
        """
        Get list of connected devices.

        Returns:
            List of device IDs.
        """
        output = self._run_adb_command("devices")
        lines = output.split('\n')[1:]  # Skip header
        devices = []
        for line in lines:
            if '\tdevice' in line:
                device_id = line.split('\t')[0]
                devices.append(device_id)
        return devices

    def capture_screen(self) -> bytes:
        """
        Capture screen screenshot.

        Returns:
            Screenshot as bytes (PNG format).
        """
        # Create temp file
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
            tmp_path = tmp_file.name

        try:
            # Capture screen to device
            self._run_adb_command("shell screencap -p /sdcard/screenshot.png")

            # Pull screenshot to local temp file
            self._run_adb_command(f"pull /sdcard/screenshot.png {tmp_path}")

            # Read and return
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def capture_screen_to_pil(self) -> Image.Image:
        """
        Capture screen and return as PIL Image.

        Returns:
            PIL Image of screen.
        """
        screenshot_bytes = self.capture_screen()
        return Image.open(BytesIO(screenshot_bytes))

    def tap(self, x: int, y: int) -> None:
        """
        Tap on screen at coordinates.

        Args:
            x: X coordinate (pixels).
            y: Y coordinate (pixels).
        """
        cmd = f"shell input tap {x} {y}"
        print(f"[ADB] Executing: adb {cmd}")
        result = self._run_adb_command(cmd)
        if result:
            print(f"[ADB] Command output: {result}")

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 300) -> None:
        """
        Swipe on screen.

        Args:
            x1, y1: Start coordinates (pixels).
            x2, y2: End coordinates (pixels).
            duration: Swipe duration in milliseconds.
        """
        self._run_adb_command(f"shell input swipe {x1} {y1} {x2} {y2} {duration}")

    def input_text(self, text: str) -> None:
        """
        Input text to device.

        Args:
            text: Text to input.
        """
        # Use adb shell input text with proper escaping
        # Convert spaces to %s and escape special characters
        escaped_text = text.replace(' ', '%s').replace('&', '\\&').replace('(', '\\(').replace(')', '\\)').replace('<', '\\<').replace('>', '\\>').replace('|', '\\|').replace(';', '\\;')
        self._run_adb_command(f"shell input text {escaped_text}")

    def press_key(self, key_code: str) -> None:
        """
        Press a key (e.g., 'BACK', 'HOME', 'ENTER').

        Args:
            key_code: Android key code.
        """
        self._run_adb_command(f"shell input keyevent {key_code}")

    def long_press(self, x: int, y: int, duration: int = 2000) -> None:
        """
        Long press at coordinates.

        Args:
            x: X coordinate (pixels).
            y: Y coordinate (pixels).
            duration: Press duration in milliseconds.
        """
        self._run_adb_command(f"shell input swipe {x} {y} {x} {y} {duration}")
