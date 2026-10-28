# Form Studio MCP

Create and edit forms, save response drafts, attach images, and generate Word/PDF documents and offline HTML forms through an MCP client.

## Online

Endpoint: https://form-studio-28oct-x1.maj01.chatgpt.site/mcp

Install/connect the private Form Studio plugin offered in this chat, or find it under Plugins → Personal → Created by you. Sites handles sign-in and access; no hard-coded API key is needed.

In the web app, **Save to library** stores a design in Design mode, or a response draft in Fill in/Export mode. **MCP library** opens files saved by you or your AI client. Tool results also include direct editor links. Each signed-in user's files are isolated.

## Local

1. Extract the local ZIP into a permanent folder.
2. Install Node.js 20 or later if needed. Node is already installed on the computer used to build this server.
3. Run `node setup-config.mjs` in that folder. It creates `client-config.json` with the right paths and does not change application settings.
4. Add that server entry to an MCP client that supports local stdio. The client launches the server automatically; do not launch it separately.

The configuration uses the common `mcpServers` JSON format. Clients with other settings formats should use the same command, arguments, and environment variable. No npm installation is needed for the bundled server.

A `data` folder is created beside the server. `FORM_STUDIO_DATA_DIR` overrides its location. `records` holds app-compatible JSON designs/drafts and metadata; `exports` holds generated files; `imports` holds files you explicitly supply to the import tools. The server has no network listener. File-import tools accept only filenames inside the imports folder.

## Tools

| Tool | Purpose |
|---|---|
| list_forms | List saved versions, with pagination. |
| get_form | Read a design or draft; image data is redacted by default. |
| create_form | Create a labeled form with typed fields. |
| edit_form | Add, edit, move, or remove fields. |
| save_draft | Save or update answers by field ID. |
| attach_image | Append an embedded PNG/JPEG to a rich field. |
| validate_draft | Check required answers, dates, and choices. |
| export_document | Generate Word or PDF. |
| export_form | Generate offline HTML or ZIP. |
| import_document | Import the app's JSON design/draft format. |
| import_file | Local only: import JSON from the imports folder. |
| attach_image_file | Local only: attach an image from the imports folder. |

Example: “Create an inspection form with inspector name, date and time, Yes/No approval, a severity dropdown, and notes with photographs. Give me the offline form.”

Workflow: create_form → save_draft → validate_draft → export_document. Every write creates a NEW artifact ID, retaining earlier versions. Use the returned ID next. Editing fields requires a design artifact. Drafts may be incomplete, but document export requires valid answers. Offline form export never includes responses.

Local and online libraries are separate. Transfer work using downloaded JSON and import_document/import_file, or the app's Open design/Open draft actions.

## Limits

- Up to 200 fields, 6 MB total answer content, 8 MB online request bodies.
- Embedded PNG/JPEG only, at most 2 MB per image and 16 megapixels. Remote image URLs are rejected.
- Basic rich text: paragraphs, bold, italic, underline, and lists. Scripts/unsafe attributes are removed.
- Dates: YYYY-MM-DD; date/time: YYYY-MM-DDTHH:mm. Server exports preserve timezone-free values.
- PDF uses Roboto; not every writing system is verified. Word/PDF pagination can differ.
- Versions and exports are retained; there is no deletion tool in this release.
- Submission does not email responses. Online library saving is explicit.

## Development

Run `npm ci`, `npm run build`, and `npm test`. `npm run mcp` runs the source stdio server for a client. Tests cover real MCP negotiation/tool calls, versions, editing, validation, image exports, file-format compatibility, authentication, and cross-user isolation. Online supports stateless MCP 2026-07-28 discovery/tools and legacy initialize/ping; local uses the official SDK with legacy compatibility.

SDK reference: https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio
