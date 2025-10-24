# Hoot Design Guide

A comprehensive guide to Hoot's design system, visual language, and UI patterns.

## 🦉 Brand Identity

### Logo & Name
- **Name**: Hoot (always capitalized)
- **Emoji**: 🦉 (owl emoji) - use this for branding
- **Tagline**: "MCP Testing Tool"

### Personality
- **Technical & Developer-focused**: Built for developers who understand MCP
- **Clean & Minimal**: No unnecessary decoration
- **Fast & Efficient**: Everything should feel snappy
- **Friendly but Professional**: Approachable without being cutesy

## 🎨 Color Palette

Hoot uses the **Ayu Mirage** color scheme - a sophisticated dark theme optimized for long coding sessions.

### Background Colors
```css
--bg-primary: #1f2430      /* Main background */
--bg-secondary: #232834    /* Cards, modals */
--bg-tertiary: #2a2f3d     /* Inputs, deeper sections */
--bg-hover: #2d3241        /* Hover states */
--bg-active: #34405e       /* Active states */
```

### Text Colors
```css
--text-primary: #cccac2    /* Body text */
--text-secondary: #707a8c  /* Secondary text, labels */
--text-tertiary: #5c6773   /* Disabled text, placeholders */
--text-white: #d9d7ce      /* Headings, emphasis */
```

### Border Colors
```css
--border-color: #33415e    /* Default borders */
--border-bright: #3e4b59   /* Brighter borders */
```

### Accent Colors
```css
--blue-500: #5ccfe6        /* Primary actions, links (cyan) */
--blue-600: #73d0ff        /* Hover states for blue */
--green-500: #bae67e       /* Success states */
--red-500: #f28779         /* Errors, destructive actions */
--yellow-500: #ffd173      /* Warnings */
--orange-500: #ffae57      /* Alerts, important info */
--purple-500: #d4bfff      /* Special states */
```

### Usage Guidelines

**Primary Actions**: Use cyan (`--blue-500`) with gradient:
```css
background: linear-gradient(135deg, #5ccfe6 0%, #73d0ff 100%);
color: var(--bg-primary);
```

**Success States**: Use green (`--green-500`)
**Errors**: Use red (`--red-500`)
**Warnings**: Use orange (`--orange-500`)

## ✍️ Typography

### Fonts

**Primary Font**: JetBrains Mono (monospace)
- Used for most UI text
- Creates technical, developer-tool aesthetic
- Enables proper alignment in code/data displays

**Secondary Font**: Inter (sans-serif)
- Use sparingly for marketing pages or documentation
- Main app should prioritize JetBrains Mono

```css
--font-mono: 'JetBrains Mono', 'Monaco', 'Menlo', 'Courier New', monospace;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Font Weights
- **400**: Regular (body text)
- **500**: Medium (labels, navigation)
- **600**: Semi-bold (form labels, section titles)
- **700**: Bold (headings, buttons, emphasis)

### Type Scale
```css
/* Headings */
h1: 32px, weight: 700, letter-spacing: -0.3px
h2: 20-24px, weight: 700, letter-spacing: -0.3px
h3: 18px, weight: 600

/* Body */
Body: 14px, weight: 400, line-height: 1.5
Small: 13px
Tiny: 12px

/* Labels */
Labels: 13px, weight: 600, letter-spacing: 0.2px
Uppercase Labels: 12px, weight: 600, letter-spacing: 0.5px, text-transform: uppercase
```

### Capitalization
- **Headings**: Title Case ("Add MCP Server", "Try in Hoot")
- **Labels**: Title Case ("Server Name", "Transport")
- **Buttons**: Title Case ("Add Server", "Connect")
- **Uppercase Labels**: ALL CAPS for section labels and categories
- **NOT**: All lowercase (this isn't Hoot's style)

## 📐 Spacing System

Use consistent spacing for visual rhythm:

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 20px
--spacing-2xl: 24px
```

