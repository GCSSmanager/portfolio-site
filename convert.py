import os
from PIL import Image
from pathlib import Path

def convert_images_to_webp(root_dir):
    """Рекурсивно конвертирует PNG/JPG/JPEG в WebP с заменой"""
    root_path = Path(root_dir)

    # Расширения для конвертации
    extensions = ('.png', '.jpg', '.jpeg')

    for img_file in root_path.rglob("*"):
        if img_file.suffix.lower() in extensions:
            try:
                # Открываем изображение
                img = Image.open(img_file)

                # Конвертируем в RGB для JPG (убираем альфа-канал)
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')

                # Создаем новое имя файла
                webp_file = img_file.with_suffix('.webp')

                # Сохраняем как WebP
                img.save(webp_file, 'WEBP', quality=85)

                # Удаляем оригинал
                img_file.unlink()

                print(f"✓ Конвертирован: {img_file} -> {webp_file}")

            except Exception as e:
                print(f"✗ Ошибка с {img_file}: {e}")

if __name__ == "__main__":
    folder_path = "data"
    convert_images_to_webp(folder_path)