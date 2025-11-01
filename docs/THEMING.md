# Hoot Theming System

## Overview

Hoot uses a theme-based CSS variable system that separates color definitions from their semantic usage. This makes it easy to create and switch between different visual themes while maintaining consistent component styling.

## Architecture

### Color Palette Layer (Nord Colors)

The base layer defines the raw color palette. Currently using the [Nord](https://www.nordtheme.com/) arctic color scheme:

```css
/* Polar Night - Dark backgrounds */
--nord0: #242933;  /* Deepest - primary backgrounds */
--nord1: #2e3440;  /* Elevated surfaces */
--nord2: #3b4252;  /* Selections, hover states */
--nord3: #434c5e;  /* UI elements, borders */
--nord4-dark: #4c566a;  /* Subtle elements */

/* Snow Storm - Light text */
--nord4: #d8dee9;  /* UI text */
--nord5: #e5e9f0;  /* Subtle text */
--nord6: #eceff4;  /* Primary text */
--nord6-bright: #f9fafb;  /* Emphasized text */

/* Frost - Blue accents */
--nord7: #8fbcbb;  /* Calm polar water */
--nord8: #88c0d0;  /* Pure ice - PRIMARY ACCENT */
--nord8-bright: #9cd9e6;  /* Bright frost hover */
--nord9: #81a1c1;  /* Arctic waters */
--nord10: #5e81ac;  /* Deep ocean */

/* Aurora - Semantic colors */
--nord11: #bf616a;  /* Red - errors */
--nord12: #d08770;  /* Orange - info */
--nord13: #ebcb8b;  /* Yellow - warnings */
--nord14: #a3be8c;  /* Green - success */
--nord14-bright: #b5d49a;  /* Bright green */
--nord15: #b48ead;  /* Purple - special */
```

### Theme Semantic Layer

The theme layer maps colors to their semantic purpose. All components should use these variables:

#### Backgrounds
```css
--theme-bg-primary: var(--nord0);      /* Main app background */
--theme-bg-secondary: var(--nord1);    /* Cards, panels */
--theme-bg-tertiary: var(--nord2);     /* Inputs, buttons */
--theme-bg-hover: var(--nord2);        /* Hover states */
--theme-bg-active: var(--nord3);       /* Active/pressed states */
```

#### Text
```css
--theme-text-primary: var(--nord6-bright);    /* Headings, important text */
--theme-text-secondary: var(--nord5);         /* Body text */
--theme-text-tertiary: var(--nord4);          /* Subtle text */
--theme-text-white: var(--nord6-bright);      /* Always light text */
--theme-text-placeholder: var(--nord4-dark);  /* Placeholders */
```

#### Borders
```css
--theme-border-color: var(--nord3);     /* Default borders */
--theme-border-bright: var(--nord8);    /* Highlighted borders */
```

#### Accent Colors (Frost - Primary UI)
```css
--theme-accent-primary: var(--nord8);           /* Primary actions, focus */
--theme-accent-primary-hover: var(--nord8-bright);  /* Hover state */
--theme-accent-secondary: var(--nord7);         /* Secondary accents */
--theme-accent-tertiary: var(--nord9);          /* Tertiary accents */
--theme-accent-deep: var(--nord10);             /* Deep accents */
```

#### Semantic Colors (Aurora - Status)
```css
--theme-success: var(--nord14);               /* Success states */
--theme-success-bright: var(--nord14-bright); /* Bright success */
--theme-error: var(--nord11);                 /* Errors */
--theme-warning: var(--nord13);               /* Warnings */
--theme-info: var(--nord12);                  /* Info */
--theme-special: var(--nord15);               /* Special items */
```

### Legacy Support Layer

For backward compatibility, old variable names are aliased:

```css
--bg-primary: var(--theme-bg-primary);
--text-primary: var(--theme-text-primary);
--blue-500: var(--theme-accent-primary);
/* etc... */
```

## Design System Constants

### Typography
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Monaco', 'Menlo', 'Courier New', monospace;
```

### Spacing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-2xl: 24px;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
```

### Shadows
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
```

### Transitions
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

## Background Hills System

Hoot features subtle SVG background hills with 3 variations for visual variety:

```css
--hills-variant-1: url("data:image/svg+xml,...");  /* Gentle slopes */
--hills-variant-2: url("data:image/svg+xml,...");  /* Steeper peaks */
--hills-variant-3: url("data:image/svg+xml,...");  /* Rolling waves */
```

**Usage:**
- Main content area: Variant 1
- Tools sidebar: Variant 2
- Server sidebar: Variant 3
- Empty states: Variant 1
- API pane: Variant 1 (scaled to 120px height)

## Creating a New Theme

To create a new theme (e.g., "Sunset Desert"):

1. **Define your color palette** in `:root`:
```css
:root {
  /* Desert Color Palette */
  --desert-dark: #2c1810;
  --desert-sand: #d4a574;
  --desert-sun: #e8763a;
  /* etc... */
}
```

2. **Map to theme semantic variables**:
```css
:root {
  --theme-bg-primary: var(--desert-dark);
  --theme-accent-primary: var(--desert-sun);
  /* etc... */
}
```

3. **Create hill variations** matching your theme:
```css
--hills-variant-1: url("data:image/svg+xml,...");  /* Dunes */
--hills-variant-2: url("data:image/svg+xml,...");  /* Mesas */
--hills-variant-3: url("data:image/svg+xml,...");  /* Plateaus */
```

4. **Components automatically adapt** to the new theme!

## Theme Switching (Future)

To support runtime theme switching:

1. Create theme definition files:
   - `themes/arctic-ice.css`
   - `themes/sunset-desert.css`
   - etc.

2. Load theme dynamically:
```javascript
function applyTheme(themeName) {
  const link = document.getElementById('theme-css');
  link.href = `themes/${themeName}.css`;
}
```

3. Store preference:
```javascript
localStorage.setItem('hoot-theme', 'arctic-ice');
```

## Best Practices

### ✅ DO:
- Use theme semantic variables (`--theme-*`) in components
- Use spacing/typography constants for consistency
- Test your theme in all app states (empty, loading, error, success)
- Ensure sufficient contrast (WCAG AA minimum)
- Use `--theme-accent-primary` for all primary actions

### ❌ DON'T:
- Hardcode color values in components
- Use palette variables (`--nord*`) directly in components
- Skip testing accessibility
- Use the same hill variant everywhere
- Mix different visual metaphors (ice + desert)

## Current Theme: Arctic Ice 🏔️

The Arctic Ice theme embodies:
- **Clean & Uncluttered**: Nord's minimalist aesthetic
- **North Bluish Hue**: Frost colors (`--nord7` to `--nord10`)
- **Snowy Owl Character**: Hedwig-inspired, wise and elegant
- **Story**: A tundra landscape with rolling ice hills and aurora accents

### Color Story:
- **Polar Night**: Deep arctic skies (backgrounds)
- **Snow Storm**: Fresh snow (text)
- **Frost**: Frozen water and ice crystals (primary UI)
- **Aurora**: Northern lights (semantic colors)

### Visual Elements:
- Frost glow on focus states
- Ice crystal shadows
- Rolling hill backgrounds
- Aurora gradients on interactive elements

## Reference

- Nord Theme: https://www.nordtheme.com/
- Colors & Palettes: https://www.nordtheme.com/docs/colors-and-palettes

