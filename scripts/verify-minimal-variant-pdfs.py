from pathlib import Path

import pymupdf
import zxingcpp
from PIL import Image


for variant in ("cream", "blush", "sage", "blue", "black"):
    pdf_path = Path(f"output/pdf/shineqr-minimal-{variant}-75x100mm-proof.pdf")
    document = pymupdf.open(pdf_path)
    for page_index, face in enumerate(("front", "back")):
        output = Path(f"output/pdf/shineqr-minimal-{variant}-{face}-preview.png")
        document[page_index].get_pixmap(matrix=pymupdf.Matrix(200 / 72, 200 / 72), alpha=False).save(output)
    result = zxingcpp.read_barcode(Image.open(f"output/pdf/shineqr-minimal-{variant}-front-preview.png"))
    print(f"{variant}: {result.text if result else 'NO_QR'}")
