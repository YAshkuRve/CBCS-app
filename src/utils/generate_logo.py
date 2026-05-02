from PIL import Image, ImageDraw, ImageFont
import base64
from io import BytesIO

# Create a transparent background image
img = Image.new('RGBA', (400, 150), color=(255, 255, 255, 0))
d = ImageDraw.Draw(img)

d.rectangle([0, 0, 80, 100], fill='#663399')
d.text((20, 40), 'GH', fill='white')
d.text((90, 20), 'G H raisoni', fill='#663399')
d.text((90, 60), 'COLLEGE', fill='#ff6600')

buffered = BytesIO()
img.save(buffered, format='PNG')
img_str = base64.b64encode(buffered.getvalue()).decode()

with open('logoBase64.js', 'w') as f:
    f.write(f'export const raisoniLogo = "data:image/png;base64,{img_str}";\n')