**Guidelines**:
- Between form fields: 20px (`--spacing-xl`)
- Within cards/modals: 20-24px padding
- Between sections: 32px
- Tight elements (badges, icons): 8px gap

## 🎯 Border Radius

```css
--radius-sm: 4px   /* Small badges, tags */
--radius-md: 6px   /* Buttons, inputs, cards */
--radius-lg: 8px   /* Modals, large containers */
```

## ✨ Shadows

Shadows create depth - use sparingly:

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3)
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5)
```

**Button shadows** (interactive elements):
```css
box-shadow: 0 2px 8px rgba(92, 207, 230, 0.2);  /* Default */
box-shadow: 0 4px 12px rgba(92, 207, 230, 0.3); /* Hover */
```

## 🎬 Animations & Transitions

### Transition Speeds
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Interactive Elements
All interactive elements should have smooth transitions:

```css
transition: all var(--transition-fast);
```

### Hover Effects
Buttons and cards should lift on hover:

```css
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(92, 207, 230, 0.3);
}
```

### Animations
Available animations:
- `fadeIn`: Subtle entry animation
- `slideIn`: Slide from left
- `spin`: Loading spinners
- `pulse`: Attention-grabbing pulse

## 🧩 Components

### Buttons

**Primary Button** (main actions):
```tsx
<button className="btn btn-primary">
  Add Server
</button>
```
```css
.btn-primary {
  background: linear-gradient(135deg, var(--blue-500) 0%, var(--blue-600) 100%);
  color: var(--bg-primary);
  font-weight: 700;
  padding: 11px 24px;
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(92, 207, 230, 0.2);
}
```

**Secondary Button** (cancel, dismiss):
```tsx
<button className="btn btn-secondary">
  Cancel
</button>
```

**Danger Button** (destructive actions):
```tsx
<button className="btn btn-danger">
  Delete Server
</button>
```

### Inputs

```tsx
<div className="form-field">
  <label className="form-label">Server Name</label>
  <input 
    type="text" 
    className="form-input"
    placeholder="My MCP Server"
  />
</div>
```

**Focus State**: Blue glow
```css
.form-input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(92, 207, 230, 0.1);
}
```

### Radio Buttons

```tsx
<div className="radio-group">
  <label className="radio-option">
    <input type="radio" name="transport" value="http" />
    <span>HTTP</span>
  </label>
  <label className="radio-option">
    <input type="radio" name="transport" value="sse" />
    <span>SSE</span>
  </label>
</div>
```

### Badges

Small labels for categories/status:
```tsx
<span className="badge">HTTP</span>
<span className="badge auth">AUTH</span>
```

```css
.badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--blue-500);
}
```

### Modals

```tsx
<div className="modal-overlay">
  <div className="modal">
    <div className="modal-header">
      <h2>🦉 Modal Title</h2>
    </div>
    <div className="modal-body">
      {/* Content */}
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Info Messages

**Info Box**:
```tsx
<div className="info-message">
  ℹ️ This is helpful information
</div>
```

**Warning Box**:
```tsx
<div style={{
  background: 'rgba(255, 174, 87, 0.1)',
  border: '1px solid rgba(255, 174, 87, 0.3)',
  color: 'var(--orange-500)',
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px'
}}>
  ⚠️ Warning message here
</div>
```

**Error Box**:
```tsx
<div className="error-message">
  Error details here
</div>
```

### Cards

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: all var(--transition-fast);
}

