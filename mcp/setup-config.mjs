import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const config={mcpServers:{'form-studio-local':{command:process.execPath,args:[path.join(dir,'server.mjs')],env:{FORM_STUDIO_DATA_DIR:path.join(dir,'data')}}}};
await fs.writeFile(path.join(dir,'client-config.json'),JSON.stringify(config,null,2));
console.log('Created client-config.json. Add its server entry to your MCP client. No application settings were changed.');
