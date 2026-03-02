# Deployment Guide

Obscura generates a static site in `dist/`. You can host it anywhere that serves static files.

## Important: Photos Are Not in Git

Original photo files are [gitignored](../docs/adr/ADR-011-gitignore-originals.md) to keep the repository small. This means **CI/CD services cannot build your site** from the repository alone — they won't have the source images.

You have two options:

1. **Build locally, deploy the output** (recommended) — run `npm run build` on your machine and push only the `dist/` folder to your hosting provider. Simple, no extra infrastructure needed.
2. **Store photos externally for CI** — use Git LFS, or sync photos into the CI environment from cloud storage (S3, Google Drive, etc.) before building. More complex, but enables fully automated deploys.

Most photographers will prefer option 1. The guides below cover both approaches where applicable.

## GitHub Pages

### Option A: Build Locally, Deploy to gh-pages (Recommended)

This is the simplest approach. You build on your machine and push the result.

1. Build the site:

```bash
npm run build
```

2. Deploy `dist/` to the `gh-pages` branch:

```bash
npx gh-pages -d dist
```

3. In your GitHub repository settings, go to **Pages** and set the source to the `gh-pages` branch.

Your site will be available at `https://YOUR-USERNAME.github.io/obscura/` (or your custom domain).

**To redeploy after changes:**

```bash
npm run build && npx gh-pages -d dist
```

### Option B: GitHub Actions (Requires Photos in CI)

If you want fully automated deploys on every push, the CI runner needs access to your photos. This requires extra setup (e.g., Git LFS, or a sync step from cloud storage).

If you have that set up, create `.github/workflows/deploy.yml`:

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
        with:
          lfs: true  # if using Git LFS for photos

      # Add your photo sync step here if not using LFS:
      # - name: Sync photos from cloud storage
      #   run: aws s3 sync s3://my-photos content/photos/

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

### Build Locally (Recommended)

Use the [Netlify CLI](https://docs.netlify.com/cli/get-started/) to deploy a local build:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Netlify CI (Requires Photos)

If your photos are available in the build environment:

1. Connect your repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`

## Cloudflare Pages

### Build Locally (Recommended)

Use [Wrangler](https://developers.cloudflare.com/workers/wrangler/) to deploy a local build:

```bash
npm run build
npx wrangler pages deploy dist
```

### Cloudflare CI (Requires Photos)

If your photos are available in the build environment:

1. Connect your repository to Cloudflare Pages
2. Set the build command to `npm run build`
3. Set the output directory to `dist`

## Any Static Host

Build locally and upload the contents of `dist/` to your hosting provider:

```bash
npm run build
# Upload dist/ contents via FTP, rsync, S3, etc.
```

## Custom Domain

Set `base_url` in `config/site.yaml` to your domain before building:

```yaml
base_url: https://www.your-domain.com
```

Then configure your DNS and hosting provider to point to the deployed site. Refer to your hosting provider's documentation for specifics.
