import {
  buildCompressedFilename,
  buildJpegPdf,
  computeCompressionSearchCeiling,
  extractEmbeddedJpegsFromPdf,
  inferDocumentMime,
  padJpegToExactBytes,
  padPdfToExactBytes,
  padPngToExactBytes,
  type OutputFormatOption,
  type PdfImageSpec,
  type SupportedDocMime,
} from './docCompressor';
import { verifyFileSignature } from './documentLogic';

export interface CompressionOptions {
  targetBytes: number;
  outputFormat: OutputFormatOption;
  exactSize: boolean;
}

export interface CompressionResult {
  file: File;
  outputName: string;
  outputMime: SupportedDocMime;
  originalBytes: number;
  targetBytes: number;
  outputBytes: number;
  exactMatched: boolean;
  withinTarget: boolean;
  previewUrl: string | null;
  note?: string;
}

interface DecodedRaster {
  width: number;
  height: number;
  drawToCanvas: (ctx: CanvasRenderingContext2D, targetW: number, targetH: number) => void;
  dispose: () => void;
}

async function decodeRasterBlob(blob: Blob): Promise<DecodedRaster> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return {
      width: bitmap.width,
      height: bitmap.height,
      drawToCanvas: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      dispose: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image file.'));
      el.src = url;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      drawToCanvas: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

async function canvasEncode(
  raster: DecodedRaster,
  width: number,
  height: number,
  mime: 'image/jpeg' | 'image/png',
  quality?: number
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable in this browser.');
  }
  if (mime === 'image/jpeg') {
    // Paint white paper backing so transparent PNGs flatten cleanly into readable JPGs
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  raster.drawToCanvas(ctx, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Browser failed to encode compressed image.'))),
      mime,
      quality
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function compressRasterToJpegCeiling(
  raster: DecodedRaster,
  ceilingBytes: number
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const scaleSteps = [1, 0.85, 0.7, 0.56, 0.44, 0.34, 0.25, 0.18, 0.12];
  let bestBytes: Uint8Array | null = null;
  let bestW = raster.width;
  let bestH = raster.height;

  for (const scale of scaleSteps) {
    const w = Math.max(48, Math.round(raster.width * scale));
    const h = Math.max(48, Math.round(raster.height * scale));

    // Quick test at minimum reasonable quality to see if this dimension can fit
    const minTrial = await canvasEncode(raster, w, h, 'image/jpeg', 0.12);
    if (!bestBytes || minTrial.length < bestBytes.length) {
      bestBytes = minTrial;
      bestW = w;
      bestH = h;
    }

    if (minTrial.length > ceilingBytes) {
      continue;
    }

    // Binary search highest crisp quality <= ceilingBytes
    let low = 0.12;
    let high = 0.96;
    let fitBytes = minTrial;

    const maxTrial = await canvasEncode(raster, w, h, 'image/jpeg', high);
    if (maxTrial.length <= ceilingBytes) {
      return { bytes: maxTrial, width: w, height: h };
    }

    for (let iter = 0; iter < 8; iter += 1) {
      const mid = (low + high) / 2;
      const probe = await canvasEncode(raster, w, h, 'image/jpeg', mid);
      if (probe.length <= ceilingBytes) {
        fitBytes = probe;
        low = mid;
      } else {
        high = mid;
      }
    }

    return { bytes: fitBytes, width: w, height: h };
  }

  return {
    bytes: bestBytes ?? (await canvasEncode(raster, bestW, bestH, 'image/jpeg', 0.1)),
    width: bestW,
    height: bestH,
  };
}

async function compressRasterToPngCeiling(
  raster: DecodedRaster,
  ceilingBytes: number
): Promise<Uint8Array> {
  const full = await canvasEncode(raster, raster.width, raster.height, 'image/png');
  if (full.length <= ceilingBytes) {
    return full;
  }

  let low = 0.08;
  let high = 1.0;
  let bestFit: Uint8Array | null = null;
  let smallest = full;

  for (let iter = 0; iter < 9; iter += 1) {
    const mid = (low + high) / 2;
    const w = Math.max(32, Math.round(raster.width * mid));
    const h = Math.max(32, Math.round(raster.height * mid));
    const probe = await canvasEncode(raster, w, h, 'image/png');
    if (probe.length < smallest.length) {
      smallest = probe;
    }
    if (probe.length <= ceilingBytes) {
      bestFit = probe;
      low = mid;
    } else {
      high = mid;
    }
  }

  return bestFit ?? smallest;
}

export async function compressDocumentFile(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
  const sourceMime = inferDocumentMime(file.name, file.type);
  if (!sourceMime) {
    throw new Error('Unsupported document type. Please upload a JPG, PNG, or PDF file.');
  }

  const targetMime: SupportedDocMime =
    sourceMime === 'application/pdf'
      ? 'application/pdf'
      : options.outputFormat === 'original'
        ? sourceMime
        : options.outputFormat;

  const originalBytes = file.size;
  const { targetBytes, exactSize } = options;

  if (sourceMime === 'application/pdf') {
    const rawPdf = new Uint8Array(await file.arrayBuffer());
    if (!verifyFileSignature(rawPdf, 'application/pdf')) {
      throw new Error('This file does not have a valid PDF signature.');
    }

    let finalPdf = rawPdf;
    let note: string | undefined;

    if (rawPdf.length > targetBytes) {
      const embeddedJpegs = extractEmbeddedJpegsFromPdf(rawPdf);
      if (embeddedJpegs.length === 0) {
        throw new Error(
          `This PDF (${Math.ceil(rawPdf.length / 1024)} KB) contains vector text/streams rather than embedded page scans, so it cannot shrink further cleanly in the browser.`
        );
      }

      const wrapperBudget = 600 + embeddedJpegs.length * 360;
      const perImageBudget = Math.max(
        1024,
        Math.floor((targetBytes - wrapperBudget - (exactSize ? 4 : 0)) / embeddedJpegs.length)
      );

      const specs: PdfImageSpec[] = [];
      for (const jpegSlice of embeddedJpegs) {
        const raster = await decodeRasterBlob(
          new Blob([new Uint8Array(jpegSlice)], { type: 'image/jpeg' })
        );
        try {
          const compressed = await compressRasterToJpegCeiling(raster, perImageBudget);
          specs.push({
            jpegBytes: compressed.bytes,
            widthPx: compressed.width,
            heightPx: compressed.height,
          });
        } finally {
          raster.dispose();
        }
      }
      finalPdf = new Uint8Array(buildJpegPdf(specs));
      note = `Recompressed ${specs.length} embedded scan page(s) inside PDF.`;
    }

    if (exactSize && finalPdf.length < targetBytes) {
      finalPdf = new Uint8Array(padPdfToExactBytes(finalPdf, targetBytes));
    }

    const outName = buildCompressedFilename(file.name, 'application/pdf');
    const outFile = new File([new Uint8Array(finalPdf)], outName, { type: 'application/pdf' });
    return {
      file: outFile,
      outputName: outName,
      outputMime: 'application/pdf',
      originalBytes,
      targetBytes,
      outputBytes: finalPdf.length,
      exactMatched: finalPdf.length === targetBytes,
      withinTarget: finalPdf.length <= targetBytes,
      previewUrl: null,
      note,
    };
  }

  // Source is JPG or PNG raster image
  const raster = await decodeRasterBlob(file);
  try {
    let finalBytes: Uint8Array;
    let note: string | undefined;

    if (targetMime === 'application/pdf') {
      const pdfWrapperEstimate = 700;
      const searchCeiling = Math.max(
        512,
        targetBytes - pdfWrapperEstimate - (exactSize ? 4 : 0)
      );
      const { bytes: jpegBytes, width, height } = await compressRasterToJpegCeiling(
        raster,
        searchCeiling
      );
      finalBytes = buildJpegPdf([{ jpegBytes, widthPx: width, heightPx: height }]);
      if (exactSize && finalBytes.length < targetBytes) {
        finalBytes = padPdfToExactBytes(finalBytes, targetBytes);
      }
    } else if (targetMime === 'image/png') {
      const searchCeiling = computeCompressionSearchCeiling(targetBytes, 'image/png', exactSize);
      finalBytes = await compressRasterToPngCeiling(raster, searchCeiling);
      if (exactSize && finalBytes.length < targetBytes) {
        const diff = targetBytes - finalBytes.length;
        if (diff >= 14) {
          finalBytes = padPngToExactBytes(finalBytes, targetBytes);
        } else {
          const tighter = await compressRasterToPngCeiling(
            raster,
            Math.max(256, targetBytes - 20)
          );
          if (targetBytes - tighter.length >= 14) {
            finalBytes = padPngToExactBytes(tighter, targetBytes);
          }
        }
      }
      if (finalBytes.length > targetBytes) {
        note = 'Lossless PNG reached minimum readable scale. Try JPG output for smaller sizes.';
      }
    } else {
      const searchCeiling = computeCompressionSearchCeiling(targetBytes, 'image/jpeg', exactSize);
      const encoded = await compressRasterToJpegCeiling(raster, searchCeiling);
      finalBytes = encoded.bytes;
      if (exactSize && finalBytes.length < targetBytes) {
        const diff = targetBytes - finalBytes.length;
        if (diff >= 4) {
          finalBytes = padJpegToExactBytes(finalBytes, targetBytes);
        } else {
          const tighter = await compressRasterToJpegCeiling(
            raster,
            Math.max(256, targetBytes - 8)
          );
          if (targetBytes - tighter.bytes.length >= 4) {
            finalBytes = padJpegToExactBytes(tighter.bytes, targetBytes);
          }
        }
      }
      if (finalBytes.length > targetBytes) {
        note = 'Image reached minimum compression floor at readable dimensions.';
      }
    }

    const outName = buildCompressedFilename(file.name, targetMime);
    const outFile = new File([new Uint8Array(finalBytes)], outName, { type: targetMime });
    const previewUrl = targetMime === 'application/pdf' ? null : URL.createObjectURL(outFile);

    return {
      file: outFile,
      outputName: outName,
      outputMime: targetMime,
      originalBytes,
      targetBytes,
      outputBytes: finalBytes.length,
      exactMatched: finalBytes.length === targetBytes,
      withinTarget: finalBytes.length <= targetBytes,
      previewUrl,
      note,
    };
  } finally {
    raster.dispose();
  }
}
