/**
 * Obscura lightbox — PhotoSwipe integration
 *
 * Expects gallery items with this markup:
 *
 *   <a class="gallery-item" href="/photography/gallery/photo/"
 *      data-pswp-src="/assets/images/gallery/photo-2400w.webp"
 *      data-pswp-width="2400"
 *      data-pswp-height="1600"
 *      data-pswp-title="Photo Title"
 *      data-pswp-location="Berlin, Germany"
 *      data-pswp-camera="Leica M10"
 *      data-pswp-date="2024-11-15"
 *      data-pswp-permalink="/photography/gallery/photo/">
 *     <img src="..." alt="..." />
 *   </a>
 */

(function () {
  'use strict';

  function initLightbox() {
    var grids = document.querySelectorAll('.gallery-grid');
    if (!grids.length) return;

    // PhotoSwipe must be loaded globally (via script tag or import)
    if (typeof PhotoSwipe === 'undefined') {
      console.warn('PhotoSwipe not loaded — lightbox disabled');
      return;
    }

    grids.forEach(function (grid) {
      // Read display-field config from data attribute (default: show all)
      var fieldsAttr = grid.getAttribute('data-lightbox-fields') || '';
      var displayFields = fieldsAttr ? fieldsAttr.split(',') : ['date', 'camera', 'lens', 'settings', 'location', 'tags', 'license'];

      grid.addEventListener('click', function (e) {
        var item = e.target.closest('.gallery-item');
        if (!item) return;
        e.preventDefault();

        var items = Array.from(grid.querySelectorAll('.gallery-item'));
        var index = items.indexOf(item);

        var slides = items.map(function (el) {
          return {
            src: el.getAttribute('data-pswp-src') || '',
            width: parseInt(el.getAttribute('data-pswp-width') || '0', 10),
            height: parseInt(el.getAttribute('data-pswp-height') || '0', 10),
            alt: el.querySelector('img')
              ? el.querySelector('img').getAttribute('alt') || ''
              : '',
            title: el.getAttribute('data-pswp-title') || '',
            location: el.getAttribute('data-pswp-location') || '',
            camera: el.getAttribute('data-pswp-camera') || '',
            date: el.getAttribute('data-pswp-date') || '',
            license: el.getAttribute('data-pswp-license') || '',
            permalink: el.getAttribute('data-pswp-permalink') || '',
          };
        });

        openLightbox(slides, index, displayFields);
      });
    });
  }

  function openLightbox(slides, index, displayFields) {
    var pswpOptions = {
      dataSource: slides,
      index: index,
      bgOpacity: 0.95,
      showHideAnimationType: 'fade',
      padding: { top: 20, bottom: 80, left: 20, right: 20 },
      closeOnVerticalDrag: true,

      // Custom caption
      captionEl: true,
    };

    var lightbox = new PhotoSwipe(pswpOptions);

    // Add custom caption UI
    lightbox.on('uiRegister', function () {
      lightbox.ui.registerElement({
        name: 'custom-caption',
        order: 9,
        isButton: false,
        appendTo: 'root',
        onInit: function (el) {
          el.classList.add('pswp-caption');

          lightbox.on('change', function () {
            var slide = lightbox.currSlide;
            if (!slide || !slide.data) {
              el.innerHTML = '';
              return;
            }

            var data = slide.data;
            var parts = [];

            if (data.title) {
              parts.push(
                '<span class="pswp-caption__title">' +
                  escapeHtml(data.title) +
                  '</span>',
              );
            }

            var showDate = displayFields.indexOf('date') !== -1;
            var showCamera = displayFields.indexOf('camera') !== -1;
            var showLocation = displayFields.indexOf('location') !== -1;
            var showLicense = displayFields.indexOf('license') !== -1;
            var isMobile = window.matchMedia('(max-width: 48em)').matches;

            var meta = [];
            if (showLocation && data.location) meta.push(escapeHtml(data.location));
            if (showCamera && !isMobile && data.camera) meta.push(escapeHtml(data.camera));
            if (showDate && data.date) meta.push(escapeHtml(data.date));

            if (meta.length) {
              parts.push(
                '<span class="pswp-caption__meta">' +
                  meta.join(' &middot; ') +
                  '</span>',
              );
            }

            if (showLicense && data.license) {
              var licenseLabels = {
                'all-rights-reserved': '\u00A9 All Rights Reserved',
                'CC-BY-4.0': 'CC BY 4.0',
                'CC-BY-SA-4.0': 'CC BY-SA 4.0',
                'CC-BY-NC-4.0': 'CC BY-NC 4.0',
                'CC-BY-NC-SA-4.0': 'CC BY-NC-SA 4.0',
                'CC-BY-ND-4.0': 'CC BY-ND 4.0',
                'CC-BY-NC-ND-4.0': 'CC BY-NC-ND 4.0',
                'CC0-1.0': 'CC0 1.0',
              };
              var licenseUrls = {
                'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
                'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
                'CC-BY-NC-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
                'CC-BY-NC-SA-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
                'CC-BY-ND-4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
                'CC-BY-NC-ND-4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
                'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
              };
              var licenseLabel = licenseLabels[data.license] || data.license;
              var licenseUrl = licenseUrls[data.license];
              if (licenseUrl) {
                parts.push(
                  '<a class="pswp-caption__license" href="' +
                    escapeHtml(licenseUrl) +
                    '" target="_blank" rel="noopener noreferrer">' +
                    escapeHtml(licenseLabel) +
                    '</a>',
                );
              } else {
                parts.push(
                  '<span class="pswp-caption__license">' +
                    escapeHtml(licenseLabel) +
                    '</span>',
                );
              }
            }

            if (data.permalink) {
              parts.push(
                '<a class="pswp-caption__link" href="' +
                  escapeHtml(data.permalink) +
                  '">View details &rarr;</a>',
              );
            }

            el.innerHTML = parts.join('');
          });
        },
      });
    });

    lightbox.init();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox);
  } else {
    initLightbox();
  }
})();
