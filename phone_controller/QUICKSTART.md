# 快速启动指南

## 前置准备

### 1. 安装 ADB
- 下载 Android SDK Platform Tools
- 解压并将 ADB 添加到系统 PATH
- 验证安装：`adb version`

### 2. 配置手机
- 开启开发者选项
- 开启 USB 调试
- 通过 USB 连接电脑
- 授权 USB 调试

### 3. 验证连接
```bash
adb devices
```
应该看到你的设备列表

### 4. 启动 MAI-UI-8B 模型服务
确保模型服务运行在 `http://10.184.60.127:8090`

## 安装依赖

```bash
cd phone_controller
pip install -r requirements.txt
```

## 启动服务

### Windows:
双击 `start.bat`

### Linux/Mac:
```bash
cd backend
python server.py
```

服务启动后访问：`http://localhost:8080`

## 使用示例

### 示例 1: 打开设置
```
open the settings
```

### 示例 2: 调整设置
```
open the settings and turn on the wifi
```

### 示例 3: 浏览器操作
```
open chrome and search for "python tutorial"
```

### 示例 4: 相机操作
```
open the camera and take a photo
```

## 界面说明

### 左侧面板
- 实时显示手机屏幕
- 点击屏幕可手动控制
- 显示连接状态和分辨率

### 右侧面板
- **任务指令区**：输入自然语言指令
- **执行流程区**：实时显示 AI 执行步骤
- **手动控制区**：按键控制和文本输入

## 故障排除

### 问题 1: ADB 连接失败
```bash
# 重启 ADB 服务
adb kill-server
adb start-server
adb devices
```

### 问题 2: 端口被占用
修改 `server.py` 最后一行的端口号：
```python
uvicorn.run(app, host="0.0.0.0", port=8081)  # 改成其他端口
```

### 问题 3: 模型调用失败
- 检查模型服务是否运行：`curl http://10.184.60.127:8090/v1/models`
- 检查网络连接
- 查看控制台错误日志

### 问题 4: 模型服务地址不同
修改 `backend/server.py` 第 88 行：
```python
llm_base_url="http://your-model-server:port/v1",
```

## 项目结构

```
phone_controller/
├── backend/              # 后端服务
│   ├── server.py        # FastAPI 服务器（使用 MAI-UI-8B）
│   └── adb_controller.py # ADB 控制
├── frontend/            # 前端界面
│   ├── templates/index.html
│   └── static/
│       ├── css/style.css
│       └── js/app.js
├── requirements.txt     # 依赖列表
├── start.bat           # Windows 启动脚本
└── README.md           # 详细文档
```

## 技术支持

如有问题，请查看：
1. ADB 连接状态
2. 模型服务是否运行
3. 控制台错误日志
4. 浏览器开发者工具 Console

## 下一步

- 尝试不同的指令
- 查看执行日志了解模型思考过程
- 使用手动控制功能熟悉界面
