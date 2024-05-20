---
title: 'Offline'
layout: 'layouts/temp.html'
permalink: '/offline/'
---


<p>This website uses a service worker to cache pages you’ve already visited so you can read them even when you’re offline.</p>

<ul id="history">

</ul>

<p>Thanks to <a href="https://adactio.com" target="_blank">@adactio</a> for helping me <a href="https://abookapart.com/products/going-offline" target="_blank">going offline</a>.</p>

<script>
caches.open('files')
.then( pageCache => {
  pageCache.keys()
  .then( keys => {
    let markup = '';
    keys.forEach( request => {
      let url = new URL(request.url);
      if (! (/assets/i.test(url))) {
        markup += `<li><a href="${url}">${url}</a></li>`;
      }
    })
    document.getElementById('history').innerHTML = markup;
  });
});
</script>
