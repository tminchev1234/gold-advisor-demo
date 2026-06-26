/* iGold offer cards injected under each article.
   UTM-tagged links (so iGold attributes the traffic in their own analytics,
   per article via utm_content) + a click-tracking hook ready for GA/Plausible. */
(function () {
  var article = document.querySelector('.article');
  if (!article) return;

  var slug = (location.pathname.split('/').pop() || 'article').replace('.html', '') || 'home';

  function url(path, campaign) {
    return 'https://igold.bg/' + path +
      '?utm_source=goldadvisor&utm_medium=article&utm_campaign=' + campaign +
      '&utm_content=' + encodeURIComponent(slug);
  }

  var offers = [
    { ic: '🥇', h: 'Нашият топ продукт', p: 'Кюлчета и монети Valcambi, Argor-Heraeus и PAMP — 0% ДДС върху инвестиционно злато.', tag: 'Разгледай →', path: 'zlatni-kyulcheta-investitsionni', c: 'top_product' },
    { ic: '🏷️', h: 'Бием всяка цена', p: 'Видите ли цена по-ниска от нашата — обадете се. Гарантирано я бием.', tag: 'Промоции →', path: 'promotzii', c: 'promo' },
    { ic: '🛡️', h: 'Защо от нас', p: 'Лицензиран дилър · цени на 5 минути · безплатна доставка и застраховка над 500 лв.', tag: 'За нас →', path: 'zavas', c: 'why_us' }
  ];

  var html = '<div class="offers-wrap"><div class="oh">💰 <b>iGold</b> · Продаваме злато. Купувате свобода.</div><div class="offers">';
  offers.forEach(function (o) {
    html += '<a class="offer" href="' + url(o.path, o.c) + '" target="_blank" rel="noopener" data-track="' + o.c + '">' +
      '<div class="oic">' + o.ic + '</div><h4>' + o.h + '</h4><p>' + o.p + '</p>' +
      '<span class="otag">' + o.tag + '</span></a>';
  });
  html += '</div></div>';
  article.insertAdjacentHTML('beforeend', html);

  // click tracking — wires to GA/GTM (dataLayer) and Plausible if present; logs in demo
  article.querySelectorAll('.offer').forEach(function (a) {
    a.addEventListener('click', function () {
      var campaign = a.getAttribute('data-track');
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'igold_offer_click', campaign: campaign, article: slug });
      if (typeof window.plausible === 'function') window.plausible('iGold Offer Click', { props: { campaign: campaign, article: slug } });
      try { console.log('[track] iGold offer click →', campaign, '| article:', slug); } catch (e) {}
    });
  });
})();
