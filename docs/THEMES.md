# Hoot Themes

Hoot now supports multiple beautiful themes! Each theme includes carefully crafted color palettes and dynamically generated hills that adapt to the theme colors.

## Available Themes

### Dark Themes

### 🌑 Arctic Night (Default Dark)
**Inspired by:** [Nord Theme](https://www.nordtheme.com/)  
**Colors:** Deep arctic nights with ice blue frost accents  
**Vibe:** Clean, professional, calm

### 🌀 Ayu Mirage (Original)
**Inspired by:** [Ayu Theme](https://github.com/ayu-theme)  
**Colors:** Deep blue-gray base with soft, desaturated accents  
**Vibe:** Calm, muted, eye-friendly, minimal contrast

### 🌙 DuoTone Dark
**Inspired by:** Atom's DuoTone Dark  
**Colors:** Deep purple base with warm gold accents  
**Vibe:** Rich, sophisticated, warm

### 🌊 DuoTone Sea  
**Inspired by:** Atom's DuoTone themes  
**Colors:** Ocean blue base with turquoise/cyan accents  
**Vibe:** Oceanic, refreshing, fluid

### 🌲 DuoTone Forest
**Inspired by:** Atom's DuoTone themes  
**Colors:** Forest green base with lime/spring green accents  
**Vibe:** Natural, earthy, fresh

### Light Themes

### ❄️ Nordic Snow (Default Light)
**Inspired by:** [Nord Theme](https://www.nordtheme.com/) (Light Variant)  
**Colors:** Bright snow white with cool blue frost accents  
**Vibe:** Clean, airy, professional, perfect for daytime work

### ☀️ Ayu Light
**Inspired by:** [Ayu Theme](https://github.com/ayu-theme) (Light Variant)  
**Colors:** Warm off-white base with soft, desaturated accents  
**Vibe:** Warm, gentle, eye-friendly, minimal eye strain

### ✨ DuoTone Light
**Inspired by:** Atom's DuoTone themes (Light Variant)  
**Colors:** Warm champagne/cream base with amber and honey accents  
**Vibe:** Warm, sophisticated, gentle contrast

## Switching Themes

### Method 1: Link Tag (Recommended)

Add a theme stylesheet link in your `index.html`:

```html
<!-- Default: Arctic Night (Dark) - auto-detects system preference -->
<link id="theme-css" rel="stylesheet" href="/src/themes/arctic-night.css">

<!-- Dark Themes: -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/ayu-mirage.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-dark.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-sea.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-forest.css"> -->

<!-- Light Themes: -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/nordic-snow.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/ayu-light.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-light.css"> -->
```

### Method 2: Dynamic Switching

```javascript
// Create a theme switcher
function switchTheme(themeName) {
  const link = document.getElementById('theme-css');
  link.href = `/src/themes/${themeName}.css`;
  
  // Store preference
  localStorage.setItem('hoot-theme', themeName);
  
  // Regenerate hills with new theme colors
  if (window.initializeHills) {
    window.initializeHills();
  }
}

// Usage
switchTheme('duotone-sea');
```

### Method 3: Import in JS

```javascript
// In your main.tsx or App.tsx
import './themes/arctic-ice.css';
// OR
import './themes/duotone-dark.css';
// OR
import './themes/duotone-sea.css';
// OR
import './themes/duotone-forest.css';
```

## Theme Structure

Each theme defines:

1. **Color Palette** - Base colors specific to the theme
2. **Theme Variables** - Semantic mappings (`--theme-*`) that components use
3. **Hill Layers** - Colors for the 3 background hill layers

### Example Theme Structure

```css
:root {
  /* 1. Theme-specific color palette */
  --my-dark-0: #1a1a1a;
  --my-accent: #00ff00;
  /* ... more colors */
  
  /* 2. Semantic theme variable mappings */
  --theme-bg-primary: var(--my-dark-0);
  --theme-accent-primary: var(--my-accent);
  /* ... more mappings */
  
  /* 3. Hill layer colors (for dynamic generation) */
  --hills-layer-1: #2a2a2a;
  --hills-layer-2: #3a3a3a;
  --hills-layer-3: #4a4a4a;
}
```

## Creating Custom Themes

Follow these steps to create a new theme and add it to the theme switcher:

### Step 1: Create the Theme CSS File

1. **Copy an existing theme** from `src/themes/` as a starting point
2. **Rename it** to your theme name (e.g., `my-theme.css`)
3. **Define your color palette** (8-15 colors recommended)
4. **Map to semantic variables** (`--theme-*`)
5. **Set hill layer colors** (3 colors, darkest to lightest for dark themes, lightest to darker for light themes)
6. **Test for contrast** (WCAG AA minimum: 4.5:1 for text)

**Example:** Create `src/themes/sunset-glow.css`

```css
/**
 * Hoot Theme: Sunset Glow
 * Warm sunset colors with orange and pink accents
 */

:root {
    /* Your color palette */
    --sunset-bg-0: #1a1515;
    --sunset-accent: #ff6b35;
    /* ... more colors */
    
    /* Theme variable mappings (REQUIRED) */
    --theme-bg-primary: var(--sunset-bg-0);
    --theme-accent-primary: var(--sunset-accent);
    /* ... all other theme variables */
    
    /* Hills layers (REQUIRED) */
    --hills-layer-1: #2a1f1f;
    --hills-layer-2: #3a2a2a;
    --hills-layer-3: #4a3535;
    
    /* Legacy support (REQUIRED) */
    --bg-primary: var(--theme-bg-primary);
    /* ... other legacy mappings */
}
```

### Step 2: Register the Theme in main.tsx

Open `src/main.tsx` and add your theme:

```typescript
// Add your import with the other theme imports
import sunsetGlowTheme from './themes/sunset-glow.css?inline';

// Add to the themes map
const themes: Record<string, string> = {
  'arctic-ice': arcticIceTheme,
  'ayu-mirage': ayuMirageTheme,
  // ... existing themes
  'sunset-glow': sunsetGlowTheme,  // ← Add your theme here
};
```

### Step 3: Add to Theme Switcher

Open `src/components/ThemeSwitcher.tsx` and add your theme to the `THEMES` array:

```typescript
const THEMES = [
    // Dark Themes
    { id: 'arctic-night', name: 'Arctic Night', emoji: '🌑' },
    // ... existing themes
    { id: 'sunset-glow', name: 'Sunset Glow', emoji: '🔥' },  // ← Add here
];
```

**That's it!** Your theme is now available in the theme switcher dropdown. 🎨

### Step 4: Test Your Theme

1. Start your dev server: `npm run dev`
2. Click the theme switcher (palette icon in header)
3. Select your new theme from the dropdown
4. Verify all UI elements look correct:
   - Text is readable on all backgrounds
   - Buttons have proper hover states
   - Borders are visible but subtle
   - Semantic colors work (success, error, warning)
   - Hills blend nicely with the background

### Required CSS Variables

Your theme **must** define these variables for full compatibility:

**Backgrounds:**
- `--theme-bg-primary` - Main background
- `--theme-bg-secondary` - Cards, elevated surfaces
- `--theme-bg-tertiary` - Secondary surfaces
- `--theme-bg-hover` - Hover states
- `--theme-bg-active` - Active/selected states

**Text:**
- `--theme-text-primary` - Main text
- `--theme-text-secondary` - Secondary text
- `--theme-text-tertiary` - Muted text
- `--theme-text-white` - Light text (for legacy support, avoid using directly)
- `--theme-text-placeholder` - Placeholder text
- `--theme-text-on-accent` - Text on colored backgrounds/buttons (adapts to theme)

**Borders:**
- `--theme-border-color` - Default borders
- `--theme-border-bright` - Highlighted borders

**Accents:**
- `--theme-accent-primary` - Primary accent
- `--theme-accent-primary-hover` - Accent hover state
- `--theme-accent-secondary` - Secondary accent
- `--theme-accent-tertiary` - Tertiary accent
- `--theme-accent-deep` - Deep accent

**Semantic:**
- `--theme-success` - Success state
- `--theme-success-bright` - Bright success
- `--theme-error` - Error state
- `--theme-warning` - Warning state
- `--theme-info` - Info state
- `--theme-special` - Special state

**Hills:**
- `--hills-layer-1` - Back hill layer
- `--hills-layer-2` - Middle hill layer
- `--hills-layer-3` - Front hill layer

**Legacy Support:** Map all `--theme-*` variables to `--bg-*`, `--text-*`, and color variables for backward compatibility. See existing themes for examples.

### Tips for Great Themes

- ✅ Use 2-3 base hues maximum (DuoTone approach)
- ✅ Ensure readable text contrast (4.5:1 minimum)
- ✅ Make hills subtle (similar to background colors)
- ✅ Test all UI states (hover, focus, active, disabled)
- ✅ Keep semantic consistency (green=success, red=error)
- ✅ Test in both light and dark environments
- ✅ Choose meaningful emoji that represents your theme

### Color Contrast Checker

Use tools like:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)

## Theme Showcase

Want to see all themes? Open your browser console and run:

```javascript
// Switch between themes
const darkThemes = ['arctic-night', 'ayu-mirage', 'duotone-dark', 'duotone-sea', 'duotone-forest'];
const lightThemes = ['nordic-snow', 'ayu-light', 'duotone-light'];
const allThemes = [...darkThemes, ...lightThemes];

allThemes.forEach(theme => console.log(theme));
```

## Contributing Themes

Have a beautiful theme? We'd love to see it! 

### Theme Inspiration Ideas

Themes can be inspired by:
- **Popular color schemes:** Dracula, Gruvbox, Solarized, Tokyo Night, Catppuccin, One Dark, Material
- **Nature:** Desert sands, Sunset skies, Aurora borealis, Ocean depths, Mountain peaks
- **Seasons:** Autumn leaves, Winter frost, Spring blossoms, Summer sunshine
- **Time of day:** Dawn, Midday, Dusk, Midnight
- **Materials:** Rose gold, Jade, Obsidian, Coral
- **Your creative vision!**

### Submission Checklist

Before submitting a theme PR:

- [ ] Theme CSS file created in `src/themes/`
- [ ] Theme registered in `src/main.tsx` (import + map)
- [ ] Theme added to `src/components/ThemeSwitcher.tsx`
- [ ] All required CSS variables defined
- [ ] Text contrast meets WCAG AA (4.5:1 minimum)
- [ ] Tested all UI states (hover, focus, active)
- [ ] Hills blend well with background
- [ ] Documentation includes theme name, inspiration, colors, and vibe
- [ ] Meaningful emoji chosen for theme switcher

### Quick Theme Template

```bash
# 1. Copy an existing theme as template
cp src/themes/arctic-ice.css src/themes/my-theme.css

# 2. Edit your theme colors
# (Update the color palette and theme name)

# 3. Add to main.tsx
# Import: import myTheme from './themes/my-theme.css?inline';
# Map: 'my-theme': myTheme,

# 4. Add to ThemeSwitcher.tsx
# { id: 'my-theme', name: 'My Theme', emoji: '🎨' },

# 5. Test it!
npm run dev
```

---

**Current Theme System Version:** 1.0  
**Hills Generator:** Dynamic, adapts to theme colors automatically 🏔️

