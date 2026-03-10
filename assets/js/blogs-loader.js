/**
 * blogs-loader.js
 * Dynamically renders blog cards from /blogs.json.
 *
 * Usage — add to any page that has a container like:
 *   <div class="blog-cards-grid" data-page="json2raml"></div>
 *   <script src="/assets/js/blogs-loader.js"></script>
 *
 * The data-page attribute filters blogs to those that include
 * the page name in their "pages" array. Use "home" for the homepage.
 *
 * To add a new blog post: edit /blogs.json only. No HTML changes needed.
 */

(function () {
    'use strict';

    /** Resolve the root-relative path to blogs.json from any subdirectory. */
    function getBlogsUrl() {
        // Walk up from current location to find the site root
        const depth = (window.location.pathname.match(/\//g) || []).length - 1;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
        return prefix + 'blogs.json';
    }

    /** Format YYYY-MM-DD → "Mar 2024" */
    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    }

    /** Build the HTML for a single blog card */
    function buildCard(blog) {
        const tagsHtml = blog.tags
            .slice(0, 2)
            .map(t => `<span class="blog-tag">${t}</span>`)
            .join(' · ');

        return `
      <a href="${blog.url}" target="_blank" rel="noopener" class="blog-card">
        <div class="blog-card-tag">${tagsHtml}</div>
        <div class="blog-card-title">${blog.title}</div>
        <div class="blog-card-desc">${blog.description}</div>
        <div class="blog-card-footer">
          <span>${formatDate(blog.date)}</span>
          <span>${blog.readTime} read &rarr;</span>
        </div>
      </a>`;
    }

    /** Main — fetch, filter, render */
    function loadBlogs() {
        const containers = document.querySelectorAll('[data-blog-page]');
        if (!containers.length) return;

        fetch(getBlogsUrl())
            .then(function (res) {
                if (!res.ok) throw new Error('Failed to load blogs.json');
                return res.json();
            })
            .then(function (blogs) {
                containers.forEach(function (container) {
                    const page = container.dataset.blogPage;          // e.g. "json2raml"
                    const limit = parseInt(container.dataset.blogLimit || '2', 10);

                    const filtered = blogs
                        .filter(function (b) {
                            return !page || b.pages.includes(page);
                        })
                        .slice(0, limit);

                    if (!filtered.length) {
                        container.innerHTML = '<p style="color:var(--text-muted)">No articles found.</p>';
                        return;
                    }

                    container.innerHTML = filtered.map(buildCard).join('');
                });
            })
            .catch(function (err) {
                console.warn('[blogs-loader] ' + err.message);
                // Fail silently on the page — don't break anything
            });
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBlogs);
    } else {
        loadBlogs();
    }
})();
