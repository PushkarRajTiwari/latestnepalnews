// Relative times ("5 min ago"), share buttons, and hiding images that fail to load.
(function () {
  var np = document.documentElement.lang === 'ne';
  var digits = '०१२३४५६७८९';
  function n(value) {
    return np ? String(value).replace(/\d/g, function (d) { return digits[d]; }) : String(value);
  }
  function relative(iso) {
    var seconds = (Date.now() - Date.parse(iso)) / 1000;
    if (!isFinite(seconds)) return null;
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    if (minutes < 1) return np ? 'भर्खरै' : 'just now';
    if (minutes < 60) return np ? n(minutes) + ' मिनेट अघि' : minutes + ' min ago';
    if (hours < 24) return np ? n(hours) + ' घण्टा अघि' : hours + (hours === 1 ? ' hr ago' : ' hrs ago');
    if (days < 7) return np ? n(days) + ' दिन अघि' : days + (days === 1 ? ' day ago' : ' days ago');
    return null;
  }
  function update() {
    var times = document.querySelectorAll('time[datetime]:not([data-absolute])');
    for (var i = 0; i < times.length; i++) {
      var el = times[i];
      if (!el.title) el.title = el.textContent;
      var text = relative(el.getAttribute('datetime'));
      if (text) el.textContent = text;
    }
  }
  update();
  setInterval(update, 60000);

  // Share buttons on story pages: the phone's own share menu where there is
  // one, and copy-link everywhere.
  var native = document.querySelector('[data-share-url]');
  if (native && navigator.share) {
    native.hidden = false;
    native.addEventListener('click', function () {
      navigator.share({ title: native.getAttribute('data-share-title'), url: native.getAttribute('data-share-url') }).catch(function () {});
    });
  }
  var copy = document.querySelector('[data-copy]');
  if (copy && navigator.clipboard) {
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(copy.getAttribute('data-copy')).then(function () {
        copy.textContent = copy.getAttribute('data-copied');
      });
    });
  } else if (copy) {
    copy.hidden = true;
  }

  // Publishers sometimes block hotlinked images; drop the empty frame.
  document.addEventListener('error', function (event) {
    var img = event.target;
    if (img && img.tagName === 'IMG') {
      var frame = img.closest('.thumb');
      if (frame) frame.remove();
    }
  }, true);
})();
