/** What a file chosen by the driver becomes before it is sent: a JPEG photo, a PDF as it is, or nothing we accept. */
export type PreparedFile =
  { kind: 'jpeg'; blob: Blob } | { kind: 'pdf'; blob: Blob } | { kind: 'unsupported' };

/** The longer side of a prepared photo, in pixels. */
export const MAX_SIDE = 2000;
/** The quality the JPEG is saved with. */
export const JPEG_QUALITY = 0.8;

/** An image the browser decoded, with its orientation already applied. */
export interface DecodedImage {
  width: number;
  height: number;
  /** Releases what the browser holds for the image. */
  close(): void;
}

/** The browser calls the preparation needs, so that its decisions can be tested without a browser. */
export interface ImageEngine {
  /** Decodes the file turned the right way; `null` when the browser cannot read it as an image. */
  decode(file: Blob): Promise<DecodedImage | null>;
  /** Draws the image at the given size and saves it as a JPEG; `null` when the browser cannot. */
  encode(image: DecodedImage, width: number, height: number, quality: number): Promise<Blob | null>;
}

/** The size of an image after scaling so that its longer side is at most `MAX_SIDE`; never enlarged. */
export function scaledSize(width: number, height: number): { width: number; height: number } {
  const longer = Math.max(width, height);
  if (longer <= MAX_SIDE) {
    return { width, height };
  }
  const ratio = MAX_SIDE / longer;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** The image types a photo may come in; a file with no type is left to the decoding. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const PDF_MARK = '%PDF-';

async function isPdf(file: Blob): Promise<boolean> {
  if (file.type === 'application/pdf') {
    return true;
  }
  const start = new Uint8Array(await file.slice(0, PDF_MARK.length).arrayBuffer());
  return PDF_MARK.split('').every((char, index) => start[index] === char.charCodeAt(0));
}

/**
 * Prepares a file for sending: a PDF as it is; an image of an accepted type (or of no type) decoded with
 * its orientation applied, scaled and saved as JPEG; anything else, or an image the browser cannot
 * decode, is `unsupported`.
 */
export async function preparePhoto(
  file: Blob,
  engine: ImageEngine = browserImageEngine,
): Promise<PreparedFile> {
  if (await isPdf(file)) {
    return { kind: 'pdf', blob: file };
  }
  if (file.type !== '' && !IMAGE_TYPES.includes(file.type)) {
    return { kind: 'unsupported' };
  }
  const image = await engine.decode(file);
  if (image === null) {
    return { kind: 'unsupported' };
  }
  try {
    const { width, height } = scaledSize(image.width, image.height);
    const blob = await engine.encode(image, width, height, JPEG_QUALITY);
    return blob === null ? { kind: 'unsupported' } : { kind: 'jpeg', blob };
  } finally {
    image.close();
  }
}

/** The engine of the real browser: `createImageBitmap` for the decoding, a canvas for the saving. */
const browserImageEngine: ImageEngine = {
  async decode(file) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      return null;
    }
  },
  encode(image, width, height, quality) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) {
      return Promise.resolve(null);
    }
    // A JPEG has no transparency: what a PNG leaves clear would turn black.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image as ImageBitmap, 0, 0, width, height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  },
};
