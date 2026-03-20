# Deployment Guide

Obscura generates a plain `dist/` folder of static files — no application server, no runtime, no database. You can host it anywhere that serves files over HTTP.

## The One Thing to Know First

Your original photos are [gitignored](./adr/ADR-011-gitignore-originals.md) to keep the repository small — a portfolio of high-resolution images would make your repository enormous. That means CI services can't build the site from your repo alone; they don't have the source images.

The simplest approach: **build locally, deploy the output.** Run `npm run build` on your machine and push only the `dist/` folder. Every option below follows this pattern.

## rsync to Your Own Server

If you have a VPS, a shared host with SSH access, or any machine you can reach over the network, rsync is hard to beat. It compares files on both sides and only transfers what's changed — which matters when your `dist/` folder is hundreds of megabytes but you've only added a few new photos.

```bash
npm run build
rsync -avz --delete dist/ you@yourserver:/var/www/portfolio/
```

The `--delete` flag removes files on the server that no longer exist locally — so if you delete a gallery or rename a post, the old files don't linger. The `-avz` flags preserve file attributes, show progress, and compress during transfer.

To redeploy after changes:

```bash
npm run build && rsync -avz --delete dist/ you@yourserver:/var/www/portfolio/
```

This is as straightforward as deployment gets: no platform accounts, no CLI tools to install, no build minutes to manage. If you can SSH into a server, you can deploy your portfolio.

## GitHub Pages

A good free option if your code already lives on GitHub.

```bash
npm run build
npx gh-pages -d dist
```

The `gh-pages` package pushes your `dist/` folder to a `gh-pages` branch. Go to your repository settings, enable Pages, set the source to the `gh-pages` branch, and your site is live at `https://YOUR-USERNAME.github.io/obscura/`.

To redeploy after changes:

```bash
npm run build && npx gh-pages -d dist
```

### GitHub Actions (Requires Photos in CI)

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

If you'd like a CDN and instant rollbacks:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

The first time, the Netlify CLI will walk you through linking your project. After that, deploys are one command. Netlify gives you HTTPS, a global CDN, and deploy previews — all on the free tier.

### Netlify CI (Requires Photos)

If your photos are available in the build environment:

1. Connect your repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`

## Cloudflare Pages

Cloudflare Pages offers fast global distribution and generous free limits:

```bash
npm run build
npx wrangler pages deploy dist
```

Same pattern — build locally, push the output. Cloudflare handles the rest.

### Cloudflare CI (Requires Photos)

If your photos are available in the build environment:

1. Connect your repository to Cloudflare Pages
2. Set the build command to `npm run build`
3. Set the output directory to `dist`

## Custom Domain

Whichever host you choose, set your `base_url` in `config/site.yaml` before building:

```yaml
base_url: https://www.your-domain.com
```

Then configure DNS with your hosting provider. Their documentation covers the specifics — it's usually a CNAME or A record.

## The Routine

Once you're set up, publishing new work follows the same rhythm:

1. Add photos to a gallery folder, write or update a blog post
2. Run `npm run sidecar` to fill in photo metadata
3. `npm run build`
4. Deploy with your one-liner of choice

Build on your machine, push the result, done.
