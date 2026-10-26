# jewel_homes

A complete static multi-page redesign using Jewel Homes' published content and imagery. The site contains 141 HTML pages, 29 residence pages, original project floor plans, amenities, specifications, locations, published availability, services, galleries, videos, calculators, company profile, client stories, contact, careers and privacy pages, plus newly authored building and furnished apartment reconstructions.

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

## Real 3D property explorer

Open `property-explorer.html` for a real WebGL viewer with complete 360-degree rotation, damped touch/mouse orbit controls, zoom, selectable levels, daylight/evening lighting, fullscreen viewing, residence selection and original floor-plan drawings. A live interactive 3D preview also appears on the homepage, and an "Explore the residences in 3D" link is visible in the hero.

Three reconstructed building studies are included: Jewel Capital, Jewel Pristine Greens and Jewel Radius. Their geometry is created locally in `dist/building3d.js`; their interface and data integration live in `dist/viewer3d.js` and `dist/spatial.css`. The original project photographs and plans remain available.

The models are architectural reconstructions based on published elevations, not original surveyed/CAD models. Unseen façades, dimensions, landscaping and level positions are illustrative. Selecting a level opens original project plan types; it does not assign a plan to that floor or claim live apartment availability. A short disclosure and a link to the original elevation appear in the viewer.

Three.js 0.180.0, OrbitControls and RoomEnvironment are vendored in `dist/vendor/three/` with their MIT license. No CDN connection or new package installation is needed for the 3D engine. Instanced geometry, capped rendering resolution, lazy homepage initialization and offscreen/hidden-tab rendering suspension keep the viewer lightweight. Reduced-motion settings disable automatic rotation.

## Furnished apartment interiors

From the building explorer, select a level, choose a project layout, and click **Enter this apartment in 3D**. The `apartment-interior.html` experience includes living and dining spaces, a kitchen, bedrooms, bathrooms, a balcony, and a utility space in the three-bedroom study. Use the room navigation or in-scene hotspots to move between spaces, drag to look around, and use WASD for constrained movement. **3D floor plan** switches to a furnished dollhouse view with orbit and zoom. The original Jewel drawing remains available alongside the selected layout.

URL parameters preserve the selected project, layout index, and illustrative building level. Layout selection reuses the same renderer to avoid repeatedly creating GPU contexts. Furniture and wall geometry is instanced, rendering resolution is capped, and offscreen/hidden previews suspend rendering.

The furnishings, room geometry, finishes, and scenic window backdrop are design studies rather than surveyed/as-built interiors or verified apartment views. The spatial configurations are based on published Jewel Capital two- and three-bedroom references; other selected project layouts use the corresponding bedroom-count study, with their original project drawing available for comparison. No apartment numbers or live unit availability are invented.

All photographic references and the scenic backdrop are from the original Jewel website. Furniture geometry and procedural material textures are authored locally in `dist/apartment3d.js`; the interface is in `dist/interior-experience.js` and the revised palette and layout are in `dist/atelier.css`. The homepage includes a live furnished 3D preview and a direct interior-tour entry point.

## Enquiry delivery

The enquiry form validates fields and creates a copyable email draft addressed to sales@jewelhomes.net. It opens the visitor's email app only when they choose that action. It does not silently submit or store leads and does not display an unsent message as delivered. Backend lead delivery requires a separately configured mail or CRM integration.

## Content and assets

All property imagery, interior photos, project plans, source videos, logos and substantive company/project content come from https://www.jewelhomes.net/. The 3D reconstruction geometry is newly authored from those visual references. Content was collected on 25 October 2026. Source URLs are retained in content.json. Some original brochure PDF paths return HTML instead of a document; those links become clear brochure requests. The original News & Events endpoint was unavailable; the redesigned news page links to the original office inauguration photographs instead.

Project categories and published availability are source information, not a live guarantee. Sales enquiries go to the original Jewel Homes contact details.

## Verification

All 141 HTML pages are checked for local link and asset references by `npm run check`. Representative desktop and mobile layouts were inspected in the browser. Navigation, directory filtering, explorer hotspots and residence switching, floor-plan image enlargement, and calculator behavior were verified. The EMI calculator was checked with a zero-interest reference case of ₹12,000 over 12 months, producing ₹1,000 monthly with zero interest.

The real 3D update was verified in the browser on desktop and a narrow mobile viewport: manual orbit changes the camera orientation, direct geometry clicks select a level and open its plan panel, the layout filter selects the matching source drawings, original plans enlarge, the three residence models switch, evening mode updates the lighting, and the homepage live 3D preview initializes when scrolled into view.

The apartment interior journey was verified from building level selection through a two-bedroom layout into the matching interior page, preserving project, layout and study-level context. Room navigation, furnished dollhouse mode, the three-bedroom study (including its additional bathrooms and utility space), and evening lighting were also checked in the browser.

