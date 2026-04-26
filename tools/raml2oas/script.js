/**
 * RAML 1.0 → OpenAPI 3.0 Converter
 * 100% client-side. No data leaves your browser.
 */

let outputFormat = 'yaml';

function setOutputFormat(fmt) {
    outputFormat = fmt;
    document.getElementById('btn-yaml').classList.toggle('active', fmt === 'yaml');
    document.getElementById('btn-json').classList.toggle('active', fmt === 'json');
    // Re-run if there's already output
    const out = document.getElementById('oas-output').value;
    if (out) convertRaml();
}

// ── Simple RAML Parser ──────────────────────────────────────────────────────
function parseYamlLike(text) {
    const lines = text.split('\n');
    const root = {};
    const stack = [{ indent: -1, obj: root }];

    function getParent(indent) {
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
        return stack[stack.length - 1].obj;
    }

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
        const indent = raw.search(/\S/);
        const line = raw.trim();

        // Skip RAML header
        if (line.startsWith('#%RAML')) continue;

        // List item
        if (line.startsWith('- ')) {
            const parent = getParent(indent);
            const val = line.slice(2).trim();
            const lastKey = Object.keys(parent).pop();
            if (lastKey && !Array.isArray(parent[lastKey])) parent[lastKey] = [];
            if (lastKey) parent[lastKey].push(val);
            continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();

        const parent = getParent(indent);

        if (val === '' || val === '|' || val === '>') {
            parent[key] = {};
            stack.push({ indent, obj: parent[key] });
        } else {
            // Try to coerce types
            if (val === 'true') parent[key] = true;
            else if (val === 'false') parent[key] = false;
            else if (!isNaN(val) && val !== '') parent[key] = Number(val);
            else parent[key] = val.replace(/^['"]|['"]$/g, '');
            stack.push({ indent, obj: parent });
        }
    }

    return root;
}

// ── Type Mapper ─────────────────────────────────────────────────────────────
function ramlTypeToOasSchema(ramlType) {
    if (!ramlType) return { type: 'object' };

    const t = String(ramlType).trim();

    // Array shorthand: Type[]
    if (t.endsWith('[]')) {
        const itemType = t.slice(0, -2);
        return { type: 'array', items: ramlTypeToOasSchema(itemType) };
    }

    const map = {
        string: { type: 'string' },
        integer: { type: 'integer' },
        number: { type: 'number' },
        boolean: { type: 'boolean' },
        object: { type: 'object' },
        any: {},
        nil: { nullable: true },
        date: { type: 'string', format: 'date' },
        datetime: { type: 'string', format: 'date-time' },
        'date-only': { type: 'string', format: 'date' },
        'time-only': { type: 'string', format: 'time' },
        file: { type: 'string', format: 'binary' },
    };

    if (map[t.toLowerCase()]) return map[t.toLowerCase()];

    // Custom type ref
    return { '$ref': `#/components/schemas/${t}` };
}

// ── Converter ───────────────────────────────────────────────────────────────
function convertRamlToOas(ramlText) {
    const warnings = [];
    const stats = { paths: 0, operations: 0, schemas: 0 };

    // Strip RAML header line for parsing
    const cleanText = ramlText.replace(/^#%RAML.*\n/, '');
    const raml = parseYamlLike(cleanText);

    const oas = {
        openapi: '3.0.0',
        info: {
            title: raml.title || 'API',
            version: raml.version || '1.0.0',
            description: raml.description || ''
        },
        servers: [],
        paths: {},
        components: { schemas: {} }
    };

    // Servers from baseUri
    if (raml.baseUri) {
        let uri = raml.baseUri.replace('{version}', raml.version || 'v1');
        oas.servers.push({ url: uri });
    }

    // Types → Schemas
    if (raml.types && typeof raml.types === 'object') {
        for (const [typeName, typeDef] of Object.entries(raml.types)) {
            stats.schemas++;
            const schema = { type: 'object', properties: {} };

            if (typeof typeDef === 'string') {
                oas.components.schemas[typeName] = ramlTypeToOasSchema(typeDef);
                continue;
            }

            if (typeDef.type && typeDef.type !== 'object') {
                const base = ramlTypeToOasSchema(typeDef.type);
                Object.assign(schema, base);
            }

            if (typeDef.properties && typeof typeDef.properties === 'object') {
                schema.required = [];
                for (const [propName, propDef] of Object.entries(typeDef.properties)) {
                    const cleanProp = propName.replace('?', '');
                    const required = !propName.endsWith('?');
                    if (required) schema.required.push(cleanProp);

                    if (typeof propDef === 'string') {
                        schema.properties[cleanProp] = ramlTypeToOasSchema(propDef);
                    } else if (typeof propDef === 'object') {
                        const propSchema = ramlTypeToOasSchema(propDef.type);
                        if (propDef.description) propSchema.description = propDef.description;
                        if (propDef.example !== undefined) propSchema.example = propDef.example;
                        if (propDef.minLength) propSchema.minLength = propDef.minLength;
                        if (propDef.maxLength) propSchema.maxLength = propDef.maxLength;
                        if (propDef.minimum !== undefined) propSchema.minimum = propDef.minimum;
                        if (propDef.maximum !== undefined) propSchema.maximum = propDef.maximum;
                        if (propDef['enum']) propSchema.enum = propDef['enum'];
                        schema.properties[cleanProp] = propSchema;
                    }
                }
                if (schema.required.length === 0) delete schema.required;
            }

            oas.components.schemas[typeName] = schema;
        }
    }

    // Security Schemes
    if (raml.securitySchemes && typeof raml.securitySchemes === 'object') {
        oas.components.securitySchemes = {};
        for (const [name, def] of Object.entries(raml.securitySchemes)) {
            if (def.type === 'OAuth 2.0') {
                oas.components.securitySchemes[name] = { type: 'oauth2', flows: {} };
            } else if (def.type === 'Basic Authentication') {
                oas.components.securitySchemes[name] = { type: 'http', scheme: 'basic' };
            } else if (def.type === 'Pass Through') {
                oas.components.securitySchemes[name] = { type: 'apiKey', in: 'header', name: 'Authorization' };
            } else {
                oas.components.securitySchemes[name] = { type: 'http', scheme: 'bearer' };
            }
        }
    }

    // Traits warning
    if (raml.traits) warnings.push('RAML Traits are not directly converted. Apply trait logic manually to each operation.');
    if (raml.resourceTypes) warnings.push('RAML Resource Types are not converted. Inline the resource type logic into each resource.');

    // Resources → Paths
    function processResource(resourcePath, resourceDef, parentPath = '') {
        if (!resourceDef || typeof resourceDef !== 'object') return;

        const fullPath = parentPath + resourcePath;
        const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
        const hasMethod = HTTP_METHODS.some(m => resourceDef[m]);

        if (hasMethod) {
            stats.paths++;
            oas.paths[fullPath] = oas.paths[fullPath] || {};

            // URI parameters
            const uriParams = [];
            const paramMatches = fullPath.match(/\{([^}]+)\}/g) || [];
            paramMatches.forEach(match => {
                const name = match.slice(1, -1);
                uriParams.push({
                    name,
                    in: 'path',
                    required: true,
                    schema: { type: 'string' }
                });
            });

            for (const method of HTTP_METHODS) {
                if (!resourceDef[method]) continue;
                stats.operations++;
                const methodDef = resourceDef[method];
                const operation = {};

                if (methodDef.description) operation.description = methodDef.description;
                if (methodDef.displayName) operation.summary = methodDef.displayName;

                // operationId from path + method
                operation.operationId = method + fullPath.replace(/\//g, '_').replace(/[{}]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');

                // Tags from top-level resource
                const tag = fullPath.split('/').filter(Boolean)[0];
                if (tag) operation.tags = [tag.replace(/[{}]/g, '')];

                // Parameters: URI + query + headers
                operation.parameters = [...uriParams];

                if (methodDef.queryParameters && typeof methodDef.queryParameters === 'object') {
                    for (const [pName, pDef] of Object.entries(methodDef.queryParameters)) {
                        const param = {
                            name: pName,
                            in: 'query',
                            required: pDef.required === true,
                            schema: ramlTypeToOasSchema(pDef.type || 'string')
                        };
                        if (pDef.description) param.description = pDef.description;
                        if (pDef.default !== undefined) param.schema.default = pDef.default;
                        if (pDef.example !== undefined) param.schema.example = pDef.example;
                        operation.parameters.push(param);
                    }
                }

                if (methodDef.headers && typeof methodDef.headers === 'object') {
                    for (const [hName, hDef] of Object.entries(methodDef.headers)) {
                        const param = {
                            name: hName,
                            in: 'header',
                            required: hDef.required === true,
                            schema: ramlTypeToOasSchema(hDef.type || 'string')
                        };
                        if (hDef.description) param.description = param.description;
                        operation.parameters.push(param);
                    }
                }

                if (operation.parameters.length === 0) delete operation.parameters;

                // Request body
                if (methodDef.body && typeof methodDef.body === 'object') {
                    operation.requestBody = { required: true, content: {} };
                    for (const [mimeType, bodyDef] of Object.entries(methodDef.body)) {
                        if (!bodyDef) continue;
                        const mediaObj = {};
                        if (bodyDef.type) mediaObj.schema = ramlTypeToOasSchema(bodyDef.type);
                        if (bodyDef.example) mediaObj.example = bodyDef.example;
                        operation.requestBody.content[mimeType] = mediaObj;
                    }
                }

                // Responses
                operation.responses = {};
                if (methodDef.responses && typeof methodDef.responses === 'object') {
                    for (const [code, resDef] of Object.entries(methodDef.responses)) {
                        const response = { description: (resDef && resDef.description) || `HTTP ${code}` };
                        if (resDef && resDef.body && typeof resDef.body === 'object') {
                            response.content = {};
                            for (const [mimeType, bodyDef] of Object.entries(resDef.body)) {
                                if (!bodyDef) continue;
                                const mediaObj = {};
                                if (bodyDef.type) mediaObj.schema = ramlTypeToOasSchema(bodyDef.type);
                                if (bodyDef.example) mediaObj.example = bodyDef.example;
                                response.content[mimeType] = mediaObj;
                            }
                        }
                        operation.responses[String(code)] = response;
                    }
                } else {
                    operation.responses['200'] = { description: 'Success' };
                }

                oas.paths[fullPath][method] = operation;
            }
        }

        // Recurse into nested resources
        for (const [key, val] of Object.entries(resourceDef)) {
            if (key.startsWith('/') && typeof val === 'object') {
                processResource(key, val, fullPath);
            }
        }
    }

    for (const [key, val] of Object.entries(raml)) {
        if (key.startsWith('/') && typeof val === 'object') {
            processResource(key, val);
        }
    }

    // Clean empty components
    if (Object.keys(oas.components.schemas).length === 0) delete oas.components.schemas;
    if (Object.keys(oas.components).length === 0) delete oas.components;

    return { oas, warnings, stats };
}

// ── YAML Serializer (simple, no external lib) ────────────────────────────────
function toYaml(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    let out = '';

    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]\n';
        for (const item of obj) {
            if (typeof item === 'object' && item !== null) {
                out += `${pad}-\n${toYaml(item, indent + 1)}`;
            } else {
                out += `${pad}- ${yamlScalar(item)}\n`;
            }
        }
        return out;
    }

    if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj)) {
            if (v === undefined || v === null) continue;
            if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
            if (Array.isArray(v)) {
                if (v.length === 0) continue;
                out += `${pad}${k}:\n${toYaml(v, indent + 1)}`;
            } else if (typeof v === 'object' && v !== null) {
                out += `${pad}${k}:\n${toYaml(v, indent + 1)}`;
            } else {
                out += `${pad}${k}: ${yamlScalar(v)}\n`;
            }
        }
        return out;
    }

    return `${pad}${yamlScalar(obj)}\n`;
}

