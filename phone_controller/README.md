# 手机控制器 - MAI-UI 大模型操控手机

基于 MAI-UI-8B 大模型的手机自动化控制系统，支持通过自然语言指令控制 Android 设备。

## 功能特性

- 实时显示手机屏幕
- 支持自然语言指令控制
- 集成 MAI-UI-8B 大模型
- 实时显示执行流程
- 支持手动控制（点击、滑动、输入文本等）

## 系统要求

- Python 3.8+
- Android 设备（已开启 USB 调试）
- ADB 工具已安装
- MAI-UI-8B 模型服务（部署在 10.184.60.127:8090）

## 安装步骤

### 1. 安装依赖

```bash
cd phone_controller
pip install -r requirements.txt
```

### 2. 配置 ADB

确保 ADB 已安装并添加到系统 PATH。

连接 Android 设备：
- 开启 USB 调试模式
- 通过 USB 连接到电脑
- 授权 USB 调试

验证连接：
```bash
adb devices
```

### 3. 启动 MAI-UI-8B 模型服务

确保 MAI-UI-8B 模型已部署在 `http://10.184.60.127:8090`。

如需修改模型服务地址，请编辑 `backend/server.py` 第 88 行：
```python
llm_base_url="http://your-model-server:port/v1",
```

## 使用方法

### 启动服务器

```bash
cd backend
python server.py
```

或者使用 Windows 快捷脚本：
```bash
start.bat
```

服务器将在 `http://0.0.0.0:8080` 启动。

### 访问界面

在浏览器中打开：
- 本地：`http://localhost:8080`
- 远程：`http://your-server-ip:8080`

### 操作说明

1. **输入任务指令**：例如 "open the settings and turn on the wifi"
2. **点击执行**：点击"执行任务"按钮开始自动化操作
3. **查看执行流程**：在右侧查看实时执行日志
4. **手动控制**：可以使用手动控制区进行按键控制和文本输入

### 手动控制

- **点击屏幕**：直接点击左侧手机屏幕图像
- **按键控制**：返回、主页、确认按钮
- **文本输入**：输入文本并点击发送

### 示例指令

```
open the settings and turn on the wifi
open the camera and take a photo
open chrome and search for "python"
```

## 项目结构

```
phone_controller/
├── backend/
│   ├── server.py           # FastAPI 服务器
│   └── adb_controller.py   # ADB 控制器
├── frontend/
│   ├── templates/
│   │   └── index.html      # 主页面
│   └── static/
│       ├── css/
│       │   └── style.css   # 样式文件
│       └── js/
│           └── app.js      # 前端逻辑
├── requirements.txt        # Python 依赖
├── start.bat              # Windows 启动脚本
├── README.md             # 详细文档
└── QUICKSTART.md         # 快速启动指南
```

## 技术栈

- **后端**：FastAPI + WebSocket
- **前端**：原生 HTML/CSS/JavaScript
- **大模型**：MAI-UI-8B（移动 UI 理解模型）
- **设备控制**：ADB

## MAI-UI 模型说明

本项目使用 MAI-UI-8B 模型，这是专门为移动设备 UI 理解和操作设计的视觉语言模型。

模型配置：
- 模型名称：MAI-UI-8B
- 服务地址：http://10.184.60.127:8090/v1
- Temperature：0.0（确定性输出）
- 历史步数：3（保持最近 3 步的上下文）

## 支持的操作

- `click` - 点击屏幕
- `long_press` - 长按
- `type` - 输入文本
- `swipe` - 滑动（上下左右）
- `drag` - 拖拽
- `system_button` - 系统按键（返回、主页等）
- `open` - 打开应用
- `wait` - 等待
- `answer` - 回答用户
- `terminate` - 结束任务

## 注意事项

1. 确保 Android 设备已连接并授权 USB 调试
2. 确保 MAI-UI-8B 模型服务正在运行
3. 首次使用可能需要等待模型加载
4. 执行过程中请勿手动操作手机
5. 建议使用英文指令，模型对英文理解更好

## 常见问题

### ADB 连接失败
- 检查 USB 调试是否开启
- 检查 ADB 是否已安装
- 尝试重新连接 USB
- 运行 `adb devices` 检查设备列表

### 模型调用失败
- 检查模型服务是否运行
- 检查服务地址配置是否正确
- 查看控制台错误日志

### 屏幕无法刷新
- 检查 ADB 连接状态
- 尝试重启服务器
- 检查设备是否处于唤醒状态

## 相关链接

- [MAI-UI 项目](https://github.com/alibaba/MAI-UI)
- [ADB 文档](https://developer.android.com/studio/command-line/adb)

## License

Apache License 2.0
