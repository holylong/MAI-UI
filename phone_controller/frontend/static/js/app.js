// API 基础 URL
const API_BASE = '';

// WebSocket 连接
let ws = null;
let isConnected = false;
let autoRefreshInterval = null;
let isExecuting = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    connectWebSocket();
    checkStatus();
    startAutoRefresh();
});

// 初始化应用
function initializeApp() {
    console.log('初始化应用...');
    updateLoading(true);
}

// 设置事件监听器
function setupEventListeners() {
    // 刷新屏幕按钮
    document.getElementById('refreshBtn').addEventListener('click', refreshScreen);

    // 执行任务按钮
    document.getElementById('executeBtn').addEventListener('click', executeTask);

    // 停止按钮
    document.getElementById('stopBtn').addEventListener('click', stopTask);

    // 清空历史按钮
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

    // 回车键发送文本
    document.getElementById('manualTextInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendText();
        }
    });

    // 点击屏幕获取坐标
    document.getElementById('screenshot').addEventListener('click', handleScreenClick);
}

// 检查服务器状态
async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();

        // 更新连接状态
        const statusEl = document.getElementById('connectionStatus');
        if (data.adb_connected) {
            statusEl.textContent = '已连接';
            statusEl.className = 'status connected';
            isConnected = true;
        } else {
            statusEl.textContent = '未连接';
            statusEl.className = 'status disconnected';
            isConnected = false;
        }

        // 更新屏幕分辨率
        if (data.screen_size) {
            document.getElementById('screenSize').textContent =
                `分辨率: ${data.screen_size.width} x ${data.screen_size.height}`;
        }

        updateLoading(false);
    } catch (error) {
        console.error('检查状态失败:', error);
        updateLoading(false);
    }
}

// 刷新屏幕截图
async function refreshScreen() {
    if (!isConnected) {
        alert('ADB 未连接，请确保手机已通过 USB 连接并开启 USB 调试');
        return;
    }

    updateLoading(true);
    try {
        const response = await fetch(`${API_BASE}/api/screenshot`);
        const data = await response.json();

        const img = document.getElementById('screenshot');
        img.src = `data:image/png;base64,${data.image}`;
    } catch (error) {
        console.error('刷新屏幕失败:', error);
        alert('刷新屏幕失败: ' + error.message);
    } finally {
        updateLoading(false);
    }
}

