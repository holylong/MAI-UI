## 运行服务器
```bash
CUDA_VISIBLE_DEVICES=0,1 VLLM_USE_MODELSCOPE=true python -m vllm.entrypoints.openai.api_server \
    --model ./MAI-UI-8B-local/Tongyi-MAI/MAI-UI-8B \
    --served-model-name MAI-UI-8B \
    --host 0.0.0.0 \
    --port 8090 \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.82 \
    --max-num-seqs 8 \
    --max-model-len 8192 \
    --trust-remote-code
```

## 启动客户端
```bash
cd phone_controller\backend
python server.py
```