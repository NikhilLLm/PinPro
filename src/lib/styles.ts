// ─── style-presets.ts ───────────────────────────────

// Each visual style has its own design system
export const STYLE_PRESETS = {
    minimal: {
        fontFamily: "Inter",
        canvasBg: "FFFFFF",
        roles: {
            hook: { fs: 82, fw: "800", co: "1A1A1A", alpha: 1 },
            subheading: { fs: 40, fw: "600", co: "444444", alpha: 1 },
            body: { fs: 32, fw: "400", co: "666666", alpha: 1 },
            tip: { fs: 28, fw: "400", co: "888888", alpha: 0.9 },
            label: { fs: 22, fw: "400", co: "AAAAAA", alpha: 0.8 },
            cta: { fs: 26, fw: "600", co: "1A1A1A", alpha: 1 },
            step: { fs: 36, fw: "700", co: "1A1A1A", alpha: 1 },
            column: { fs: 32, fw: "600", co: "333333", alpha: 1 },
            center: { fs: 34, fw: "500", co: "1A1A1A", alpha: 1 },
            annotation: { fs: 20, fw: "400", co: "666666", alpha: 0.8 },
        }
    },
    bold: {
        fontFamily: "Montserrat",
        canvasBg: "000000",
        roles: {
            hook: { fs: 90, fw: "900", co: "FFFFFF", alpha: 1 },
            subheading: { fs: 44, fw: "700", co: "FFD700", alpha: 1 },
            body: { fs: 34, fw: "400", co: "EEEEEE", alpha: 1 },
            tip: { fs: 30, fw: "400", co: "CCCCCC", alpha: 0.9 },
            label: { fs: 24, fw: "300", co: "999999", alpha: 0.8 },
            cta: { fs: 28, fw: "700", co: "FFD700", alpha: 1 },
            step: { fs: 40, fw: "800", co: "FFFFFF", alpha: 1 },
            column: { fs: 36, fw: "700", co: "FFD700", alpha: 1 },
            center: { fs: 38, fw: "600", co: "FFFFFF", alpha: 1 },
            annotation: { fs: 22, fw: "300", co: "CCCCCC", alpha: 0.8 },
        }
    },
    editorial: {
        fontFamily: "Playfair Display",
        canvasBg: "F5F0EB",
        roles: {
            hook: { fs: 86, fw: "700", co: "2C1810", alpha: 1 },
            subheading: { fs: 38, fw: "400", co: "5C4033", alpha: 1 },
            body: { fs: 30, fw: "300", co: "6D4C41", alpha: 1 },
            tip: { fs: 26, fw: "300", co: "8D6E63", alpha: 0.9 },
            label: { fs: 20, fw: "300", co: "A1887F", alpha: 0.8 },
            cta: { fs: 24, fw: "600", co: "2C1810", alpha: 1 },
            step: { fs: 32, fw: "400", co: "2C1810", alpha: 1 },
            column: { fs: 28, fw: "300", co: "5C4033", alpha: 1 },
            center: { fs: 30, fw: "400", co: "2C1810", alpha: 1 },
            annotation: { fs: 18, fw: "300", co: "8D6E63", alpha: 0.8 },
        }
    },
    dark: {
        fontFamily: "Inter",
        canvasBg: "0A0A0A",
        roles: {
            hook: { fs: 84, fw: "800", co: "FFFFFF", alpha: 1 },
            subheading: { fs: 40, fw: "500", co: "E0E0E0", alpha: 1 },
            body: { fs: 32, fw: "400", co: "BDBDBD", alpha: 1 },
            tip: { fs: 28, fw: "300", co: "9E9E9E", alpha: 0.9 },
            label: { fs: 22, fw: "300", co: "757575", alpha: 0.8 },
            cta: { fs: 26, fw: "600", co: "FFFFFF", alpha: 1 },
            step: { fs: 36, fw: "700", co: "FFFFFF", alpha: 1 },
            column: { fs: 32, fw: "500", co: "E0E0E0", alpha: 1 },
            center: { fs: 34, fw: "400", co: "FFFFFF", alpha: 1 },
            annotation: { fs: 20, fw: "300", co: "9E9E9E", alpha: 0.8 },
        }
    },
    pastel: {
        fontFamily: "Inter",
        canvasBg: "FFF0F5",
        roles: {
            hook: { fs: 80, fw: "800", co: "D63384", alpha: 1 },
            subheading: { fs: 38, fw: "600", co: "E91E8C", alpha: 1 },
            body: { fs: 30, fw: "400", co: "AD1457", alpha: 1 },
            tip: { fs: 26, fw: "400", co: "C2185B", alpha: 0.9 },
            label: { fs: 20, fw: "300", co: "F48FB1", alpha: 0.8 },
            cta: { fs: 24, fw: "700", co: "880E4F", alpha: 1 },
            step: { fs: 34, fw: "700", co: "D63384", alpha: 1 },
            column: { fs: 30, fw: "600", co: "E91E8C", alpha: 1 },
            center: { fs: 32, fw: "500", co: "D63384", alpha: 1 },
            annotation: { fs: 18, fw: "300", co: "C2185B", alpha: 0.8 },
        }
    },

    nature: {
        fontFamily: "Lora",
        canvasBg: "F1F8E9",
        roles: {
            hook: { fs: 82, fw: "700", co: "1B5E20", alpha: 1 },
            subheading: { fs: 38, fw: "500", co: "2E7D32", alpha: 1 },
            body: { fs: 30, fw: "400", co: "388E3C", alpha: 1 },
            tip: { fs: 26, fw: "300", co: "43A047", alpha: 0.9 },
            label: { fs: 20, fw: "300", co: "81C784", alpha: 0.8 },
            cta: { fs: 24, fw: "600", co: "1B5E20", alpha: 1 },
            step: { fs: 34, fw: "600", co: "1B5E20", alpha: 1 },
            column: { fs: 30, fw: "500", co: "2E7D32", alpha: 1 },
            center: { fs: 32, fw: "400", co: "1B5E20", alpha: 1 },
            annotation: { fs: 18, fw: "300", co: "43A047", alpha: 0.8 },
        }
    },
};
