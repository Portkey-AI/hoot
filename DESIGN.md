# 🦇 Screech Design System - Ayu Mirage Edition

## 🎨 Color Palette

### Ayu Mirage Bordered
Based on the beautiful Ayu Mirage theme, optimized for developer tools.

**Backgrounds**
- Primary: `#1f2430` - Deep blue-gray
- Secondary: `#232834` - Slightly lighter
- Tertiary: `#2a2f3d` - Elevated surfaces
- Hover: `#2d3241` - Subtle interaction state
- Active: `#34405e` - Selected/focused state

**Borders**
- Default: `#33415e` - Subtle dividers
- Bright: `#3e4b59` - Prominent borders

**Text**
- Primary: `#cccac2` - Main content
- Secondary: `#707a8c` - Supporting text
- Tertiary: `#5c6773` - Subtle hints
- White: `#d9d7ce` - Headings, emphasis

**Accents**
- Cyan: `#5ccfe6` - Primary actions, links
- Blue: `#73d0ff` - Secondary actions
- Green: `#bae67e` - Success, execution
- Orange: `#ffae57` - Tool counts, highlights
- Red: `#f28779` - Errors, warnings
- Purple: `#d4bfff` - Special elements
- Yellow: `#ffd173` - Warnings, info

## 🔤 Typography

### Fonts
- **Sans**: Inter - Modern, readable UI font
- **Mono**: JetBrains Mono - Developer-focused with ligatures

### Font Usage
- **Headings**: Sans, 700 weight
- **Tool names**: Mono, 600 weight (that dev feel!)
- **Body text**: Sans, 400-500 weight
- **Code/JSON**: Mono, 400 weight with ligatures

## ✨ Key Design Elements

### 1. Logo & Branding
```
🦇 Screech
MCP TESTING TOOL
```
- Bat emoji (screech!)
- Bold, confident typography
- Subtle tagline in uppercase

### 2. Button Styles
**Primary Actions** (Add Server, Execute)
- Gradient backgrounds (`cyan → blue`, `green → dark green`)
- Bold, uppercase text
- Prominent shadows
- Smooth hover lift effect

**Secondary Actions** (Cancel)
- Subtle gray background
- Softer hover state

### 3. Status Indicators
**Connected** (Green dot)
- Glowing effect
- Pulsing animation ring
- Shows vitality

**Disconnected** (Red dot)
- Muted opacity
- No animation

### 4. Interactive Elements
**Hover Effects**
- Subtle border glow
- Slight translate for depth
- Smooth transitions (150ms)

**Focus States**
- Cyan outline (`#5ccfe6`)
- Box shadow for depth

### 5. Cards & Panels
**Server Items**
- Border on hover/active
- Smooth background transitions
- Inset shadow when active

**Tool Items**
- Slide-in effect on hover (`translateX(2px)`)
- Monospace font for tool names
- Accent-colored tool counts

## 🎭 Animations

### Subtle & Purposeful
1. **Fade In** - New content appears (200ms)
2. **Slide In** - List items animate (300ms)
3. **Pulse** - Status indicators (2s loop)
4. **Hover Lifts** - Buttons elevate (150ms)

All animations use GPU acceleration via `transform`

## 📐 Spacing System

Consistent 4px base unit:
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- 2xl: 24px

## 🎪 Character & Personality

### The "Dev Tool" Vibe
- **Monospace where it matters** - Tool names, code, results
- **Glowing accents** - Cyan/green shadows on buttons
- **Smooth but snappy** - Fast transitions, no lag
- **Dark & focused** - Ayu's signature blue-gray palette
- **Professional yet playful** - 🦇 bat mascot adds character

### Visual Hierarchy
1. **High contrast** - White headings on dark backgrounds
2. **Color coding** - Orange for counts, green for success, red for errors
3. **Border emphasis** - Active states get cyan borders
4. **Depth through shadow** - Subtle layering with box-shadows

## 🚀 Performance

All design choices prioritize speed:
- **GPU-accelerated** - Transform-based animations
- **Minimal repaints** - Border/opacity changes over layout shifts
- **Optimized fonts** - Only 2 font families loaded
- **CSS variables** - Instant theme application
- **No heavy frameworks** - Pure CSS, no animation libraries

## 📱 Responsive

While optimized for desktop (MCP dev tools), the design:
- Scales gracefully
- Uses relative units (rem, %)
- Maintains readability at all sizes

## 🎯 Accessibility

- **High contrast ratios** - WCAG AA compliant
- **Focus indicators** - Clear cyan outlines
- **Keyboard navigation** - All interactive elements
- **Readable fonts** - Inter for clarity, JetBrains Mono for code
- **Selection colors** - Custom cyan selection highlighting

---

**The result**: A tool that feels like it was built by developers, for developers. Fast, focused, and beautiful. 🦇✨

