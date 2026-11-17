# a6700 Field Manual

A single-page beginner's guide to photography, written for a Sony a6700 with the
Sigma 18–50mm f/2.8 and Sony E 18–135mm f/3.5–5.6.

- **00 Camera** (`camera.html`) — an interactive 3D a6700: pick a task and the camera turns to show which button or dial to use.
  The model works: press its buttons, drag its dials, and the rear screen and exposure respond, so each step can be tried on the spot
- **01 Exposure** — aperture, shutter speed and ISO, with a live simulator
- **02 Lenses** — what each lens is for, with a focal-length visualiser
- **03 Snow** — why snow comes out grey, six starting recipes, cold-weather care
- **04 Setup** — twelve menu settings (progress is saved in the browser) and four practice drills
- **05 Words** — a searchable glossary of camera jargon
- **06 Pocket card** — quick tips and a troubleshooting table for use in the field

## Run it

It is plain HTML, CSS and JavaScript with no build step. The 3D chapter uses three.js, vendored in `vendor/`.
Serve the folder (the 3D chapter uses JavaScript modules, which browsers will not load from a `file://` path):

```
python3 -m http.server 4173
```

To put it online, enable GitHub Pages for this repository (Settings → Pages → deploy from branch, root folder).

## Credits

Fonts are self-hosted in `fonts/`: Archivo and Newsreader, both under the SIL Open Font License 1.1.
three.js (MIT) is vendored in `vendor/`.

Control names and default functions in the 3D chapter follow Sony's ILCE-6700 Help Guide. The model is a hand-built
diagram of where the controls are, not a scan of the product, so proportions and small details are approximate.
The rear-screen displays and the exposure behaviour are simplified teaching versions, not copies of Sony's menus or metering.
