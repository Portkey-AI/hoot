/**
 * Arctic Ice Hills Generator
 * Generates randomized SVG hills that maintain consistent start/end Y positions
 * across all empty states for visual cohesion.
 */

// Hill layer configuration - consistent start/end Y across all instances
// Colors are read from CSS variables set by the active theme
const HILL_LAYERS = {
    back: { startY: 30, endY: 30, baseHeight: 150, cssVar: '--hills-layer-1', opacity: 0.3 },
    middle: { startY: 90, endY: 90, baseHeight: 150, cssVar: '--hills-layer-2', opacity: 0.4 },
    front: { startY: 120, endY: 120, baseHeight: 150, cssVar: '--hills-layer-3', opacity: 0.5 }
} as const;

/**
 * Generates a smooth, rolling hill path using cubic bezier curves
 * @param width - SVG viewBox width (typically 1920)
 * @param startY - Starting Y position (consistent across instances)
 * @param endY - Ending Y position (consistent across instances)
 * @param height - Total SVG height
 * @param seed - Random seed for reproducibility (optional)
 * @returns SVG path string
 */
function generateHillPath(
    width: number,
    startY: number,
    endY: number,
    height: number,
    seed?: number
): string {
    const random = seed !== undefined ? seededRandom(seed) : Math.random;

    // Number of peaks/valleys (3-5 for variety)
    const numPeaks = Math.floor(random() * 3) + 3;

    // Generate control points for smooth curves
    const points: Array<{ x: number; y: number }> = [];

    // Start point
    points.push({ x: 0, y: startY });

    // Generate intermediate peaks/valleys
    for (let i = 1; i < numPeaks; i++) {
        const x = (width / numPeaks) * i;
        // Vary Y position within reasonable bounds (between startY and bottom)
        const minY = Math.min(startY, endY) - 20;
        const maxY = Math.min(startY, endY) + 40;
        const y = minY + random() * (maxY - minY);
        points.push({ x, y });
    }

    // End point
    points.push({ x: width, y: endY });

    // Build smooth path using cubic bezier curves
    let path = `M${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];

        // Control point distance (about 1/3 of segment)
        const dx = (curr.x - prev.x) / 3;

        // Control points for smooth curve
        const cp1x = prev.x + dx;
        const cp1y = prev.y + (random() - 0.5) * 30;
        const cp2x = curr.x - dx;
        const cp2y = curr.y + (random() - 0.5) * 30;

        path += ` C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    // Close path to bottom
    path += ` V${height} H0 Z`;

    return path;
}

/**
 * Seeded random number generator for reproducibility
 */
function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

/**
 * Generates a complete SVG with 3 hill layers
 * Colors are read from CSS variables based on active theme
 * @param width - SVG viewBox width (default: 1920)
 * @param height - SVG viewBox height (default: 150)
 * @param seed - Random seed for reproducibility (optional)
 * @returns SVG data URI
 */
export function generateHillsSVG(
    width: number = 1920,
    height: number = 150,
    seed?: number
): string {
    const random = seed !== undefined ? seededRandom(seed) : Math.random;

    // Get theme colors from CSS variables (or use defaults)
    const getColor = (cssVar: string, defaultColor: string) => {
        if (typeof window === 'undefined') return defaultColor;
        const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
        return computed || defaultColor;
    };

    const backColor = getColor(HILL_LAYERS.back.cssVar, '#2e3440');
    const middleColor = getColor(HILL_LAYERS.middle.cssVar, '#3b4252');
    const frontColor = getColor(HILL_LAYERS.front.cssVar, '#434c5e');

    const backPath = generateHillPath(
        width,
        HILL_LAYERS.back.startY,
        HILL_LAYERS.back.endY,
        height,
        random()
    );

    const middlePath = generateHillPath(
        width,
        HILL_LAYERS.middle.startY,
        HILL_LAYERS.middle.endY,
        height,
        random()
    );

    const frontPath = generateHillPath(
        width,
        HILL_LAYERS.front.startY,
        HILL_LAYERS.front.endY,
        height,
        random()
    );

    const svg = `<svg viewBox='0 0 ${width} ${height}' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'>
    <path d='${backPath}' fill='${backColor}' fill-opacity='${HILL_LAYERS.back.opacity}'/>
    <path d='${middlePath}' fill='${middleColor}' fill-opacity='${HILL_LAYERS.middle.opacity}'/>
    <path d='${frontPath}' fill='${frontColor}' fill-opacity='${HILL_LAYERS.front.opacity}'/>
  </svg>`;

    // Encode for CSS url()
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Initialize hills for all empty state containers on page load
 * Generates new random hills every time the app loads
 * Each panel gets a unique hill variation
 */
export function initializeHills(): void {
    const baseSeed = Date.now();

    // Generate unique hills for each panel using different seeds
    const mainAreaHills = generateHillsSVG(1920, 150, baseSeed + 1);
    const toolsSidebarHills = generateHillsSVG(1920, 150, baseSeed + 2);
    const serverSidebarHills = generateHillsSVG(1920, 150, baseSeed + 3);
    const emptyStateHills = generateHillsSVG(1920, 150, baseSeed + 4);
    const apiPaneHills = generateHillsSVG(1920, 150, baseSeed + 5);

    // Apply to CSS variables
    document.documentElement.style.setProperty('--hills-main-area', mainAreaHills);
    document.documentElement.style.setProperty('--hills-tools-sidebar', toolsSidebarHills);
    document.documentElement.style.setProperty('--hills-server-sidebar', serverSidebarHills);
    document.documentElement.style.setProperty('--hills-empty-state', emptyStateHills);
    document.documentElement.style.setProperty('--hills-api-pane', apiPaneHills);
}

