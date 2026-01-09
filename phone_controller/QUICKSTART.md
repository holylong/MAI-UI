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

### 4. 获取 API Key
访问 [阿里云百炼](https://bailian.console.aliyun.com/) 获取 API Key

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

## 访问界面

浏览器打开：`http://10.184.60.127:8090`

## 使用示例

### 示例 1: 打开应用
```
打开微信应用
```

### 示例 2: 设置调整
```
打开设置，切换到深色模式
```

### 示例 3: 搜索操作
```
打开浏览器，搜索"人工智能"
```

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
uvicorn.run(app, host="0.0.0.0", port=8091)  # 改成其他端口
```

### 问题 3: 模型调用失败
- 检查 API Key 是否正确
- 检查网络连接
- 查看控制台错误日志

## 项目结构

```
phone_controller/
├── backend/              # 后端服务
│   ├── server.py        # FastAPI 服务器
│   ├── adb_controller.py # ADB 控制
│   └── qwen_agent.py    # Qwen 代理
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
2. 控制台错误日志
3. 浏览器开发者工具 Console