.card:hover {
  border-color: var(--blue-500);
  transform: translateY(-2px);
}
```

## 🎭 Icons & Emojis

Hoot uses emojis strategically for visual communication:

### Brand & Identity
- 🦉 - Hoot logo, branding
- 🚀 - Actions, "Try in Hoot" (but prefer 🦉 for branding)

### Common Icons
- 🏷️ - Labels, names
- 🔌 - Transport, connections
- 🌐 - URLs, web
- ⚡ - Commands, execution
- 🔐 - Authentication, security
- 🔧 - Tools
- ⚙️ - Settings
- 📝 - Documentation, notes
- ✓ - Success
- ✗ - Error
- ⚠️ - Warnings
- ℹ️ - Information

**Use sparingly**: Don't overuse emojis. One per section/label is enough.

## 📋 Patterns & Best Practices

### Form Design
1. **Label above input** (not beside)
2. **Required fields** marked with * after label
3. **Help text** below input in small, secondary color
4. **Error messages** appear above form in error box
5. **Submit button** always primary, cancel always secondary

### Data Display
1. **Labels**: Uppercase, secondary color, small font
2. **Values**: Primary color, larger font, bold
3. **Monospace for technical data**: URLs, commands, code
4. **Icons for context**: Add emoji/icon to labels for quick scanning

### Loading States
1. **Buttons**: Show "Loading..." text, disable button
2. **Content**: Show skeleton screens or spinner
3. **Inline**: Small spinner with `spinner-small` class

### Empty States
1. **Large icon** (48px emoji or Lucide icon)
2. **Clear title** explaining what's missing
3. **Helpful description** of what happens when there's content
4. **Optional action button** to add first item

### Error Handling
1. **Show errors prominently** in red error box
2. **Be specific** about what went wrong
3. **Provide action** to fix if possible
4. **Don't blame user** - say "couldn't connect" not "you entered wrong URL"

## 🎨 Example Implementations

### Try in Hoot Button (External)
```html
<a href="https://hoot.app/?try=CONFIG" 
   style="display: inline-flex; align-items: center; gap: 8px; 
          padding: 11px 24px; 
          background: linear-gradient(135deg, #5ccfe6 0%, #73d0ff 100%);
          color: #1f2430; text-decoration: none; border-radius: 6px;
          font-weight: 700; font-family: 'JetBrains Mono', monospace;
          transition: all 0.15s; box-shadow: 0 2px 8px rgba(92, 207, 230, 0.2);">
  <span>🦉</span>
  <span>Try in Hoot</span>
</a>
```

### Server Card
```tsx
<div style={{
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px'
}}>
  <h3 style={{ 
    fontSize: '20px', 
    fontWeight: 700,
    marginBottom: '8px' 
  }}>
    Server Name
    <span className="badge">HTTP</span>
  </h3>
  <p style={{ 
    color: 'var(--text-secondary)',
    marginBottom: '16px' 
  }}>
    Description of the server
  </p>
</div>
```

## 🚫 Don'ts

- ❌ Don't use all lowercase for everything (only in casual docs like README)
- ❌ Don't mix Inter and JetBrains Mono randomly
- ❌ Don't use bright, saturated colors (stick to Ayu palette)
- ❌ Don't add unnecessary animations
- ❌ Don't use custom fonts beyond JetBrains Mono and Inter
- ❌ Don't use box-shadows on everything (only for elevation)
- ❌ Don't use the 🚀 emoji for branding (use 🦉)

## ✅ Dos

- ✓ Use 🦉 for Hoot branding
- ✓ Prefer JetBrains Mono for UI
- ✓ Use consistent spacing (8px increments)
- ✓ Add smooth transitions to interactive elements
- ✓ Use CSS variables for all colors
- ✓ Keep it minimal and fast
- ✓ Test in dark mode (it's all we have!)

## 📚 Resources

- **Color Palette**: `src/index.css` (Ayu Mirage variables)
- **Modal Styles**: `src/components/Modal.css`
- **Example Components**: `src/components/`
- **Try in Hoot Examples**: `examples/try-in-hoot-*.html`

## 🤝 Contributing

When adding new features:
1. Use existing CSS variables
2. Match the existing component patterns
3. Add smooth transitions
4. Test hover/focus states
5. Ensure accessibility (focus rings, etc.)
6. Keep performance in mind (use transforms, avoid layout thrashing)

---

Made with 🦉 by the Hoot team

