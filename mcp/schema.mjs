import { z } from 'zod';

export const fieldTypes=['text','textarea','rich','yesno','select','date','datetime','heading','submit'];
export const fieldId=z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,100}$/).refine(v=>!['__proto__','constructor','prototype'].includes(v),'Reserved field ID');
export const artifactId=z.string().uuid();
const properties={type:z.enum(fieldTypes),label:z.string().min(1).max(300),required:z.boolean().optional(),placeholder:z.string().max(500).optional(),help:z.string().max(1000).optional(),options:z.array(z.string().min(1).max(300)).max(200).optional()};
export const fieldInput=z.strictObject({id:fieldId.optional(),...properties});
export const fieldPatch=z.strictObject({label:properties.label.optional(),required:properties.required,placeholder:properties.placeholder,help:properties.help,options:properties.options});
export const formSchema=z.strictObject({id:fieldId,title:z.string().min(1).max(300),description:z.string().max(3000).optional(),fields:z.array(fieldInput.extend({id:fieldId})).max(200)});
const answers=z.record(fieldId,z.string().max(6*1024*1024));
export const portableDocument=z.discriminatedUnion('format',[
  z.strictObject({format:z.literal('form-studio-design'),version:z.literal(1),schema:formSchema}),
  z.strictObject({format:z.literal('form-studio-draft'),version:z.literal(1),schema:formSchema,answers})
]);
export const definitions=[
 {name:'list_forms',description:'List saved form designs and response drafts in this server. Each edit creates a new immutable artifact. Local and online libraries are separate; exchange files with import_document. Supports pagination.',readOnly:true,schema:z.strictObject({kind:z.enum(['design','draft','all']).default('all'),cursor:z.string().max(2000).optional(),limit:z.number().int().min(1).max(100).default(30)})},
 {name:'get_form',description:'Read a saved design or response draft by artifact_id. Embedded images are redacted by default to keep responses small. Set include_images only when the actual data is needed.',readOnly:true,schema:z.strictObject({artifact_id:artifactId,include_images:z.boolean().default(false)})},
 {name:'create_form',description:'Create a form design with automatically generated field IDs and editable labels. Supports text, textarea, rich text/images, Yes/No, select, date, datetime, heading, and submit. Returns an artifact_id plus a browser link or local JSON path.',schema:z.strictObject({title:z.string().min(1).max(300),description:z.string().max(3000).default(''),fields:z.array(fieldInput).max(200).default([])})},
 {name:'edit_form',description:'Edit a saved design by applying operations in order. Creates a new version and returns a NEW artifact_id; the input version remains unchanged. Positions are zero-based. Use field IDs from get_form. Editing drafts is not allowed; import a design first.',schema:z.strictObject({artifact_id:artifactId,title:z.string().min(1).max(300).optional(),description:z.string().max(3000).optional(),operations:z.array(z.discriminatedUnion('op',[
  z.strictObject({op:z.literal('add'),field:fieldInput,position:z.number().int().min(0).optional()}),
  z.strictObject({op:z.literal('update'),field_id:fieldId,changes:fieldPatch}),
  z.strictObject({op:z.literal('remove'),field_id:fieldId}),
  z.strictObject({op:z.literal('move'),field_id:fieldId,position:z.number().int().min(0)})
 ])).max(200).default([])})},
 {name:'save_draft',description:'Create a response draft from a design or update an existing draft. Answers are keyed by field ID and merge with existing answers. Use empty strings to clear values. Rich answers accept basic HTML with embedded PNG/JPEG data URLs. Missing required values may be saved but block document export. Returns a NEW artifact_id.',schema:z.strictObject({artifact_id:artifactId,answers})},
 {name:'attach_image',description:'Append an embedded PNG or JPEG image to a rich-text field in a draft. Input is a data:image/png;base64,... or data:image/jpeg;base64,... URL, up to 2 MB decoded. Returns a NEW draft artifact_id. No remote image URLs are fetched.',schema:z.strictObject({artifact_id:artifactId,field_id:fieldId,image_data_url:z.string().max(3*1024*1024),alt:z.string().max(300).default('Attached image')})},
 {name:'validate_draft',description:'Check required fields, dropdown choices, dates, and embedded images without changing the saved draft.',readOnly:true,schema:z.strictObject({artifact_id:artifactId})},
 {name:'export_document',description:'Generate a real Word (.docx) or PDF document from a saved response draft, including formatted text and embedded images. Required fields must be complete. Returns a protected download link online or a file path locally.',schema:z.strictObject({artifact_id:artifactId,format:z.enum(['docx','pdf'])})},
 {name:'export_form',description:'Export the form design as a standalone HTML form or ZIP package that opens offline and can generate Word/PDF documents. Response values are NOT included, even when the input is a draft.',schema:z.strictObject({artifact_id:artifactId,format:z.enum(['html','zip']).default('zip')})},
 {name:'import_document',description:'Import an existing Form Studio design or draft JSON object. Use the exact format/version/schema/answers envelope downloaded by the app. Returns a new artifact ID. Both local and online servers understand the same files.',schema:z.strictObject({document:portableDocument})}
];
export const toolList=()=>definitions.map(({schema,readOnly,name,description})=>({name,description,inputSchema:z.toJSONSchema(schema,{target:'draft-7',io:'input'}),annotations:{readOnlyHint:!!readOnly,destructiveHint:false,idempotentHint:!!readOnly,openWorldHint:false}}));
