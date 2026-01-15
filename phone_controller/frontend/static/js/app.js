// API 基础 URL
const API_BASE = '';

// WebSocket 连接
let ws = null;
let isConnected = false;
let autoRefreshInterval = null;
let isExecuting = false;

// 任务历史管理
let taskHistory = JSON.parse(localStorage.getItem('taskHistory') || '[]');
let currentTask = null;

// Toast 通知系统
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }
};

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

    // 清空任务历史按钮
    document.getElementById('clearTaskHistoryBtn').addEventListener('click', clearTaskHistory);

    // 回车键发送文本
    document.getElementById('manualTextInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendText();
        }
    });

    // 点击屏幕获取坐标
    document.getElementById('screenshot').addEventListener('click', handleScreenClick);

    // 初始化任务历史列表
    renderTaskHistory();
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
        Toast.error('ADB 未连接，请确保手机已通过 USB 连接并开启 USB 调试');
        return;
    }

    updateLoading(true);
    try {
        const response = await fetch(`${API_BASE}/api/screenshot`);
        const data = await response.json();

        const img = document.getElementById('screenshot');
        img.src = `data:image/png;base64,${data.image}`;
        Toast.success('屏幕已刷新');
    } catch (error) {
        console.error('刷新屏幕失败:', error);
        Toast.error('刷新屏幕失败: ' + error.message);
    } finally {
        updateLoading(false);
    }
}

