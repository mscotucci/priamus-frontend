import {
  DecodedImage,
  ImageEngine,
  JPEG_QUALITY,
  MAX_SIDE,
  preparePhoto,
  scaledSize,
} from './photo-preparation';

/** An engine that "decodes" any file to an image of the given size and "encodes" it to a tagged blob. */
const fakeEngine = (size: { width: number; height: number } | null) => {
  const closed = vi.fn();
  const encoded: { width: number; height: number; quality: number }[] = [];
  const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
  const engine: ImageEngine = {
    decode: vi.fn(() => {
      const image: DecodedImage | null = size === null ? null : { ...size, close: closed };
      return Promise.resolve(image);
    }),
    encode: vi.fn((_image, width, height, quality) => {
      encoded.push({ width, height, quality });
      return Promise.resolve(jpeg);
    }),
  };
  return { engine, encoded, closed, jpeg };
};

describe('scaledSize', () => {
  it.each([
    [4000, 3000, 2000, 1500],
    [3000, 4000, 1500, 2000],
    [6000, 2000, 2000, 667],
    [2000, 1000, 2000, 1000],
    [800, 600, 800, 600],
    [10000, 1, 2000, 1],
  ])('%i x %i becomes %i x %i: longer side at most 2000, never enlarged', (w, h, width, height) => {
    expect(scaledSize(w, h)).toEqual({ width, height });
    expect(Math.max(width, height)).toBeLessThanOrEqual(MAX_SIDE);
  });
});

describe('preparePhoto', () => {
  it('turns a photo into a JPEG of quality 0.8 whose longer side is 2000 px, from the image as decoded', async () => {
    const { engine, encoded, closed, jpeg } = fakeEngine({ width: 4032, height: 3024 });

    const prepared = await preparePhoto(new File(['x'], 'a.heic', { type: 'image/heic' }), engine);

    expect(prepared).toEqual({ kind: 'jpeg', blob: jpeg });
    expect(encoded).toEqual([{ width: 2000, height: 1500, quality: JPEG_QUALITY }]);
    expect(JPEG_QUALITY).toBe(0.8);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('does not enlarge a small photo, which is still saved as a JPEG', async () => {
    const { engine, encoded } = fakeEngine({ width: 640, height: 480 });

    const prepared = await preparePhoto(new File(['x'], 'a.png', { type: 'image/png' }), engine);

    expect(prepared.kind).toBe('jpeg');
    expect(encoded).toEqual([{ width: 640, height: 480, quality: 0.8 }]);
  });

  it('asks the browser to turn the photo the right way when it decodes it', async () => {
    const { engine } = fakeEngine({ width: 10, height: 10 });
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

    await preparePhoto(file, engine);

    expect(engine.decode).toHaveBeenCalledWith(file);
  });

  it('sends a PDF as it is, told by its type', async () => {
    const { engine } = fakeEngine({ width: 10, height: 10 });
    const file = new File(['whatever'], 'bolla.pdf', { type: 'application/pdf' });

    const prepared = await preparePhoto(file, engine);

    expect(prepared).toEqual({ kind: 'pdf', blob: file });
    expect(engine.decode).not.toHaveBeenCalled();
  });

  it('sends a PDF as it is, told by its first bytes when the type is missing', async () => {
    const { engine } = fakeEngine(null);
    const file = new File(['%PDF-1.7 rest'], 'scan', { type: '' });

    const prepared = await preparePhoto(file, engine);

    expect(prepared).toEqual({ kind: 'pdf', blob: file });
  });

  it('refuses an image the browser cannot decode (a HEIC on Chrome)', async () => {
    const { engine } = fakeEngine(null);

    const prepared = await preparePhoto(new File(['x'], 'a.heic', { type: 'image/heic' }), engine);

    expect(prepared).toEqual({ kind: 'unsupported' });
  });

  it('refuses anything that is not a photo or a PDF', async () => {
    const { engine } = fakeEngine(null);

    const prepared = await preparePhoto(
      new File(['a,b'], 'dati.csv', { type: 'text/csv' }),
      engine,
    );

    expect(prepared).toEqual({ kind: 'unsupported' });
  });

  it.each(['image/gif', 'image/bmp', 'image/avif', 'image/x-icon', 'image/svg+xml'])(
    'refuses an image of type %s without decoding it, even if the browser could',
    async (type) => {
      const { engine } = fakeEngine({ width: 100, height: 100 });

      const prepared = await preparePhoto(new File(['x'], 'a', { type }), engine);

      expect(prepared).toEqual({ kind: 'unsupported' });
      expect(engine.decode).not.toHaveBeenCalled();
    },
  );

  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''])(
    'accepts an image of type "%s" and leaves the rest to the decoding',
    async (type) => {
      const { engine } = fakeEngine({ width: 100, height: 100 });

      const prepared = await preparePhoto(new File(['x'], 'a', { type }), engine);

      expect(prepared.kind).toBe('jpeg');
    },
  );

  it('refuses a photo the browser decoded but cannot save as a JPEG, and releases it', async () => {
    const { engine, closed } = fakeEngine({ width: 100, height: 100 });
    (engine.encode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const prepared = await preparePhoto(new File(['x'], 'a.png', { type: 'image/png' }), engine);

    expect(prepared).toEqual({ kind: 'unsupported' });
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
