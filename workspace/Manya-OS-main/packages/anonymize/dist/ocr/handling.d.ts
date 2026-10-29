/**
 * @manya-os/anonymize — OCR text handling.
 *
 * OCR output often contains misspelled PII that defeats exact-match
 * detectors. This module normalizes OCR output (common substitutions,
 * whitespace) before detection, and also detects OCR-specific artifacts
 * like bounding boxes that may leak layout-derivable identity info.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Normalize OCR text — collapse whitespace, fix common digit/letter errors. */
export declare function normalizeOcrText(input: string): string;
/** A single OCR word with its bounding box (top-left origin, pixels). */
export interface OcrWord {
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    confidence?: number;
}
/** A typed OCR page (words + their boxes). */
export interface OcrPage {
    width: number;
    height: number;
    words: OcrWord[];
}
/** Reconstruct plain text from an OCR page (words joined by spaces, lines preserved approximately). */
export declare function ocrPageToText(page: OcrPage): string;
/** Strip OCR confidence fields and bounding boxes (which can leak layout info). */
export declare function stripOcrGeometry(page: OcrPage): {
    text: string;
};
/** Detect words that are likely OCR misreads of PII markers (e.g. `emaiI` for `email`). */
export declare function findOcrPiiCandidates(text: string): Array<{
    start: number;
    end: number;
    text: string;
    hint: string;
}>;
//# sourceMappingURL=handling.d.ts.map