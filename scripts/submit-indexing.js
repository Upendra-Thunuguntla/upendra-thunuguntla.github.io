const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

async function main() {
  const serviceAccountKeyRaw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKeyRaw) {
    console.error('Error: GCP_SERVICE_ACCOUNT_KEY environment variable is missing.');
    console.error('Please add GCP_SERVICE_ACCOUNT_KEY to your GitHub Repository Secrets.');
    process.exit(1);
  }

  let creds;
  try {
    creds = JSON.parse(serviceAccountKeyRaw);
  } catch (err) {
    console.error('Error parsing GCP_SERVICE_ACCOUNT_KEY JSON:', err.message);
    process.exit(1);
  }

  // Parse sitemap.xml to extract URLs
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error(`Error: sitemap.xml not found at ${sitemapPath}`);
    process.exit(1);
  }

  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  const urlMatches = [...sitemapContent.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)];
  const urls = urlMatches.map(m => m[1]);

  if (urls.length === 0) {
    console.warn('No URLs found in sitemap.xml');
    return;
  }

  console.log(`Found ${urls.length} URLs in sitemap.xml to submit to Google Indexing API...\n`);

  // 1. Generate JWT for OAuth2 authentication
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64UrlEncode = (str) =>
    Buffer.from(typeof str === 'string' ? str : JSON.stringify(str))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(creds.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  // 2. Exchange JWT for Access Token
  console.log('Authenticating with Google OAuth2 API...');
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenResp.json();
  if (!tokenResp.ok) {
    console.error('Failed to authenticate with Google OAuth2:', tokenData);
    process.exit(1);
  }

  const accessToken = tokenData.access_token;
  console.log('✓ Successfully authenticated with Google API.\n');

  // 3. Submit each URL to Google Indexing API
  let successCount = 0;
  for (const url of urls) {
    try {
      const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_UPDATED'
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`  ✓ Successfully notified Google for: ${url}`);
        successCount++;
      } else {
        console.warn(`  ✗ Failed (${res.status}) for ${url}:`, data.error?.message || data);
      }
    } catch (err) {
      console.error(`  ✗ Exception submitting ${url}:`, err.message);
    }
  }

  console.log(`\nCompleted! Successfully submitted ${successCount}/${urls.length} URLs to Google Indexing API.`);
}

main().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
