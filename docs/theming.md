# Theming Guide

## Built-in vs. Custom Themes

Obscura has two theme locations:

- **`themes/`** — built-in themes shipped with Obscura (updated by upstream)
- **`site/themes/`** — your custom themes (never touched by upstream)

When you set `theme: foo` in `site/config/site.yaml`, Obscura checks `site/themes/foo/` first, then falls back to `themes/foo/`. This means you can override a built-in theme by copying it to `site/themes/` and modifying it there — no merge conflicts on upstream updates.

## Theme Structure

Each theme lives in its own folder:

```
themes/editorial/
├── manifest.yaml        # Theme metadata
├── templates/           # Nunjucks HTML templates
│   ├── base.html        # Base layout (all pages extend this)
│   ├── homepage.html    # Homepage (/)
│   ├── gallery-index.html  # Gallery listing (/photography/)
│   ├── gallery.html     # Single gallery page
│   ├── photo.html       # Photo permalink page
│   ├── blog-index.html  # Blog listing (/blog/)
│   ├── blog-post.html   # Single blog post
│   ├── page.html        # Simple page (about, contact)
│   ├── 404.html         # Not found page
│   ├── feed.xml         # RSS feed
│   └── sitemap.xml      # Sitemap
└── assets/              # Static assets (copied to dist/assets/theme/)
    ├── css/
    │   ├── style.css    # Main stylesheet
    │   └── lightbox.css # PhotoSwipe caption styles
    └── js/
        └── lightbox.js  # PhotoSwipe integration
```

## Manifest

Every theme needs a `manifest.yaml`:

```yaml
name: editorial
description: A clean, magazine-inspired theme for photography portfolios
version: "1.0.0"
author: Obscura
```

## Customising the Editorial Theme

The editorial theme uses CSS custom properties for all colours, typography, and spacing. Override them in your own CSS or modify `style.css` directly.

### Key Custom Properties

```css
:root {
  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-base: 1rem;

  /* Colours */
  --color-bg: #faf9f7;
  --color-text: #1a1917;
  --color-text-secondary: #6b6860;
  --color-accent: #8b4513;
  --color-border: #e8e6e1;

  /* Spacing */
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;

  /* Layout */
  --content-width: 72rem;
  --content-narrow: 42rem;
}
```

### Dark Mode

The editorial theme includes automatic dark mode via `@media (prefers-color-scheme: dark)`. It overrides the colour custom properties for dark backgrounds and light text.

## Customising a Built-in Theme

The easiest way to customise is to fork a built-in theme:

```bash
cp -r themes/editorial site/themes/editorial
```

Now edit `site/themes/editorial/` freely — your copy takes priority over the built-in one. When Obscura updates the built-in theme, your copy is unaffected.

## Creating a New Theme

1. Create a folder under `site/themes/` with your theme name
2. Add a `manifest.yaml`
3. Create the required templates (see the list above)
4. Add your CSS/JS in `assets/`
5. Set `theme: your-theme-name` in `site/config/site.yaml`

### Template Variables

All templates have access to:

- `site` — the site configuration object (title, base_url, photo_display_fields, lightbox_display_fields, etc.)
- `current_year` — the current year (for copyright notices)

### Template Filters

| Filter | Description | Example |
|--------|-------------|---------|
| `dateformat` | Format a date | `{{ date \| dateformat("YYYY-MM-DD") }}` |
| `datereadable` | Human-readable date | `{{ date \| datereadable }}` → "15 June 2024" |
| `isodate` | ISO 8601 date string | `{{ date \| isodate }}` |
| `srcset` | Generate srcset from variants | `{{ photo.variants \| srcset }}` |
| `sizes` | Generate sizes attribute | `{{ photo \| sizes }}` |
| `bestvariant` | Get best variant for width | `{{ variants \| bestvariant(800) }}` |
| `responsiveimg` | Full `<img>` tag | `{{ photo \| responsiveimg("class") }}` |
| `bareslug` | Extract photo slug from namespaced slug | `{{ photo.slug \| bareslug }}` |
| `url` | Build URL with base_url | `{{ "/blog/" \| url }}` |
| `absurl` | Build absolute URL | `{{ "/blog/" \| absurl }}` |
| `truncatewords` | Truncate to N words | `{{ text \| truncatewords(50) }}` |
| `safe_html` | Mark as safe (no escaping) | `{{ html \| safe_html }}` |

### Display Fields

Templates can check `site.photo_display_fields` and `site.lightbox_display_fields` to conditionally show metadata. These are arrays of field names (`date`, `camera`, `lens`, `settings`, `location`, `tags`, `photographer`, `license`). Users can configure these additively (`[date, camera]`) or by exclusion (`[-photographer]`); by the time templates see them, exclusions have already been resolved to a plain array:

```nunjucks
{% if "date" in site.photo_display_fields %}
  {# render date #}
{% endif %}
```

The lightbox reads its field list from the `data-lightbox-fields` attribute on the gallery grid element (a comma-separated string of the same field names).

### Page-Specific Variables

Each template receives specific context variables. Refer to the editorial theme templates for examples.
