# Hoot Themes

Hoot now supports multiple beautiful themes! Each theme includes carefully crafted color palettes and dynamically generated hills that adapt to the theme colors.

## Available Themes

### 🏔️ Arctic Ice (Default)
**Inspired by:** [Nord Theme](https://www.nordtheme.com/)  
**Colors:** Deep arctic nights with ice blue frost accents  
**Vibe:** Clean, professional, calm

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

## Switching Themes

### Method 1: Link Tag (Recommended)

Add a theme stylesheet link in your `index.html`:

```html
<!-- Default: Arctic Ice -->
<link id="theme-css" rel="stylesheet" href="/src/themes/arctic-ice.css">

<!-- Or choose another theme: -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-dark.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-sea.css"> -->
<!-- <link id="theme-css" rel="stylesheet" href="/src/themes/duotone-forest.css"> -->
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

1. **Copy an existing theme** as a starting point
2. **Define your color palette** (8-15 colors recommended)
3. **Map to semantic variables** (`--theme-*`)
4. **Set hill layer colors** (3 colors, darkest to lightest)
5. **Test for contrast** (WCAG AA minimum: 4.5:1)

### Tips for Great Themes

- ✅ Use 2-3 base hues maximum (DuoTone approach)
- ✅ Ensure readable text contrast
- ✅ Make hills subtle (similar to background colors)
- ✅ Test all UI states (hover, focus, active, disabled)
- ✅ Keep semantic consistency (green=success, red=error)

### Color Contrast Checker

Use tools like:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)

## Theme Showcase

Want to see all themes? Open your browser console and run:

```javascript
// Switch between themes
['arctic-ice', 'duotone-dark', 'duotone-sea', 'duotone-forest']
  .forEach(theme => console.log(theme));
```

## Contributing Themes

Have a beautiful theme? We'd love to see it! Themes inspired by:
- Popular color schemes (Dracula, Gruvbox, Solarized, etc.)
- Nature (Desert, Sunset, Aurora, etc.)
- Seasons (Autumn, Winter, Spring, Summer)
- Your creative vision!

Just create a new CSS file in `src/themes/` following the structure above.

---

**Current Theme System Version:** 1.0  
**Hills Generator:** Dynamic, adapts to theme colors automatically 🏔️

