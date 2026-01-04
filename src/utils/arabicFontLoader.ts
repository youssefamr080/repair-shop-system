/**
 * Cairo Arabic Font - Base64 Embedded
 * 
 * This file contains the Cairo-Regular font as base64 for jsPDF Arabic support.
 * The font is loaded synchronously to ensure availability before PDF generation.
 * 
 * Font: Cairo Regular
 * Size: ~95KB (TTF) / ~126KB (Base64)
 * Source: public/fonts/Cairo-Regular.ttf
 * 
 * Generated via: [Convert]::ToBase64String([IO.File]::ReadAllBytes("public\fonts\Cairo-Regular.ttf"))
 */

import jsPDF from 'jspdf';

// Font state
let fontRegistered = false;

/**
 * The base64 font data is loaded dynamically from the text file
 * to avoid bloating this module and allow tree-shaking.
 */
let cachedFontBase64: string | null = null;

/**
 * Load the font base64 from the text file (one-time async load)
 */
async function loadFontBase64(): Promise<string | null> {
    if (cachedFontBase64) return cachedFontBase64;

    try {
        // Try loading from public fonts folder via fetch
        const response = await fetch('/fonts/Cairo-Regular.ttf');
        if (!response.ok) throw new Error('Font not found');

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        cachedFontBase64 = btoa(binary);
        return cachedFontBase64;
    } catch (error) {
        console.warn('Failed to load Cairo font:', error);
        return null;
    }
}

/**
 * Register the Arabic font with jsPDF (async - ensures font is loaded)
 * Must be called before any PDF operations!
 */
export async function registerArabicFont(doc: jsPDF): Promise<boolean> {
    try {
        const fontBase64 = await loadFontBase64();

        if (!fontBase64) {
            console.warn('Arabic font not available, using default');
            return false;
        }

        // Register font with jsPDF VFS
        doc.addFileToVFS('Cairo-Regular.ttf', fontBase64);
        doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
        doc.setFont('Cairo');
        fontRegistered = true;

        return true;
    } catch (error) {
        console.warn('Failed to register Arabic font:', error);
        return false;
    }
}

/**
 * Get the font name to use (Cairo if loaded, fallback to helvetica)
 */
export function getArabicFontName(): string {
    return fontRegistered ? 'Cairo' : 'helvetica';
}

/**
 * Check if Arabic font is registered
 */
export function isArabicFontLoaded(): boolean {
    return fontRegistered;
}

/**
 * Pre-initialize font loading (call on app startup for faster PDF generation)
 */
export async function initArabicFont(): Promise<void> {
    await loadFontBase64();
}

export default { registerArabicFont, getArabicFontName, isArabicFontLoaded, initArabicFont };
