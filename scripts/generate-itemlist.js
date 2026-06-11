
//The script will automatically scan all the folders in /tools/, 
// read the names and URLs of every tool, and automatically 
// update the ItemList schema block across all of your HTML files at once.

//node scripts/generate-itemlist.js


const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const toolsDir = path.join(rootDir, 'tools');

function cleanHtmlText(text) {
  // Strip HTML tags and normalize spacing/newlines
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getToolData(dirName) {
  const filePath = path.join(toolsDir, dirName, 'index.html');
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract H1
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = h1Match ? cleanHtmlText(h1Match[1]) : dirName;

  // Extract Canonical URL
  const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i)
    || content.match(/href=["'](.*?)["']\s+rel=["']canonical["']/i);
  const url = canonicalMatch ? canonicalMatch[1].trim() : `https://upendra-thunuguntla.github.io/tools/${dirName}/`;

  return { name, url };
}

// 1. Get list of all tools
const dirs = fs.readdirSync(toolsDir).filter(file => {
  return fs.statSync(path.join(toolsDir, file)).isDirectory() && fs.existsSync(path.join(toolsDir, file, 'index.html'));
});

const tools = [];
for (const dir of dirs) {
  const data = getToolData(dir);
  if (data) {
    tools.push(data);
  }
}

// Sort tools to ensure a consistent list order
tools.sort((a, b) => a.name.localeCompare(b.name));

// 2. Build ItemList schema
const itemList = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Free MuleSoft Developer Tools by Upendra Thunuguntla",
  "description": "A suite of free browser-based tools for MuleSoft developers covering RAML, YAML, DataWeave, and API design.",
  "url": "https://upendra-thunuguntla.github.io/",
  "numberOfItems": tools.length,
  "itemListElement": tools.map((tool, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "WebApplication",
      "name": tool.name,
      "url": tool.url
    }
  }))
};

const scriptBlock = `    <script type="application/ld+json">
    ${JSON.stringify(itemList, null, 2).replace(/\n/g, '\n    ')}
    </script>\n`;

// Files to update: root index.html + all tools' index.html
const filesToUpdate = [
  path.join(rootDir, 'index.html'),
  ...dirs.map(dir => path.join(toolsDir, dir, 'index.html'))
];

for (const file of filesToUpdate) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Remove existing ItemList script block if it exists
  const existingRegex = /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"ItemList"[\s\S]*?<\/script>\s*/gi;
  content = content.replace(existingRegex, '');

  // Insert before </head>
  const headIndex = content.lastIndexOf('</head>');
  if (headIndex !== -1) {
    const updatedContent = content.substring(0, headIndex) + scriptBlock + content.substring(headIndex);
    fs.writeFileSync(file, updatedContent, 'utf8');
    console.log(`Updated: ${path.relative(rootDir, file)}`);
  } else {
    console.error(`Could not find </head> in ${path.relative(rootDir, file)}`);
  }
}
