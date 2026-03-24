/**
 * blogs-loader.js
 * Dynamically renders blog cards from Medium RSS feed.
 * Uses rss2json.com API (Free tier) to bypass CORS.
 */

(function () {
    'use strict';

    const RSS_URL = 'https://medium.com/feed/@upendra-thunuguntla';
    const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

    /** Clean HTML from a string and truncate */
    function cleanDescription(html, limit = 120) {
        if (!html) return "";
        const text = html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
        if (text.length <= limit) return text;
        return text.substring(0, limit).trim() + '...';
    }

    /** Format Date: "2024-03-13 10:00:00" -> "Mar 2024" or standard date */
    function formatDate(dateStr, short = true) {
        try {
            const d = new Date(dateStr.replace(/-/g, "/"));
            if (short) {
                return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            }
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    /** Build HTML for "blog-card" style (vertical, descriptive) */
    function buildBlogCard(item) {
        const categories = item.categories || [];
        const tagsHtml = categories.slice(0, 2)
            .map(t => `<span class="blog-tag">${t}</span>`)
            .join(' · ') || `<span class="blog-tag">MuleSoft</span>`;

        return `
      <a href="${item.link}" target="_blank" rel="noopener" class="blog-card">
        <div class="blog-card-tag">${tagsHtml}</div>
        <div class="blog-card-title">${item.title}</div>
        <div class="blog-card-desc">${cleanDescription(item.description || item.content)}</div>
        <div class="blog-card-footer">
          <span>${formatDate(item.pubDate)}</span>
          <i class="fas fa-external-link-alt" style="font-size: 0.8em;"></i>
        </div>
      </a>`;
    }

    /** Build HTML for "pub-card" style (horizontal row, compact) */
    function buildPubCard(item) {
        // Find a representative icon based on title/categories
        let icon = "📝";
        const title = item.title.toLowerCase();
        if (title.includes('dataweave') || title.includes('dw')) icon = "⚡";
        else if (title.includes('mule')) icon = "⚙️";
        else if (title.includes('docker') || title.includes('whale')) icon = "🐳";
        else if (title.includes('secure') || title.includes('encrypt')) icon = "🔐";
        else if (title.includes('azure') || title.includes('github')) icon = "🐙";
        else if (title.includes('date') || title.includes('hour')) icon = "⏰";

        return `
      <a href="${item.link}" target="_blank" rel="noopener" class="pub-card">
        <span class="pub-icon">${icon}</span>
        <div>
          <div class="pub-title">${item.title}</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
            Medium · ${item.categories.slice(0, 2).join(' / ') || 'Technical Article'}
          </div>
        </div>
        <span class="pub-arrow"><i class="fas fa-external-link-alt"></i></span>
      </a>`;
    }

    /** Main - fetch and render */
    function loadBlogs() {
        const containers = document.querySelectorAll('[data-blog-type]');
        if (!containers.length) return;

        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'ok') return;
                const posts = data.items || [];

                containers.forEach(container => {
                    const type = container.dataset.blogType; // "blog-card" or "pub-card"
                    const limit = parseInt(container.dataset.blogLimit || '4', 10);
                    const filteredPosts = posts.slice(0, limit);

                    if (!filteredPosts.length) return;

                    container.innerHTML = filteredPosts.map(post => {
                        return type === 'pub-card' ? buildPubCard(post) : buildBlogCard(post);
                    }).join('');
                });
            })
            .catch(err => console.warn('[blogs-loader]', err));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBlogs);
    } else {
        loadBlogs();
    }
})();
