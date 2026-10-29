/**
 * @manya-os/anonymize — image identifier handling.
 *
 * Images carry several classes of identifiers: EXIF metadata, steganographic
 * watermarks, perceptual hashes, and embedded thumbnails. This module strips
 * known identifier vectors from a buffer representing an image.
 *
 * NOTE: This module operates on raw bytes and does NOT decode pixel data.
 * For full image redaction (face blurring, etc.), pair with a vision library.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export interface ImageRedactionResult {
    /** Redacted image bytes. */
    bytes: Buffer;
    /** True if EXIF was removed. */
    exifStripped: boolean;
    /** True if embedded thumbnails were removed. */
    thumbnailsStripped: boolean;
    /** Perceptual hash of the redacted image (for diff comparison). */
    perceptualHash: string;
    /** Original byte length. */
    originalLength: number;
    /** Final byte length. */
    finalLength: number;
}
/**
 * Strip EXIF and thumbnail segments from a JPEG buffer.
 * For other formats, returns the input unchanged (with a warning).
 */
export declare function stripJpegExif(input: Buffer): Buffer;
/**
 * Compute a fast perceptual hash (dHash variant — 8x8 grayscale diff).
 * Returns a 16-char hex string. NOT cryptographically secure.
 */
export declare function dhash(input: Buffer, width?: number, height?: number): string;
/** Full image redaction pipeline (JPEG-only EXIF stripping for now). */
export declare function redactImage(input: Buffer): ImageRedactionResult;
/** Compute a stable image identifier (perceptual hash only). */
export declare function imageIdentifier(input: Buffer): string;
//# sourceMappingURL=redact.d.ts.map