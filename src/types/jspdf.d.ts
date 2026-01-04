/**
 * jsPDF Extended Type Declarations
 * 
 * Extends jsPDF types for missing methods in v3
 */

import 'jspdf';

declare module 'jspdf' {
    interface jsPDF {
        /**
         * Set Right-to-Left mode for Arabic/Hebrew text
         */
        setR2L(value: boolean): jsPDF;

        /**
         * Get total number of pages in document
         */
        getNumberOfPages(): number;

        /**
         * Internal document structure
         */
        internal: {
            pageSize: {
                getWidth(): number;
                getHeight(): number;
            };
            pages: unknown[];
            scaleFactor: number;
            getNumberOfPages(): number;
        };
    }
}