// 执行任务
async function executeTask() {
    const instruction = document.getElementById('instructionInput').value.trim();
    const apiKey = document.getElementById('apiKeyInput').value.trim();

    if (!instruction) {
        alert('请输入任务指令');
        return;
    }

    if (!apiKey) {
        alert('请输入 API Key');
        return;
    }

    if (isExecuting) {
        alert('任务正在执行中');
        return;
    }

    try {
        isExecuting = true;
        updateExecuteButtons(true);

        // 清空执行日志
        clearLog();

        // 添加开始日志
        addLogEntry({
            type: 'info',
            message: `开始执行任务: ${instruction}`,
            timestamp: new Date().toISOString()
        });

        const response = await fetch(`${API_BASE}/api/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instruction: instruction,
                api_key: apiKey,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('任务已启动:', data);

    } catch (error) {
        console.error('执行任务失败:', error);
        addLogEntry({
            type: 'error',
            message: `执行失败: ${error.message}`,
            timestamp: new Date().toISOString()
        });
        isExecuting = false;
        updateExecuteButtons(false);
    }
}

// 停止任务
async function stopTask() {
    try {
        await fetch(`${API_BASE}/api/stop`, { method: 'POST' });
        addLogEntry({
            type: 'info',
            message: '任务已停止',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('停止任务失败:', error);
    }
}

// 清空历史
async function clearHistory() {
    try {
        await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
        clearLog();
        document.getElementById('instructionInput').value = '';
        isExecuting = false;
        updateExecuteButtons(false);
    } catch (error) {
        console.error('清空历史失败:', error);
    }
}

// 连接 WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket 已连接');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket 已断开，3秒后重连...');
        setTimeout(connectWebSocket, 3000);
    };
}

// 处理 WebSocket 消息
function handleWebSocketMessage(data) {
    console.log('收到消息:', data);

    if (data.error) {
        addLogEntry({
            type: 'error',
            message: data.error,
            timestamp: data.timestamp
        });
        isExecuting = false;
        updateExecuteButtons(false);
    } else if (data.action) {
        // 显示执行步骤
        addLogEntry({
            type: 'step',
            step: data.step,
            thinking: data.thinking,
            action: data.action,
            timestamp: data.timestamp
        });

        // 刷新屏幕
        setTimeout(() => refreshScreen(), 500);
    }

    // 检查任务是否完成
    if (data.action && data.action.action === 'terminate') {
        isExecuting = false;
        updateExecuteButtons(false);
        const status = data.action.status === 'success' ? '成功' : '失败';
        addLogEntry({
            type: data.action.status === 'success' ? 'success' : 'info',
            message: `任务${status}`,
            timestamp: data.timestamp
        });
    }
}

// 添加日志条目
function addLogEntry(data) {
    const logContainer = document.getElementById('executionLog');

    // 移除占位符
    const placeholder = logContainer.querySelector('.log-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const entry = document.createElement('div');
    entry.className = 'log-entry';

    if (data.type === 'error') {
        entry.classList.add('error');
    } else if (data.type === 'success') {
        entry.classList.add('success');
    }

    if (data.type === 'step') {
        entry.innerHTML = `
            <div class="log-step">步骤 ${data.step}</div>
            ${data.thinking ? `<div class="log-thinking">${escapeHtml(data.thinking)}</div>` : ''}
            ${data.action ? `<div class="log-action">${escapeHtml(JSON.stringify(data.action, null, 2))}</div>` : ''}
            <div class="log-time">${formatTime(data.timestamp)}</div>
        `;
    } else {
        entry.innerHTML = `
            <div class="log-message">${escapeHtml(data.message)}</div>
            <div class="log-time">${formatTime(data.timestamp)}</div>
        `;
    }

    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// 清空日志
function clearLog() {
    const logContainer = document.getElementById('executionLog');
    logContainer.innerHTML = `
        <div class="log-placeholder">
            <p>等待任务执行...</p>
        </div>
    `;
}

// 处理屏幕点击
function handleScreenClick(event) {
    if (isExecuting) {
        return; // 执行任务时禁止手动点击
    }

    const img = event.target;
    const rect = img.getBoundingClientRect();

    // 计算点击位置相对于图片的坐标
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 转换为实际屏幕坐标
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;

    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    // 执行点击
    tap(actualX, actualY);
}

// 点击屏幕
async function tap(x, y) {
    try {
        await fetch(`${API_BASE}/api/tap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ x, y }),
        });

        // 刷新屏幕
        setTimeout(() => refreshScreen(), 300);
    } catch (error) {
        console.error('点击失败:', error);
    }
}

// 发送文本
async function sendText() {
    const input = document.getElementById('manualTextInput');
    const text = input.value.trim();

    if (!text) {
        return;
    }

    try {
        await fetch(`${API_BASE}/api/input`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        input.value = '';
        setTimeout(() => refreshScreen(), 300);
    } catch (error) {
        console.error('发送文本失败:', error);
    }
}

// 发送按键
async function sendKey(key) {
    try {
        await fetch(`${API_BASE}/api/key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key }),
        });

        setTimeout(() => refreshScreen(), 300);
    } catch (error) {
        console.error('发送按键失败:', error);
    }
}

// 自动刷新
function startAutoRefresh() {
    // 每3秒自动刷新一次屏幕（仅在未执行任务时）
    autoRefreshInterval = setInterval(() => {
        if (!isExecuting && isConnected) {
            refreshScreen();
        }
    }, 3000);
}

// 更新加载状态
function updateLoading(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (isLoading) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// 更新执行按钮状态
function updateExecuteButtons(executing) {
    document.getElementById('executeBtn').disabled = executing;
    document.getElementById('stopBtn').disabled = !executing;
}

// 工具函数：转义 HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 工具函数：格式化时间
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN');
}
