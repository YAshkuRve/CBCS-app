import base64

image_path = r'C:\Users\OMCT\.gemini\antigravity\brain\af6f4d65-25f2-4504-95a3-c156f49b3d06\media__1776257801407.png'

with open(image_path, 'rb') as f:
    img_data = f.read()

img_b64 = base64.b64encode(img_data).decode('utf-8')

with open(r'c:\Users\OMCT\cbcs-app\src\utils\logoBase64.js', 'w') as f:
    f.write(f'export const raisoniLogo = "data:image/png;base64,{img_b64}";\n')

print('Successfully exported logo as base64')
