# Deployment Guide

Obscura generates a static site in `dist/`. You can host it anywhere that serves static files.

## GitHub Pages

### Manual Deployment

1. Build the site:

```bash
npm run build
```

2. Push the `dist/` contents to a `gh-pages` branch:

```bash
# From the project root
npx gh-pages -d dist
```

Or manually:

```bash
git subtree push --prefix dist origin gh-pages
```

3. In your GitHub repository settings, set Pages source to the `gh-pages` branch.

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - uses: actions/deploy-pages@v4
```

Enable GitHub Pages in your repository settings and set the source to "GitHub Actions".

## Netlify

1. Connect your repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`

## Cloudflare Pages

1. Connect your repository to Cloudflare Pages
2. Set the build command to `npm run build`
3. Set the output directory to `dist`

## Any Static Host

Build locally and upload the contents of `dist/` to your hosting provider. The site is fully static with no server-side requirements.

```bash
npm run build
# Upload dist/ contents via FTP, rsync, S3, etc.
```
