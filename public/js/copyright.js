(async function () {
  const copyrightElements = Array.from(document.querySelectorAll('.copy_right'));
  const socialLinks = Array.from(document.querySelectorAll('.socail_links a, .social-links a, .social_links a'));
  const footerWidgets = Array.from(document.querySelectorAll('.footer_widget'));

  const fallbackText = (settings) => {
    const year = new Date().getFullYear();
    const companyName = settings?.companyName?.trim() || 'Amihan Cove Resort';
    return `© ${year} ${companyName}. All rights reserved.`;
  };

  const buildAddressText = (settings) => {
    const parts = [
      settings?.address?.trim(),
      settings?.city?.trim(),
      settings?.province?.trim(),
      settings?.postalCode?.trim(),
      settings?.country?.trim(),
    ].filter(Boolean);

    if (parts.length) return parts.join(', ');
    return '200, Green road, Mongla, New York City, USA';
  };

  const setSocialLinks = (settings) => {
    const socialMap = [
      { key: 'facebookUrl', selector: 'facebook' },
      { key: 'twitterUrl', selector: 'twitter' },
      { key: 'instagramUrl', selector: 'instagram' },
    ];

    socialLinks.forEach((link) => {
      const icon = link.querySelector('i')?.className || link.className || '';
      const match = socialMap.find((entry) => icon.includes(entry.selector));
      if (!match) return;

      const url = settings?.[match.key]?.trim();
      if (url) {
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  };

  const setAddress = (settings) => {
    const addressText = buildAddressText(settings);
    const addressWidget = footerWidgets.find((widget) => {
      const title = widget.querySelector('.footer_title')?.textContent?.trim().toLowerCase() || '';
      return title === 'address' || title === 'address:';
    });

    const addressElement = addressWidget?.querySelector('.footer_text');
    if (addressElement) {
      addressElement.innerHTML = addressText.replace(/, /g, '<br>');
    }

    const directionLink = addressWidget?.querySelector('.line-button');
    const mapUrl = (settings?.mapsEmbedUrl || settings?.mapUrl || '').trim();
    const coordinatesUrl = [settings?.latitude?.trim(), settings?.longitude?.trim()].filter(Boolean).join(',');
    const fallbackMapUrl = coordinatesUrl ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinatesUrl)}` : 'https://www.google.com/maps';

    if (directionLink) {
      directionLink.href = mapUrl || fallbackMapUrl;
      directionLink.target = '_blank';
      directionLink.rel = 'noopener noreferrer';
    }

    const reservationWidget = footerWidgets.find((widget) => {
      const title = widget.querySelector('.footer_title')?.textContent?.trim().toLowerCase() || '';
      return title.includes('reservation');
    });

    const reservationText = reservationWidget?.querySelector('.footer_text');
    const phone = (settings?.phone || '').trim();
    const whatsapp = (settings?.whatsapp || '').trim();
    const email = (settings?.reservationsEmail || settings?.email || '').trim();
    const lines = [phone, whatsapp, email].filter(Boolean);

    if (reservationText) {
      const currentText = reservationText.textContent?.trim();
      reservationText.innerHTML = lines.length ? lines.join('<br>') : currentText || 'Please update reservation details in settings.';
    }

    document.querySelectorAll('.phone_num a.mobile_no, .mobile_no').forEach((link) => {
      const fallbackText = link.textContent?.trim() || '+10 576 377 4789';
      const displayText = phone || whatsapp || fallbackText;
      link.textContent = displayText;

      if (phone) {
        link.href = `tel:${phone}`;
      } else if (whatsapp) {
        link.href = `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
      } else {
        link.href = '#';
      }
    });
  };

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const createSlideMarkup = (item, index) => {
    const text = escapeHtml(item.sliderText || '');
    const subtitle = escapeHtml(item.sliderSubtitle || '');
    const imageUrl = escapeHtml(item.imageUrl || '');
    const bgClass = index % 2 === 0 ? 'slider_bg_1' : 'slider_bg_2';
    return `
      <div class="single_slider d-flex align-items-center justify-content-center ${bgClass}" style="background-image:url('${imageUrl}');background-size:cover;background-position:center;">
        <div class="container">
          <div class="row">
            <div class="col-xl-12">
              <div class="slider_text text-center">
                <h3>${text}</h3>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const updateLogo = (settings) => {
    const logoUrl = settings?.logoUrl?.trim();
    if (!logoUrl) return;

    const logoImages = Array.from(document.querySelectorAll('.logo-img img, header .logo-img img'));
    logoImages.forEach((img) => {
      img.src = logoUrl;
      if (!img.alt) img.alt = settings.companyName || 'Site logo';
    });
  };

  const updateFavicon = (settings) => {
    const faviconUrl = settings?.faviconUrl?.trim();
    if (!faviconUrl) return;

    const existing = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
    if (existing) {
      existing.href = faviconUrl;
    } else {
      const link = document.createElement('link');
      link.rel = 'shortcut icon';
      link.type = 'image/x-icon';
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  };

  const setSliderItems = (settings) => {
    const sliderItems = Array.isArray(settings?.sliderItems)
      ? settings.sliderItems.filter((item) => item?.imageUrl)
      : [];
    if (!sliderItems.length) return;

    const slider = document.querySelector('.slider_active');
    if (!slider) return;

    const slidesHtml = sliderItems.map(createSlideMarkup).join('');
    const $slider = window.jQuery?.fn?.owlCarousel ? window.jQuery(slider) : null;

    if ($slider && $slider.hasClass('owl-loaded')) {
      $slider.trigger('replace.owl.carousel', slidesHtml).trigger('refresh.owl.carousel');
    } else {
      slider.innerHTML = slidesHtml;
    }
  };

  const setContactInfo = (settings) => {
    const contactBlocks = Array.from(document.querySelectorAll('.media.contact-info'));
    contactBlocks.forEach((block) => {
      const iconClass = block.querySelector('i')?.className || '';
      const title = block.querySelector('.media-body h3');
      const subtitle = block.querySelector('.media-body p');
      if (!title || !subtitle) return;

      if (iconClass.includes('ti-home')) {
        const addressLine = settings?.address?.trim() || '200, Green road, Mongla, USA';
        const region = [settings?.city?.trim(), settings?.province?.trim(), settings?.postalCode?.trim(), settings?.country?.trim()].filter(Boolean).join(', ');
        title.textContent = addressLine;
        subtitle.textContent = region || 'Rosemead, CA 91770';
      } else if (iconClass.includes('ti-tablet')) {
        const phoneText = [settings?.phone?.trim(), settings?.whatsapp?.trim()].filter(Boolean).join(' / ');
        title.textContent = phoneText || '+1 253 565 2365';
        subtitle.textContent = settings?.frontDeskHours?.trim() || 'Mon to Fri 9am to 6pm';
      } else if (iconClass.includes('ti-email')) {
        title.textContent = (settings?.email || settings?.reservationsEmail || '').trim() || 'support@colorlib.com';
        subtitle.textContent = 'Send us your query anytime!';
      }
    });
  };

  try {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error('Unable to load site settings.');

    const settings = await response.json();
    const text = (settings?.copyrightText || '').trim() || fallbackText(settings);

    copyrightElements.forEach((element) => {
      element.textContent = text;
    });

    updateLogo(settings);
    updateFavicon(settings);
    setSocialLinks(settings);
    setAddress(settings);
    setContactInfo(settings);
    setSliderItems(settings);
  } catch (error) {
    const settings = {};
    const text = fallbackText(settings);
    copyrightElements.forEach((element) => {
      element.textContent = text;
    });
    updateLogo(settings);
    updateFavicon(settings);
    setSocialLinks(settings);
    setAddress(settings);
    setContactInfo(settings);
    setSliderItems(settings);
  }
})();