function yamlScalar(val) {
    if (typeof val === 'boolean' || typeof val === 'number') return String(val);
    const s = String(val);
    // Quote if contains special chars or looks like a number/bool
    if (/[:#\[\]{}&*!|>'"%@`,]/.test(s) || s === '' || /^\s|\s$/.test(s) ||
        ['true','false','null','yes','no'].includes(s.toLowerCase()) ||
        (!isNaN(s) && s !== '')) {
        return `"${s.replace(/"/g, '\\"')}"`;
    }
    return s;
}

// ── Main Conversion Entry ────────────────────────────────────────────────────
function convertRaml() {
    const input = document.getElementById('raml-input').value.trim();
    const statusEl = document.getElementById('convert-status');
    const summaryEl = document.getElementById('conversion-summary');
    const warningsEl = document.getElementById('warnings-panel');

    if (!input) {
        statusEl.className = 'convert-status error';
        statusEl.innerHTML = '<i class="fas fa-circle-exclamation"></i> Please paste a RAML 1.0 spec first.';
        return;
    }

    try {
        const { oas, warnings, stats } = convertRamlToOas(input);

        let output;
        if (outputFormat === 'json') {
            output = JSON.stringify(oas, null, 2);
        } else {
            output = toYaml(oas);
        }

        document.getElementById('oas-output').value = output;

        // Status
        statusEl.className = 'convert-status success';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Converted successfully';

        // Summary
        summaryEl.style.display = 'block';
        document.getElementById('summary-stats').innerHTML = `
            <div class="stat-chip"><strong>${stats.paths}</strong> paths</div>
            <div class="stat-chip"><strong>${stats.operations}</strong> operations</div>
            <div class="stat-chip"><strong>${stats.schemas}</strong> schemas</div>
        `;

        // Warnings
        if (warnings.length > 0) {
            warningsEl.style.display = 'block';
            document.getElementById('warnings-list').innerHTML =
                warnings.map(w => `<div class="warning-item">${w}</div>`).join('');
        } else {
            warningsEl.style.display = 'none';
        }

    } catch (e) {
        statusEl.className = 'convert-status error';
        statusEl.innerHTML = `<i class="fas fa-circle-exclamation"></i> Error: ${e.message}`;
        summaryEl.style.display = 'none';
    }
}

function copyOutput() {
    const val = document.getElementById('oas-output').value;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
        const btn = document.getElementById('copy-oas-btn');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
    });
}