// 执行任务
async function executeTask() {
    const instruction = document.getElementById('instructionInput').value.trim();

    if (!instruction) {
        Toast.warning('请输入任务指令');
        return;
    }

    if (isExecuting) {
        Toast.warning('任务正在执行中');
        return;
    }

    try {
        isExecuting = true;
        updateExecuteButtons(true);

        // 清空执行日志
        clearLog();

        // 创建新任务记录
        currentTask = {
            id: Date.now(),
            instruction: instruction,
            startTime: new Date().toISOString(),
            endTime: null,
            duration: null,
            status: 'running',
            steps: []
        };

        // 添加到历史
        taskHistory.unshift(currentTask);
        saveTaskHistory();
        renderTaskHistory();

        // 添加开始日志
        addLogEntry({
            type: 'info',
            message: `开始执行任务: ${instruction}`,
            timestamp: currentTask.startTime
        });

        const response = await fetch(`${API_BASE}/api/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instruction: instruction,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('任务已启动:', data);
        Toast.info('任务已开始执行');

    } catch (error) {
        console.error('执行任务失败:', error);
        addLogEntry({
            type: 'error',
            message: `执行失败: ${error.message}`,
            timestamp: new Date().toISOString()
        });

        // 更新任务状态为失败
        if (currentTask) {
            currentTask.status = 'error';
            currentTask.endTime = new Date().toISOString();
            currentTask.duration = calculateDuration(currentTask.startTime, currentTask.endTime);
            saveTaskHistory();
            renderTaskHistory();
        }

        isExecuting = false;
        updateExecuteButtons(false);
        Toast.error('执行任务失败: ' + error.message);
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

// WebSocket 重连次数限制
let wsReconnectAttempts = 0;
const MAX_WS_RECONNECT_ATTEMPTS = 5;

// 连接 WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket 已连接');
        wsReconnectAttempts = 0; // 重置重连计数
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
    };

    ws.onclose = () => {
        if (wsReconnectAttempts < MAX_WS_RECONNECT_ATTEMPTS) {
            wsReconnectAttempts++;
            console.log(`WebSocket 已断开，3秒后重连... (尝试 ${wsReconnectAttempts}/${MAX_WS_RECONNECT_ATTEMPTS})`);
            setTimeout(connectWebSocket, 3000);
        } else {
            console.error('WebSocket 重连次数已达上限，停止重连');
            Toast.error('WebSocket 连接失败，请刷新页面重试');
        }
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

        // 更新任务状态
        if (currentTask) {
            currentTask.status = 'error';
            currentTask.endTime = data.timestamp;
            currentTask.duration = calculateDuration(currentTask.startTime, currentTask.endTime);
            saveTaskHistory();
            renderTaskHistory();
        }
    } else if (data.action && data.action.action !== undefined) {
        // 显示执行步骤
        addLogEntry({
            type: 'step',
            step: data.step,
            prediction: data.prediction,
            action: data.action,
            timestamp: data.timestamp
        });

        // 记录步骤到当前任务
        if (currentTask) {
            currentTask.steps.push({
                step: data.step,
                action: data.action,
                timestamp: data.timestamp
            });
            saveTaskHistory();
        }

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

        // 更新任务状态
        if (currentTask) {
            currentTask.status = data.action.status === 'success' ? 'success' : 'error';
            currentTask.endTime = data.timestamp;
            currentTask.duration = calculateDuration(currentTask.startTime, currentTask.endTime);
            saveTaskHistory();
            renderTaskHistory();
            currentTask = null;
        }
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
            ${data.prediction ? `<div class="log-thinking">${escapeHtml(data.prediction)}</div>` : ''}
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

// 工具函数：格式化完整时间
function formatFullTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        return '刚刚';
    } else if (diffMins < 60) {
        return `${diffMins}分钟前`;
    } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        return `${hours}小时前`;
    } else {
        return date.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// 工具函数：计算持续时间
function calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) {
        return `${seconds}秒`;
    } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
    }
}

// 保存任务历史到 localStorage
function saveTaskHistory() {
    // 只保留最近 50 条记录
    if (taskHistory.length > 50) {
        taskHistory = taskHistory.slice(0, 50);
    }
    localStorage.setItem('taskHistory', JSON.stringify(taskHistory));
}

// 清空任务历史
function clearTaskHistory() {
    if (confirm('确定要清空所有任务历史记录吗？')) {
        taskHistory = [];
        currentTask = null;
        saveTaskHistory();
        renderTaskHistory();
    }
}

// 渲染任务历史列表
function renderTaskHistory() {
    const container = document.getElementById('taskHistoryList');

    if (taskHistory.length === 0) {
        container.innerHTML = `
            <div class="history-placeholder">
                <p>暂无历史任务</p>
            </div>
        `;
        return;
    }

    container.innerHTML = taskHistory.map(task => {
        const statusText = {
            'running': '执行中',
            'success': '成功',
            'error': '失败'
        }[task.status] || task.status;

        const durationText = task.duration || '计算中...';

        return `
            <div class="task-history-item ${task.status}" data-id="${task.id}">
                <div class="task-history-title" title="${escapeHtml(task.instruction)}">
                    ${escapeHtml(task.instruction)}
                </div>
                <div class="task-history-meta">
                    <div class="task-history-time">
                        <span>${formatFullTime(task.startTime)}</span>
                        ${task.duration ? `<span class="task-history-duration">${durationText}</span>` : ''}
                    </div>
                    <span class="task-history-status ${task.status}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');

    // 添加点击事件监听
    container.querySelectorAll('.task-history-item').forEach(item => {
        item.addEventListener('click', () => {
            const taskId = parseInt(item.dataset.id);
            showTaskDetail(taskId);
        });
    });
}

// 显示任务详情（可以扩展为显示在执行日志区域）
function showTaskDetail(taskId) {
    const task = taskHistory.find(t => t.id === taskId);
    if (!task) return;

    // 清空执行日志
    clearLog();

    // 显示任务信息
    addLogEntry({
        type: 'info',
        message: `任务: ${task.instruction}`,
        timestamp: task.startTime
    });

    // 显示执行步骤
    if (task.steps && task.steps.length > 0) {
        task.steps.forEach(step => {
            addLogEntry({
                type: 'step',
                step: step.step,
                prediction: step.prediction,
                action: step.action,
                timestamp: step.timestamp
            });
        });
    }

    // 显示结果
    if (task.status !== 'running') {
        addLogEntry({
            type: task.status === 'success' ? 'success' : 'error',
            message: `任务${task.status === 'success' ? '成功' : '失败'}，耗时: ${task.duration || '未知'}`,
            timestamp: task.endTime || task.startTime
        });
    }
}

// 滑动控制功能
async function performSwipe(direction) {
    if (!isConnected) {
        Toast.error('ADB 未连接，无法执行滑动操作');
        return;
    }

    if (isExecuting) {
        Toast.warning('任务执行中，暂时无法手动滑动');
        return;
    }

    try {
        // 获取屏幕尺寸
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();

        if (!data.screen_size) {
            Toast.error('无法获取屏幕尺寸');
            return;
        }

        const { width, height } = data.screen_size;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const swipeDistance = Math.min(width, height) * 0.4; // 滑动距离为屏幕较短边的 40%

        let x1, y1, x2, y2;

        // 根据方向计算滑动坐标
        switch (direction) {
            case 'up':
                x1 = x2 = centerX;
                y1 = centerY + Math.floor(swipeDistance / 2);
                y2 = centerY - Math.floor(swipeDistance / 2);
                break;
            case 'down':
                x1 = x2 = centerX;
                y1 = centerY - Math.floor(swipeDistance / 2);
                y2 = centerY + Math.floor(swipeDistance / 2);
                break;
            case 'left':
                x1 = centerX + Math.floor(swipeDistance / 2);
                x2 = centerX - Math.floor(swipeDistance / 2);
                y1 = y2 = centerY;
                break;
            case 'right':
                x1 = centerX - Math.floor(swipeDistance / 2);
                x2 = centerX + Math.floor(swipeDistance / 2);
                y1 = y2 = centerY;
                break;
            default:
                Toast.error('无效的滑动方向');
                return;
        }

        // 执行滑动
        await fetch(`${API_BASE}/api/swipe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ x1, y1, x2, y2, duration: 300 }),
        });

        Toast.success(`已${direction === 'up' ? '上' : direction === 'down' ? '下' : direction === 'left' ? '左' : '右'}滑`);

        // 延迟后刷新屏幕
        setTimeout(() => refreshScreen(), 400);

    } catch (error) {
        console.error('滑动失败:', error);
        Toast.error('滑动失败: ' + error.message);
    }
}
