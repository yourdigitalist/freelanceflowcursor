#!/usr/bin/env python3
"""Restore landing showcase images from hi-res sources and generate @2x retina variants."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

UPLOADS = Path(__file__).resolve().parents[1] / "public" / "uploads"

SOURCE_OVERRIDES: dict[str, str] = {
    "landing-tasks-section.png": "Tasks-f74e3942-4c59-4d83-b7e8-50fb6bef2b7d.png",
    "landing-time-section.png": "Time-18b95169-a102-46d0-978c-10b5b412388f.png",
    "landing-notes-section.png": "Notes-797dbd6b-7369-4b1d-8f23-e69ae21d2281.png",
    "landing-invoices-section.png": "Invoices-c916544c-ab73-401c-bfca-c61cbef3bef0.png",
    "landing-contracts-section.png": "Contracts-62202970-2a6e-4116-b263-eb13261c6838.png",
    "landing-proposals-section.png": "Proposals-8e28d823-209d-41fd-a0f2-92862aa6c3ed.png",
    "landing-client-portal-section.png": "Client_Portal-c6a0dd1a-6ed1-4a82-8e33-f5d318c4c4bf.png",
}

SHOWCASE_FILES = [
    "landing-dashboard-section.png",
    "landing-clients-crm-section.png",
    "landing-projects-section.png",
    "landing-tasks-section.png",
    "landing-time-section.png",
    "landing-invoices-section.png",
    "landing-proposals-section.png",
    "landing-contracts-section.png",
    "landing-approvals-section.png",
    "landing-client-portal-section.png",
    "landing-notes-section.png",
]

MIN_1X_WIDTH = 704


def load_source(filename: str) -> Image.Image:
    override = SOURCE_OVERRIDES.get(filename)
    path = UPLOADS / (override or filename)
    if not path.exists():
        raise FileNotFoundError(path)
    return Image.open(path).convert("RGBA")


def resize_to_width(img: Image.Image, width: int) -> Image.Image:
    if img.width == width:
        return img
    height = max(1, round(img.height * (width / img.width)))
    return img.resize((width, height), Image.Resampling.LANCZOS)


def save_png(img: Image.Image, path: Path) -> None:
    img.save(path, format="PNG", optimize=True)


def main() -> None:
    for filename in SHOWCASE_FILES:
        src = load_source(filename)
        base = src if src.width >= MIN_1X_WIDTH else resize_to_width(src, MIN_1X_WIDTH)
        retina = resize_to_width(base, base.width * 2)

        out_1x = UPLOADS / filename
        out_2x = UPLOADS / filename.replace(".png", "@2x.png")

        save_png(base, out_1x)
        save_png(retina, out_2x)
        print(f"{filename}: 1x={base.width}px, 2x={retina.width}px")


if __name__ == "__main__":
    main()
