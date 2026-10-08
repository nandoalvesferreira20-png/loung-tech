// Carry only campaign labels into budget links; no cookies or personal data.
(() => {
  const current = new URLSearchParams(location.search);
  for (const link of document.querySelectorAll('a[href]')) {
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^\/orcamento\/?$/.test(url.pathname)) continue;
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const value = current.get(key);
      if (value && value.length <= 150 && !/[\x00-\x1F\x7F]/.test(value)) url.searchParams.set(key, value);
    }
    link.href = url.pathname + url.search + url.hash;
  }
})();
