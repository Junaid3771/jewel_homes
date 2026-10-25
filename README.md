# jewel_homes

A complete static multi-page redesign using Jewel Homes' published content and imagery exclusively. The site contains 140 HTML pages, 29 residence pages, original project floor plans, amenities, specifications, locations, published availability, services, galleries, videos, calculators, company profile, client stories, contact, careers and privacy pages.

## Deploy to Vercel

Import **Junaid3771/jewel_homes** at [vercel.com/new](https://vercel.com/new), keep the repository root and `main` branch, and click **Deploy**. `vercel.json` sets the framework to **Other**, runs the dependency-free preparation step, and publishes `dist/`. No environment variables are required.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJunaid3771%2Fjewel_homes)

The button creates a repository copy. Import the existing repository instead to keep automatic deployments connected to this same `main` branch. See [DEPLOYMENT.md](DEPLOYMENT.md) for settings, custom domains and optional CLI instructions.

## Run

From this directory:

```sh
python -m http.server 8765 --directory dist
```

Open http://127.0.0.1:8765. A static HTTP host is required for the JSON-powered explorer and hero carousel. Opening index.html directly with file:// is not supported.

## Rebuild

The generated pages are in `dist/`. Original extracted and structured content is in `content.json`; the generator is `build_site.py`.

```sh
python -m pip install beautifulsoup4
python build_site.py
```

Styling and interactions are maintained in `dist/site.css` and `dist/site.js`. Generation preserves those files and the `dist/media/` asset collection.

## Property explorer

The property explorer presents original Jewel architectural elevations with zoom, pan, image enlargement, residence selection and clickable hotspots opening the actual project plans and details. These hotspots identify information categories; they are not mapped apartment boundaries or a live apartment inventory.

The source website does not publish a 3D building model, a full set of orbit frames, or a panoramic 360-degree tour. The current viewer therefore does not claim 360-degree rotation. A faithful 360-degree viewer requires the original authorized building model or a full rendered image sequence.

## Enquiries

The enquiry form validates fields and creates a copyable email draft addressed to sales@jewelhomes.net. It opens the visitor's email app only when they choose that action. It does not silently submit or store leads and does not display an unsent message as delivered. Backend lead delivery requires a separately configured mail or CRM integration.

## Content and assets

All property imagery, interior photos, project plans, source videos, logos and substantive company/project content come from https://www.jewelhomes.net/. Content was collected on 25 October 2026. Source URLs are retained in content.json. Some original brochure PDF paths return HTML instead of a document; those links become clear brochure requests. The original News & Events endpoint was unavailable; the redesigned news page links to the original office inauguration photographs instead.

Project categories and published availability are source information, not a live guarantee. Sales enquiries go to the original Jewel Homes contact details.

## Verification

All 140 HTML pages were checked for local link and asset references. Representative desktop and mobile layouts were inspected in the browser. Navigation, directory filtering, explorer hotspots and residence switching, floor-plan image enlargement, and calculator behavior were verified. The EMI calculator was checked with a zero-interest reference case of ₹12,000 over 12 months, producing ₹1,000 monthly with zero interest.

