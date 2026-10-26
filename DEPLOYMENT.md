# Deploy Jewel Homes on Vercel

The website is ready to deploy from the repository root. No API keys, database, Python runtime, dependency installation or required environment variables are needed.

## Import from GitHub

1. Open https://vercel.com/new and import `Junaid3771/jewel_homes`.
2. Keep **Root Directory** as the repository root (`./`) and the production branch as **main**.
3. Click **Deploy**. The checked-in `vercel.json` supplies the settings below.

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | Skipped (empty) |

The build validates the committed pages and assets. It does not need to regenerate the site with Python. Only `dist/` is published. All individual `.html` routes remain supported, and `dist/404.html` supplies the missing-page design. This is a multi-page site: do not add a catch-all rewrite to `index.html` or enable trailing slashes.

Vercel deploys subsequent pushes to `main` through its Git integration once the repository is connected.

## One-click deployment

Alternatively, use the **Deploy with Vercel** button in README.md. This flow creates a copy of the repository; importing the existing repository above is the preferred option if you want future pushes to this same repository to deploy automatically.

## Domains and metadata

At build time, the script uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` (or `VERCEL_URL` fallback) to update canonical URLs, social image URLs, `sitemap.xml` and `robots.txt` for the deployment. No domain setup is needed for the generated `vercel.app` URL.

After attaching a custom domain in Vercel, redeploy to refresh the generated URLs. Optionally set **SITE_URL** to your preferred complete origin, for example `https://www.your-domain.com`, and redeploy. This is optional and contains no secret. Do not point it at the original Jewel Homes domain unless you control that domain and have connected it to this deployment.

## Optional CLI deployment

With Node.js and Vercel CLI available:

```sh
npm run check
npx vercel
```

For an authorized production release, use `npx vercel --prod`.

## Editing and rebuilding

The prebuilt website lives in `dist/`. Edit `dist/site.css` and `dist/site.js` directly for visual and interaction changes. To regenerate content pages, install `beautifulsoup4`, run `python build_site.py`, and commit the regenerated `dist/` along with the source changes. The Vercel build will apply the deployment's domain metadata afterward.

## Existing feature scope

The enquiry form prepares an email draft; it is not connected to a mail or CRM backend. The property explorer now renders real, rotatable WebGL reconstructions of Jewel Capital, Jewel Pristine Greens and Jewel Radius, with selectable levels, lighting controls and original project plans. These models are illustrative reconstructions from published elevations, not surveyed/CAD models. The viewer's JavaScript engine and license are included locally under `dist/vendor/three/`, so Vercel serves it with the rest of the site without a CDN dependency or build installation.

References: https://vercel.com/docs/project-configuration/vercel-json and https://vercel.com/docs/environment-variables/system-environment-variables.
