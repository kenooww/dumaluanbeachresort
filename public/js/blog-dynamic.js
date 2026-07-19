(function () {
  const fallbackImage = 'img/blog/single_blog_1.png';
  const listMount = document.getElementById('blogPostsList');
  const singleMount = document.getElementById('singleBlogPost');
  const recentpostsMount = document.getElementById('post_item');

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function postDateParts(value) {
    const date = value ? new Date(value) : new Date();
    return {
      day: new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date),
      month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
      full: new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date),
    };
  }

  function paragraphs(content = '') {
    return String(content)
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, index) => `<p${index === 0 ? ' class="excert"' : ''}>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function postListItem(post) {
    const date = postDateParts(post.createdAt);
    return `
      <article class="blog_item">
        <div class="blog_item_img">
          <img class="card-img rounded-0" src="${escapeHtml(post.image || fallbackImage)}" alt="${escapeHtml(post.title)}">
          <a href="single-blog.html?id=${post._id}" class="blog_item_date">
            <h3>${date.day}</h3>
            <p>${date.month}</p>
          </a>
        </div>
        <div class="blog_details">
          <a class="d-inline-block" href="single-blog.html?id=${post._id}">
            <h2>${escapeHtml(post.title)}</h2>
          </a>
          <p>${escapeHtml(post.excerpt)}</p>
          <ul class="blog-info-link">
            <li><a href="#"><i class="fa fa-user"></i> ${escapeHtml(post.category || 'Resort News')}</a></li>
            <li><a href="#"><i class="fa fa-calendar"></i> ${date.full}</a></li>
          </ul>
        </div>
      </article>`;
  }

  async function loadBlogList() {
    listMount.innerHTML = '<p class="text-center">Loading blog posts...</p>';
    try {
      const res = await fetch('/api/blog-posts');
      const posts = await res.json();
      if (!res.ok) throw new Error(posts.message || 'Could not load blog posts.');
      if (!posts.length) {
        listMount.innerHTML = '<p class="text-center">No blog posts have been published yet.</p>';
        return;
      }
      listMount.innerHTML = posts.map(postListItem).join('');
    } catch (err) {
      listMount.innerHTML = `<p class="text-center">Couldn't load blog posts: ${escapeHtml(err.message)}</p>`;
    }
  }

  async function loadSinglePost() {
    let id = new URLSearchParams(window.location.search).get('id');

    singleMount.innerHTML = '<p class="text-center">Loading blog post...</p>';
    try {
      if (!id) {
        const listRes = await fetch('/api/blog-posts');
        const posts = await listRes.json();
        if (!listRes.ok) throw new Error(posts.message || 'Could not load blog posts.');
        if (!posts.length) {
          singleMount.innerHTML = '<p class="text-center">No blog posts have been published yet.</p>';
          return;
        }
        id = posts[0]._id;
      }
      const res = await fetch(`/api/blog-posts/${id}`);
      const post = await res.json();
      if (!res.ok) throw new Error(post.message || 'Could not load blog post.');
      const date = postDateParts(post.createdAt);
      singleMount.innerHTML = `
        <div class="single-post">
          <div class="feature-img">
            <img class="img-fluid" src="${escapeHtml(post.image || fallbackImage)}" alt="${escapeHtml(post.title)}">
          </div>
          <div class="blog_details">
            <h2>${escapeHtml(post.title)}</h2>
            <ul class="blog-info-link mt-3 mb-4">
              <li><a href="#"><i class="fa fa-user"></i> ${escapeHtml(post.category || 'Resort News')}</a></li>
              <li><a href="#"><i class="fa fa-calendar"></i> ${date.full}</a></li>
            </ul>
            ${paragraphs(post.content)}
          </div>
        </div>
        <div class="blog-author">
          <div class="media align-items-center">
            <img src="img/blog/author.png" alt="">
            <div class="media-body">
              <a href="#"><h4>${escapeHtml(post.author || 'Amihan Cove')}</h4></a>
              <p>${escapeHtml(post.excerpt)}</p>
            </div>
          </div>
        </div>`;
    } catch (err) {
      singleMount.innerHTML = `<p class="text-center">Couldn't load blog post: ${escapeHtml(err.message)}</p>`;
    }
  }
  function recentPostListItem(post) {
    const date = postDateParts(post.createdAt);
    return `
      <div class="media post_item">
        <img src="${escapeHtml(post.image || fallbackImage)}" alt="${escapeHtml(post.title)}" width="80" height="80" style="width:80px;height:80px;object-fit:cover;">
        <div class="media-body">
          <a href="single-blog.html?id=${post._id}">
            <h3>${escapeHtml(post.title)}</h3>
          </a>
          <p>${date.full}</p>
        </div>
      </div>`;
  } 
  async function loadRecentPosts() {
    recentpostsMount.innerHTML = '<p class="text-center">Loading blog posts...</p>';
    try {
      const res = await fetch('/api/blog-posts/recent');
      const posts = await res.json();
      if (!res.ok) throw new Error(posts.message || 'Could not load blog posts.');
      if (!posts.length) {
        recentpostsMount.innerHTML = '<p class="text-center">No blog posts have been published yet.</p>';
        return;
      }
      
      recentpostsMount.innerHTML = posts.map(recentPostListItem).join('');
    } catch (err) {
      recentpostsMount.innerHTML = `<p class="text-center">Couldn't load blog posts: ${escapeHtml(err.message)}</p>`;
    }
  }

  if (listMount) loadBlogList();
  if (singleMount) loadSinglePost();
  if (recentpostsMount) loadRecentPosts();
})();
