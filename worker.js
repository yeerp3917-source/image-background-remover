export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 返回前端页面
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    // API 端点：移除背景
    if (url.pathname === '/api/remove-bg' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
          return new Response('No image provided', { status: 400 });
        }

        // 调用 remove.bg API
        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', imageFile);
        removeBgFormData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': env.REMOVE_BG_API_KEY,
          },
          body: removeBgFormData,
        });

        if (!response.ok) {
          const error = await response.text();
          return new Response(`Remove.bg API error: ${error}`, { status: response.status });
        }

        const resultBlob = await response.blob();

        return new Response(resultBlob, {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图片背景移除工具</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 900px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 32px;
        }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 60px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            background: #f8f9ff;
        }
        .upload-area:hover {
            border-color: #764ba2;
            background: #f0f2ff;
        }
        .upload-area.dragover {
            border-color: #764ba2;
            background: #e8ebff;
        }
        #fileInput { display: none; }
        .upload-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .upload-text {
            font-size: 18px;
            color: #666;
            margin-bottom: 10px;
        }
        .upload-hint {
            font-size: 14px;
            color: #999;
        }
        .preview-area {
            display: none;
            margin-top: 30px;
        }
        .images-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .image-box {
            text-align: center;
        }
        .image-box h3 {
            margin-bottom: 10px;
            color: #666;
            font-size: 16px;
        }
        .image-box img {
            max-width: 100%;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .actions {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        button {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }
        .btn-secondary:hover {
            background: #d0d0d0;
        }
        .loading {
            display: none;
            text-align: center;
            margin-top: 20px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            display: none;
            background: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 图片背景移除工具</h1>
        
        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📸</div>
            <div class="upload-text">点击或拖拽图片到这里</div>
            <div class="upload-hint">支持 JPG、PNG 格式</div>
            <input type="file" id="fileInput" accept="image/*">
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <div>正在处理图片，请稍候...</div>
        </div>

        <div class="error" id="error"></div>

        <div class="preview-area" id="previewArea">
            <div class="images-container">
                <div class="image-box">
                    <h3>原图</h3>
                    <img id="originalImg" alt="原图">
                </div>
                <div class="image-box">
                    <h3>去除背景后</h3>
                    <img id="resultImg" alt="处理结果">
                </div>
            </div>
            <div class="actions">
                <button class="btn-primary" id="downloadBtn">下载图片</button>
                <button class="btn-secondary" id="resetBtn">重新上传</button>
            </div>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const previewArea = document.getElementById('previewArea');
        const originalImg = document.getElementById('originalImg');
        const resultImg = document.getElementById('resultImg');
        const downloadBtn = document.getElementById('downloadBtn');
        const resetBtn = document.getElementById('resetBtn');

        let resultBlob = null;

        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFile);

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                processImage(file);
            }
        });

        function handleFile(e) {
            const file = e.target.files[0];
            if (file) processImage(file);
        }

        async function processImage(file) {
            error.style.display = 'none';
            loading.style.display = 'block';
            uploadArea.style.display = 'none';
            previewArea.style.display = 'none';

            originalImg.src = URL.createObjectURL(file);

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/remove-bg', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('处理失败: ' + (await response.text()));
                }

                resultBlob = await response.blob();
                resultImg.src = URL.createObjectURL(resultBlob);

                loading.style.display = 'none';
                previewArea.style.display = 'block';
            } catch (err) {
                loading.style.display = 'none';
                uploadArea.style.display = 'block';
                error.textContent = err.message;
                error.style.display = 'block';
            }
        }

        downloadBtn.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(resultBlob);
            a.download = 'no-background.png';
            a.click();
        });

        resetBtn.addEventListener('click', () => {
            fileInput.value = '';
            previewArea.style.display = 'none';
            uploadArea.style.display = 'block';
            resultBlob = null;
        });
    </script>
</body>
</html>`;
