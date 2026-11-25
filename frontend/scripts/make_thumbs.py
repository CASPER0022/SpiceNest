"""Web-sized WebP versions of the site photos, so pages load a fraction of the original megabytes.

For every photo in a folder under public/images it writes:
  public/images/thumbs/<folder>/<name>.webp  600 px wide: shop cards, cart, portraits, small tiles
  public/images/web/<folder>/<name>.webp     1600 px wide: full-width banners, slideshow, blog photos
Subfolders are kept (farmers/raju/raju.jpeg -> thumbs/farmers/raju/raju.webp).
The site uses these when they exist and falls back to the original photo when they do not
(see src/utils/images.js).

Run it after adding or replacing a photo:
    python frontend/scripts/make_thumbs.py
Needs Pillow (pip install pillow). Existing versions are only rebuilt when the photo is newer.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

IMAGES = Path(__file__).resolve().parent.parent / 'public' / 'images'
OUTPUTS = {'thumbs': (600, 78), 'web': (1600, 76)}  # folder: (max width, WebP quality)
PHOTO_TYPES = {'.jpg', '.jpeg', '.png', '.webp'}


def photos():
    for path in sorted(IMAGES.rglob('*')):
        rel = path.relative_to(IMAGES)
        if path.is_file() and path.suffix.lower() in PHOTO_TYPES and len(rel.parts) > 1 and rel.parts[0] not in OUTPUTS:
            yield path, rel


def main():
    made = skipped = 0
    for photo, rel in photos():
        for out, (width, quality) in OUTPUTS.items():
            target = IMAGES / out / rel.with_suffix('.webp')
            if target.exists() and target.stat().st_mtime >= photo.stat().st_mtime:
                skipped += 1
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(photo) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                if im.width > width:
                    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
                im.save(target, 'WEBP', quality=quality, method=6)
            print(f'{rel} -> {out}: {photo.stat().st_size // 1024} KB -> {target.stat().st_size // 1024} KB')
            made += 1
    print(f'{made} versions made, {skipped} already up to date')


if __name__ == '__main__':
    sys.exit(main())
