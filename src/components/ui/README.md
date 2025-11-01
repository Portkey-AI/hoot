# UI Components

Reusable, styled UI components for Hoot following modern design principles inspired by shadcn/ui.

## Components

### Button

A versatile button component with multiple variants and sizes.

**Variants:**
- `primary` - Main call-to-action (default)
- `secondary` - Secondary actions
- `danger` - Destructive actions
- `ghost` - Minimal, transparent button
- `outline` - Outlined style

**Sizes:**
- `sm` - Small (32px height)
- `md` - Medium (38px height) - default
- `lg` - Large (44px height)

**Usage:**
```tsx
import { Button } from '@/components/ui';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Secondary button
<Button variant="secondary" size="sm">
  Cancel
</Button>

// Danger button
<Button variant="danger" disabled={isDeleting}>
  Delete Server
</Button>

// Ghost button
<Button variant="ghost">
  <IconSettings /> Settings
</Button>

// Loading state
<Button className="btn-loading" disabled>
  Processing...
</Button>
```

---

### Input

A text input component with label, error states, and helper text.

**Props:**
- `label` - Optional label text
- `error` - Error message to display
- `helperText` - Helper text below input
- `required` - Shows required asterisk

**Usage:**
```tsx
import { Input } from '@/components/ui';

// Basic input
<Input 
  label="Server Name"
  placeholder="Enter server name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// With validation
<Input 
  label="API Key"
  required
  error={errors.apiKey}
  helperText="Your API key from the provider"
  type="password"
/>

// Disabled state
<Input 
  label="Server ID"
  value={serverId}
  disabled
/>
```

---

### Textarea

A textarea component with label, error states, and helper text.

**Props:**
- `label` - Optional label text
- `error` - Error message to display
- `helperText` - Helper text below textarea
- `required` - Shows required asterisk

**Usage:**
```tsx
import { Textarea } from '@/components/ui';

// Basic textarea
<Textarea 
  label="Description"
  placeholder="Describe your tool..."
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>

// With validation
<Textarea 
  label="JSON Input"
  required
  error={jsonError}
  helperText="Enter valid JSON"
/>
```

---

### Badge

A small badge component for displaying metadata, status, or counts.

**Variants:**
- `default` - Neutral gray
- `primary` - Primary accent color
- `secondary` - Secondary accent color
- `success` - Green for success states
- `warning` - Yellow for warnings
- `danger` - Red for errors
- `outline` - Outlined style

**Sizes:**
- `sm` - Small (10px font)
- `md` - Medium (11px font) - default

**Usage:**
```tsx
import { Badge } from '@/components/ui';

// Status badge
<Badge variant="success">Connected</Badge>
<Badge variant="danger">Disconnected</Badge>

// Count badge
<Badge variant="primary">{toolCount} tools</Badge>

// Transport type
<Badge variant="secondary" size="sm">HTTP</Badge>
<Badge variant="secondary" size="sm">SSE</Badge>
<Badge variant="secondary" size="sm">STDIO</Badge>

// Outline style
<Badge variant="outline">v0.1.0</Badge>
```

---

## Design Philosophy

These components follow these principles:

1. **Consistent**: All components use the same design tokens (colors, spacing, borders)
2. **Accessible**: Proper HTML semantics, keyboard navigation, and ARIA attributes
3. **Flexible**: Props for customization while maintaining consistency
4. **Modern**: Clean, flat design inspired by shadcn/ui
5. **Typed**: Full TypeScript support with exported prop types

## Customization

All components use CSS custom properties from the design system:

- `--theme-accent-primary` - Primary accent color
- `--bg-tertiary` - Background colors
- `--border-color` - Border colors
- `--radius-sm` - Border radius
- `--spacing-*` - Consistent spacing scale

To change styles globally, update the CSS custom properties in `index.css` or the theme file.

## Future Components

Potential components to add:

- [ ] Select / Dropdown
- [ ] Checkbox
- [ ] Radio
- [ ] Switch / Toggle
- [ ] Dialog / Modal wrapper
- [ ] Card
- [ ] Alert
- [ ] Spinner / Loading
- [ ] Tooltip
- [ ] Tabs

