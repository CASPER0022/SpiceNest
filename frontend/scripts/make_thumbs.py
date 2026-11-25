"""Small, fast versions of the product photos for the shop cards, the cart and the gallery strip.

For every photo in the product folders under public/images it writes a 600 px wide WebP to
public/images/thumbs/<folder>/<name>.webp. The site uses the thumb when it exists and falls back
to the original photo when it does not (see src/utils/images.js).

Run it after adding or replacing a product photo:
    python frontend/scripts/make_thumbs.py
Needs Pillow (pip install pillow). Existing thumbs are only rebuilt when the photo is newer.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

IMAGES = Path(__file__).resolve().parent.parent / 'public' / 'images'
THUMBS = IMAGES / 'thumbs'
# Folders that hold product photos (blog, farmers and homepage images are not product photos)
SKIP = {'thumbs', 'blog', 'farmers', 'homepage'}
WIDTH = 600
QUALITY = 78


def main():
    made = skipped = 0
    for folder in sorted(p for p in IMAGES.iterdir() if p.is_dir() and p.name not in SKIP):
        for photo in sorted(folder.iterdir()):
            if photo.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
                continue
            target = THUMBS / folder.name / (photo.stem + '.webp')
            if target.exists() and target.stat().st_mtime >= photo.stat().st_mtime:
                skipped += 1
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(photo) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                if im.width > WIDTH:
                    im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
                im.save(target, 'WEBP', quality=QUALITY, method=6)
            print(f'{photo.relative_to(IMAGES)}: {photo.stat().st_size // 1024} KB -> {target.stat().st_size // 1024} KB')
            made += 1
    print(f'{made} thumbs made, {skipped} already up to date')


if __name__ == '__main__':
    sys.exit(main())
