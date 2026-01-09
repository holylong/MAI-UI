@echo off
echo ====================================
echo 手机控制器启动脚本
echo ====================================
echo.

cd /d %~dp0backend

echo 检查 ADB 连接...
adb devices
echo.

echo 启动服务器...
echo 服务地址: http://10.184.60.127:8090
echo 按 Ctrl+C 停止服务器
echo.

python server.py

pause
