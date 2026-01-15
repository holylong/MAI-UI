# Phone Controller - MAI-UI 大模型手机操控系统

基于 [MAI-UI-8B](https://github.com/alibaba/MAI-UI) 大模型的 Android 设备自动化控制系统，支持通过自然语言指令操控手机。

## 功能特性

- **AI 智能操控** - 使用 MAI-UI-8B 模型理解用户意图并执行操作
- **实时屏幕投屏** - 通过 WebSocket 实时显示手机屏幕
- **自然语言交互** - 支持中英文指令控制
- **执行流程可视化** - 实时展示每一步的思考过程和操作结果
- **手动控制** - 支持点击、滑动、文本输入等手动操作
- **多种操作类型** - 支持点击、长按、滑动、拖拽、文本输入、系统按键等

## 快速开始

### 前置要求

- **Python**: 3.8 或更高版本
- **Android 设备**: 已开启 USB 调试
- **ADB 工具**: 已安装并配置到系统 PATH
- **MAI-UI-8B 模型服务**: 部署在 `http://10.184.60.127:8090`

### 1. 安装依赖

```bash
cd phone_controller
pip install -r requirements.txt
```

### 2. 连接 Android 设备

在手机上启用开发者选项和 USB 调试：

1. 打开 **设置** → **关于手机**
2. 连续点击 **版本号** 7 次启用开发者模式
3. 返回设置，打开 **开发者选项**
4. 启用 **USB 调试**
5. 通过 USB 连接手机到电脑，并授权 USB 调试

验证连接：

```bash
adb devices
```

应看到类似输出：

```
List of devices attached
XXXXXXXX    device
```

### 3. 配置 MAI-UI 模型服务

默认配置的服务地址为 `http://10.184.60.127:8090/v1`。

如需修改，编辑 `backend/server.py` 第 92 行：

```python
llm_base_url="http://your-model-server:port/v1",
```

### 4. 启动服务

**方式一：使用启动脚本（Windows）**

```bash
start.bat
```

**方式二：手动启动**

```bash
cd backend
python server.py
```

服务器将在 `http://0.0.0.0:8080` 启动。

### 5. 访问 Web 界面

在浏览器中打开：

- **本地访问**: `http://localhost:8080`
- **远程访问**: `http://your-server-ip:8080`

## 使用说明

### AI 自动化控制

1. 在输入框中输入任务指令（建议使用英文）
2. 点击 **"执行任务"** 按钮
3. 系统将自动分析屏幕并执行相应操作
4. 右侧日志区域会实时显示执行步骤和思考过程

**示例指令**：

```
# 打开设置并开启 Wi-Fi
open the settings and turn on the wifi

# 打开相机拍照
open the camera and take a photo

# 使用 Chrome 搜索
open chrome and search for "python tutorials"

# 查看天气
check the weather

# 发送消息
open messages and send "hello" to contact
```

### 手动控制

**屏幕操作**
- 直接点击左侧手机屏幕图像进行点击操作
- 坐标会自动映射到设备实际分辨率

**按键控制**
- **返回** - 模拟返回键
- **主页** - 返回主屏幕
- **确认** - 确认/回车键

**文本输入**
1. 在文本框中输入内容
2. 点击 **"发送"** 按钮
3. 文本将自动输入到手机焦点位置

## API 文档

### REST API

#### GET `/api/status`
获取系统状态

**响应**：
```json
{
  "adb_connected": true,
  "screen_size": {"width": 1080, "height": 2400},
  "is_running": false,
  "current_task": null
}
```

#### GET `/api/screenshot`
获取当前屏幕截图

**响应**：
```json
{
  "image": "base64_encoded_image",
  "timestamp": "2025-01-15T10:30:00"
}
```

#### POST `/api/tap`
点击屏幕

**请求体**：
```json
{
  "x": 540,
  "y": 1200
}
```

#### POST `/api/swipe`
滑动屏幕

**请求体**：
```json
{
  "x1": 540,
  "y1": 1800,
  "x2": 540,
  "y2": 800,
  "duration": 300
}
```

#### POST `/api/input`
输入文本

**请求体**：
```json
{
  "text": "hello world"
}
```

#### POST `/api/key`
按键操作

**请求体**：
```json
{
  "key": "KEYCODE_BACK"
}
```

**支持的按键**：
- `KEYCODE_BACK` - 返回键
- `KEYCODE_HOME` - 主页键
- `KEYCODE_ENTER` - 回车键
- `KEYCODE_MENU` - 菜单键

#### POST `/api/execute`
执行 AI 任务

**请求体**：
```json
{
  "instruction": "open the settings"
}
```

#### POST `/api/stop`
停止当前执行的任务

#### GET `/api/history`
获取执行历史记录

### WebSocket

#### 连接端点：`/ws`

实时接收任务执行进度更新。

**消息格式**：
```json
{
  "step": 1,
  "prediction": "click [Settings] icon",
  "action": {
    "action": "click",
    "coordinate": [0.5, 0.3]
  },
  "timestamp": "2025-01-15T10:30:05"
}
```

## 项目结构

```
phone_controller/
├── backend/
│   ├── server.py              # FastAPI 服务器主程序
│   └── adb_controller.py      # ADB 设备控制模块
├── frontend/
│   ├── templates/
│   │   └── index.html         # Web 界面
│   └── static/
│       ├── css/
│       │   └── style.css      # 样式文件
│       └── js/
│           └── app.js         # 前端交互逻辑
├── requirements.txt           # Python 依赖列表
├── start.bat                 # Windows 快捷启动脚本
├── README.md                 # 本文档
└── QUICKSTART.md            # 快速入门指南
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI + WebSocket |
| 前端 | 原生 HTML/CSS/JavaScript |
| AI 模型 | MAI-UI-8B（移动 UI 理解专用模型） |
| 设备控制 | ADB (Android Debug Bridge) |
| 图像处理 | Pillow |

## 支持的操作类型

MAI-UI 模型支持以下操作：

| 操作 | 说明 | 参数 |
|------|------|------|
| `click` | 点击屏幕 | `coordinate`: [x, y] |
| `long_press` | 长按 | `coordinate`: [x, y] |
| `type` | 输入文本 | `text`: 字符串 |
| `swipe` | 滑动 | `direction`: up/down/left/right, `coordinate`: [x, y] |
| `drag` | 拖拽 | `start_coordinate`: [x1, y1], `end_coordinate`: [x2, y2] |
| `system_button` | 系统按键 | `button`: back/home/enter/menu |
| `open` | 打开应用 | `text`: 应用名称 |
| `wait` | 等待 | - |
| `answer` | 回答用户 | `text`: 回复内容 |
| `terminate` | 结束任务 | `status`: success/failed |

## 模型配置

当前使用的模型参数：

```python
{
    "model_name": "MAI-UI-8B",
    "llm_base_url": "http://10.184.60.127:8090/v1",
    "history_n": 1,           # 保留最近 1 步历史
    "temperature": 0.0,       # 确定性输出
    "top_k": -1,
    "top_p": 1.0,
    "max_tokens": 2048
}
```

## 常见问题

### ADB 连接失败

**症状**: 启动时报错 "Failed to initialize ADB"

**解决方案**:
1. 检查 USB 调试是否开启
2. 检查 ADB 是否已安装：`adb version`
3. 重新连接 USB 线
4. 重启 ADB 服务：
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### 模型调用失败

**症状**: 执行任务时报错 "Agent not initialized"

**解决方案**:
1. 检查模型服务是否运行：`curl http://10.184.60.127:8090/v1/models`
2. 检查服务器地址配置是否正确
3. 查看后端日志获取详细错误信息

### 屏幕无法刷新

**症状**: Web 界面屏幕不更新

**解决方案**:
1. 检查 ADB 连接状态：`adb devices`
2. 确保手机处于唤醒状态
3. 尝试重启服务器
4. 检查设备是否被其他应用占用

### 指令执行不准确

**症状**: AI 执行的操作不符合预期

**解决方案**:
1. 使用更明确的英文指令
2. 拆分复杂任务为多个简单步骤
3. 确保当前屏幕内容与指令匹配
4. 检查模型输出的 coordinate 是否在合理范围内

## 开发相关

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd MAI-UI/phone_controller

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
cd backend
python server.py
```

### 依赖说明

- **fastapi**: 现代化的 Web 框架
- **uvicorn**: ASGI 服务器
- **websockets**: WebSocket 支持
- **Pillow**: 图像处理库
- **pydantic**: 数据验证库

## 相关资源

- [MAI-UI GitHub](https://github.com/alibaba/MAI-UI) - MAI-UI 模型仓库
- [ADB 官方文档](https://developer.android.com/studio/command-line/adb) - Android Debug Bridge 文档
- [FastAPI 文档](https://fastapi.tiangolo.com/) - FastAPI 框架文档

## 许可证

Apache License 2.0

---

如有问题或建议，欢迎提交 Issue 或 Pull Request。
