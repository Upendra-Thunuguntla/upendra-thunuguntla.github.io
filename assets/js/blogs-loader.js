/**
 * blogs-loader.js
 * Dynamically renders random blog cards from Medium RSS feed or local blogs.json on every refresh.
 */

(function () {
    'use strict';

    const RSS_URL = 'https://medium.com/feed/@upendra-thunuguntla';
    const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

    /** Fisher-Yates shuffle algorithm to randomize articles on every load */
    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

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
        let icon = "📝";
        const title = item.title.toLowerCase();
        if (title.includes('dataweave') || title.includes('dw')) icon = "⚡";
        else if (title.includes('mule')) icon = "⚙️";
        else if (title.includes('docker') || title.includes('whale')) icon = "🐳";
        else if (title.includes('secure') || title.includes('encrypt')) icon = "🔐";
        else if (title.includes('azure') || title.includes('github')) icon = "🐙";
        else if (title.includes('date') || title.includes('hour')) icon = "⏰";

        const catText = (item.categories && item.categories.length) 
            ? item.categories.slice(0, 2).join(' / ') 
            : 'Technical Article';

        return `
      <a href="${item.link}" target="_blank" rel="noopener" class="pub-card">
        <span class="pub-icon">${icon}</span>
        <div>
          <div class="pub-title">${item.title}</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
            Medium · ${catText}
          </div>
        </div>
        <span class="pub-arrow"><i class="fas fa-external-link-alt"></i></span>
      </a>`;
    }

    /** Render shuffled posts to all data-blog-type containers */
    function renderPosts(posts) {
        const containers = document.querySelectorAll('[data-blog-type]');
        if (!containers.length || !posts.length) return;

        // Update publication count if element exists
        const pubCountEl = document.getElementById('pub-count');
        if (pubCountEl) {
            pubCountEl.textContent = posts.length + (posts.length >= 10 ? '+' : '');
        }

        containers.forEach(container => {
            const type = container.dataset.blogType; // "blog-card" or "pub-card"
            const limit = parseInt(container.dataset.blogLimit || '4', 10);
            
            // Randomly shuffle posts array for every container on every page load/refresh
            const shuffledPosts = shuffleArray(posts);
            const selectedPosts = shuffledPosts.slice(0, limit);

            container.innerHTML = selectedPosts.map(post => {
                return type === 'pub-card' ? buildPubCard(post) : buildBlogCard(post);
            }).join('');
        });
    }

    /** Fallback to local blogs.json if RSS API fails or is offline */
    function fallbackToLocalBlogs() {
        fetch('/blogs.json')
            .then(res => res.json())
            .then(items => {
                if (!items || !items.length) return;
                const mapped = items.map(item => ({
                    title: item.title,
                    link: item.url,
                    description: item.description,
                    pubDate: item.date,
                    categories: item.tags || ['MuleSoft']
                }));
                renderPosts(mapped);
            })
            .catch(err => console.warn('[blogs-loader] Fallback error:', err));
    }

    /** Main - fetch and render */
    function loadBlogs() {
        const containers = document.querySelectorAll('[data-blog-type]');
        if (!containers.length) return;

        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok' && data.items && data.items.length) {
                    renderPosts(data.items);
                } else {
                    fallbackToLocalBlogs();
                }
            })
            .catch(() => fallbackToLocalBlogs());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBlogs);
    } else {
        loadBlogs();
    }
})();
