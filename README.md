# Form Studio

Visual form builder with rich text and images, Word/PDF exports, portable offline forms, and local and online MCP servers.

[Open the application](https://form-studio-28oct-x1.maj01.chatgpt.site/) · [MCP setup and tools](mcp/README.md)

## Run from source

Requires Node.js 20 or later.

```sh
npm ci
npm run build
npm test
npm start
```

Open http://127.0.0.1:4173. The generated `dist/index.html` is also a self-contained offline app. Build output and dependencies are intentionally excluded from Git.

## MCP servers

- Local: configure an MCP client to launch `node mcp/local.mjs` after building. The distributable bundle is `local-mcp/server.mjs`.
- Online: the existing deployed endpoint is https://form-studio-28oct-x1.maj01.chatgpt.site/mcp. Connect through the Form Studio plugin; opening this authenticated endpoint as a webpage may show Unauthorized.
- Online and local libraries are separate. Designs and drafts transfer as JSON files.
- The tracked hosting manifest identifies this existing Site. A new deployment needs its own hosting configuration and an R2 binding named BUCKET.

## Package downloads

```sh
node package-output.cjs
node mcp/package.mjs
```

Deliverables are written to `outputs/`, including the offline app and local MCP ZIP. Run `setup-config.mjs` inside the extracted MCP folder to generate client settings for its new location.

## Using the form builder

A browser-based form designer with rich text, pasted/uploaded images, Word and PDF exports, and portable offline forms. Built with JavaScript, HTML, and Bootstrap.

## Start here

Open `Form-Studio.html` in Chrome, Edge, or Firefox. No installation, account, server, or internet connection is required for the downloaded app.

1. **Design:** start with the example or click New form. Add fields from the left panel. Each input automatically gets a label. Click a field to edit its label, help text, placeholder, required setting, or dropdown options. Use the arrows to reorder fields, the copy icon to duplicate, and × to delete.
2. **Save design:** downloads a `.form.json` file. Use Open design to continue editing it later.
3. **Fill in:** enter answers. In Text + images fields, use bold, italic, underline, lists, image upload, or paste a copied image. Click an image and select × Image to remove it.
4. **Save draft:** downloads a `.draft.json` containing the design, answers, and embedded images. Open draft restores it. Save before closing the tab; responses are not automatically saved.
5. **Export:** complete required fields, review the responses, then download a real `.docx` or `.pdf` document.
6. **Download form:** creates a ZIP for someone else. They extract it and open `index.html`, fill it in, and export documents. The recipient version does not show designer controls.

`Example-form.html` is a ready-to-fill example. It is separate from your saved designs.

## Publishing

Upload the generated form's `index.html` to any static web host. All styles, fonts, scripts, and export libraries are embedded in the HTML file. The builder itself can also be hosted as an HTML page.

Submit means validate and review for document export. The offline version keeps responses in the browser. On the hosted app, Save to library explicitly stores a private online copy for MCP access. Neither version emails responses. Downloads contain the entered information, so share them intentionally. A downloaded form is editable HTML, not a tamper-proof assessment system.

## Practical limits

- Images: PNG, JPEG, WebP, and GIF input (GIF becomes a still image). Images are converted to PNG and scaled to at most 1600 pixels along either edge. Maximum upload size is 8 MB per image.
- Web-linked images pasted as HTML are omitted. Copy the actual image or upload the image file to embed it.
- Basic rich text is supported: bold, italic, underline, paragraphs, and lists. Complex pasted tables, layouts, fonts, and links are simplified.
- Word and PDF contain the same responses, but pagination may differ. The bundled PDF font is Roboto; full support for every writing system has not been verified.
- Standalone draft import requires the same form version. The builder can open drafts to recover their original designs.
- Imports allow up to 200 fields and 60 MB per JSON file. Very large image-heavy forms may be slow on low-memory devices.
- The browser chooses where downloads are saved, and may ask before allowing multiple downloads.
- This first version has been tested in the Chromium-based in-app browser, plus automated tests. Separate Chrome, Edge, Firefox, and mobile device testing is still advisable before wider distribution.

## Development

Install Node.js, run `npm ci`, then `npm run build`. `npm start` serves the app at `http://127.0.0.1:4173`. `npm test` checks the main editing workflow, required validation, draft restoration, sanitization, standalone packaging, and image-containing Word/PDF generation. The generated app is `dist/index.html`.

Dependencies are pinned in `package-lock.json`. Third-party license notices are distributed with the offline package. The offline application has no analytics or runtime network calls. The hosted MCP library uses authenticated requests and private server storage.