function downloadOutput() {
    const val = document.getElementById('oas-output').value;
    if (!val) return;
    const ext = outputFormat === 'json' ? 'json' : 'yaml';
    const blob = new Blob([val], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `openapi.${ext}`;
    a.click();
}

function clearAll() {
    document.getElementById('raml-input').value = '';
    document.getElementById('oas-output').value = '';
    document.getElementById('conversion-summary').style.display = 'none';
    document.getElementById('warnings-panel').style.display = 'none';
    const statusEl = document.getElementById('convert-status');
    statusEl.className = 'convert-status idle';
    statusEl.innerHTML = '<i class="fas fa-circle-dot"></i> Paste RAML to begin';
}

function loadExample() {
    document.getElementById('raml-input').value = `#%RAML 1.0
title: Orders API
version: v1
baseUri: https://api.example.com/{version}

types:
  Order:
    type: object
    properties:
      id:
        type: string
        description: Unique order identifier
      customerId:
        type: string
      amount:
        type: number
      status:
        type: string
        enum: [pending, confirmed, shipped, delivered]
      createdAt:
        type: datetime

/orders:
  get:
    description: Retrieve a list of orders
    queryParameters:
      page:
        type: integer
        default: 1
        description: Page number
      pageSize:
        type: integer
        default: 20
      status:
        type: string
        required: false
    responses:
      200:
        body:
          application/json:
            type: Order[]
  post:
    description: Create a new order
    body:
      application/json:
        type: Order
    responses:
      201:
        body:
          application/json:
            type: Order
      400:
        description: Invalid request payload

  /{orderId}:
    get:
      description: Get a specific order by ID
      responses:
        200:
          body:
            application/json:
              type: Order
        404:
          description: Order not found
    delete:
      description: Cancel an order
      responses:
        204:
          description: Order cancelled`;
}

// Auto-convert on input change (debounced)
let debounceTimer;
document.getElementById('raml-input').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (document.getElementById('raml-input').value.trim()) convertRaml();
    }, 800);
});
