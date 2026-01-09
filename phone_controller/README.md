# 手机控制器 - 大模型操控手机

基于大模型的手机自动化控制系统，支持通过自然语言指令控制 Android 设备。

## 功能特性

- 实时显示手机屏幕
- 支持自然语言指令控制
- 集成 Qwen 大模型（通义千问）
- 实时显示执行流程
- 支持手动控制（点击、滑动、输入文本等）

## 系统要求

- Python 3.8+
- Android 设备（已开启 USB 调试）
- ADB 工具已安装
- DashScope API Key（通义千问）

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

### 3. 获取 API Key

访问 [阿里云百炼平台](https://bailian.console.aliyun.com/) 获取 DashScope API Key。

## 使用方法

### 启动服务器

```bash
cd backend
python server.py
```

服务器将在 `http://0.0.0.0:8090` 启动。

### 访问界面

在浏览器中打开：
- 本地：`http://localhost:8090`
- 远程：`http://10.184.60.127:8090`

### 操作说明

1. **输入 API Key**：在右侧输入框中填入 DashScope API Key
2. **输入任务指令**：例如 "打开设置应用并切换到深色模式"
3. **点击执行**：点击"执行任务"按钮开始自动化操作
4. **查看执行流程**：在右侧查看实时执行日志
5. **手动控制**：可以使用手动控制区进行按键控制和文本输入

### 手动控制

- **点击屏幕**：直接点击左侧手机屏幕图像
- **按键控制**：返回、主页、确认按钮
- **文本输入**：输入文本并点击发送

## 项目结构

```
phone_controller/
├── backend/
│   ├── server.py           # FastAPI 服务器
│   ├── adb_controller.py   # ADB 控制器
│   └── qwen_agent.py       # Qwen 大模型代理
├── frontend/
│   ├── templates/
│   │   └── index.html      # 主页面
│   └── static/
│       ├── css/
│       │   └── style.css   # 样式文件
│       └── js/
│           └── app.js      # 前端逻辑
└── requirements.txt        # Python 依赖
```

## 技术栈

- **后端**：FastAPI + WebSocket
- **前端**：原生 HTML/CSS/JavaScript
- **大模型**：Qwen VL（通义千问视觉模型）
- **设备控制**：ADB

## 注意事项

1. 确保 Android 设备已连接并授权 USB 调试
2. API Key 需要有效且有足够额度
3. 首次使用可能需要等待模型加载
4. 执行过程中请勿手动操作手机

## 常见问题

### ADB 连接失败
- 检查 USB 调试是否开启
- 检查 ADB 是否已安装
- 尝试重新连接 USB
- 运行 `adb devices` 检查设备列表

### 模型调用失败
- 检查 API Key 是否正确
- 检查网络连接
- 检查 API 额度是否充足

### 屏幕无法刷新
- 检查 ADB 连接状态
- 尝试重启服务器
- 检查设备是否处于唤醒状态

## License

Apache License 2.0
