# Copyright (c) 2025, Alibaba Cloud and its affiliates;
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Utility functions for image processing and conversion."""

import base64
from io import BytesIO
from typing import Union, Optional, Tuple, Dict, Any

from PIL import Image
from PIL import ImageDraw


def safe_pil_to_bytes(image: Union[Image.Image, bytes]) -> bytes:
    if isinstance(image, Image.Image):
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format="PNG")
        return img_byte_arr.getvalue()
    elif isinstance(image, bytes):
        return image
    else:
        raise TypeError(f"Expected PIL Image or bytes, got {type(image)}")

def pil_to_base64(image: Image.Image, max_size: int = 1920) -> str:
    """
    Convert PIL Image to base64 string with optional resizing.

    Args:
        image: PIL Image to convert.
        max_size: Maximum dimension (width/height) for the output image.
                  If 0, no resizing is done. If image is larger, it will be
                  resized while maintaining aspect ratio.

    Returns:
        Base64 encoded PNG string.
    """
    # Resize if image is too large to reduce token count for large screens (tablets)
    if max_size > 0:
        width, height = image.size
        if width > max_size or height > max_size:
            # Calculate new dimensions maintaining aspect ratio
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            print(f"[Image Resize] Resizing from {width}x{height} to {new_width}x{new_height}")
            image = image.resize((new_width, new_height), Image.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def save_screenshot(screenshot: Image.Image, path: str) -> None:
  screenshot.save(path)
  print(f"Screenshot saved in {path}")

def extract_click_coordinates(action: Dict[str, Any]) -> Tuple[float, float]:
    x = action.get('coordinate')[0]
    y = action.get('coordinate')[1]
    action_corr = (x, y)
    return action_corr

# Function to draw points on an image
def draw_clicks_on_image(image_path: str, click_coords: Tuple[float, float], output_path: Optional[str] = None) -> Image.Image:
    image = Image.open(image_path)
    draw = ImageDraw.Draw(image)

    # Draw each click coordinate as a red circle
    (x, y) = click_coords
    radius = 20
    if x and y:  # if get the coordinate, draw a circle
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill='red', outline='red')

    # Save the modified image
    if output_path:
        save_screenshot(image, output_path)
    return image