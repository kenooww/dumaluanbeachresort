// Website Settings panel logic — talks to /api/settings
// Assumes a single settings document per site (GET returns one object, PUT saves it).

(function () {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  const TOKEN_KEY = 'amihan_token';
  function authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const errorEl = document.getElementById("settingsFormError");
  const saveBtn = document.getElementById("saveSettingsBtn");

  const fieldIds = [
    "companyName", "tagline",
    "aboutUs",'aboutUs2', "mission", "vision", "yearEstablished",
    "address", "city", "province", "postalCode", "country",
    "phone", "whatsapp", "email", "reservationsEmail",
    "latitude", "longitude", "mapsEmbedUrl",
    "checkInTime", "checkOutTime", "frontDeskHours",
    "cancellationPolicy", "termsAndConditions", "privacyPolicy",
    "facebookUrl", "instagramUrl", "tiktokUrl", "youtubeUrl", "twitterUrl", "tripadvisorUrl",
    "currency", "paymentMethods", "bankDetails",
    "metaTitle", "metaDescription", "metaKeywords",
    "footerText", "copyrightText"
  ];

  const fieldIdMap = {
    facebookUrl: 'settingsFacebook',
    instagramUrl: 'settingsInstagram',
    tiktokUrl: 'settingsTiktok',
    youtubeUrl: 'settingsYoutube',
    twitterUrl: 'settingsTwitter',
    tripadvisorUrl: 'settingsTripadvisor',
  };

  const sliderItemsContainer = document.getElementById('settingsSliderItems');
  const addSliderItemBtn = document.getElementById('addSliderItemBtn');
  const aboutImagesInput = document.getElementById('settingsAboutImages');
  const aboutImagesPreview = document.getElementById('settingsAboutImagesPreview');
  let sliderItemsState = [];
  let aboutImagesState = [];

  function setError(msg) {
    if (errorEl) errorEl.textContent = msg || "";
  }

  async function compressImageFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return file;

    const imageUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      const maxDimension = 1100;
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const quality = file.size > 900 * 1024 ? 0.65 : (file.size > 500 * 1024 ? 0.75 : 0.85);
      const blob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), file.type || 'image/jpeg', quality);
      });

      if (!blob) return file;
      return new File([blob], file.name, { type: blob.type || file.type, lastModified: Date.now() });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function prepareUploadFile(file) {
    if (!file) return file;
    const compressed = await compressImageFile(file);
    return compressed.size < file.size ? compressed : file;
  }

  function createSliderItemElement(item, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-item';
    wrapper.dataset.index = index;

    const row1 = document.createElement('div');
    row1.className = 'slider-item-row';

    const imageLabel = document.createElement('label');
    imageLabel.textContent = 'Slide image';
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
    imageInput.name = 'sliderImages';
    imageInput.className = 'slider-item-file';
    imageLabel.appendChild(imageInput);

    const preview = document.createElement('img');
    preview.className = 'slider-item-preview';
    preview.alt = 'Slide preview';
    if (item.imageUrl) {
      preview.src = item.imageUrl;
    } else {
      preview.style.display = 'none';
    }

    row1.appendChild(imageLabel);
    row1.appendChild(preview);

    const row2 = document.createElement('div');
    row2.className = 'slider-item-row';
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Slide text';
    const textArea = document.createElement('textarea');
    textArea.name = `sliderText_${index}`;
    textArea.rows = 2;
    textArea.placeholder = 'Text shown on this slide';
    textArea.value = item.sliderText || '';
    textLabel.appendChild(textArea);
    row2.appendChild(textLabel);

    const subtitleLabel = document.createElement('label');
    subtitleLabel.textContent = 'Slide subtitle';
    const subtitleInput = document.createElement('input');
    subtitleInput.type = 'text';
    subtitleInput.name = `sliderSubtitle_${index}`;
    subtitleInput.placeholder = 'Subtitle or subheading for this slide';
    subtitleInput.value = item.sliderSubtitle || '';
    subtitleLabel.appendChild(subtitleInput);
    row2.appendChild(subtitleLabel);

    const row3 = document.createElement('div');
    row3.className = 'slider-item-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove slide';
    removeBtn.addEventListener('click', () => {
      sliderItemsState.splice(index, 1);
      renderSliderItems();
    });
    row3.appendChild(removeBtn);

    imageInput.addEventListener('change', async () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        if (!item.imageUrl) preview.style.display = 'none';
        return;
      }
      const compressedFile = await prepareUploadFile(file);
      preview.src = URL.createObjectURL(compressedFile);
      preview.style.display = 'block';
      item.newImage = true;
      item.file = compressedFile;
    });

    wrapper.appendChild(row1);
    wrapper.appendChild(row2);
    wrapper.appendChild(row3);
    return wrapper;
  }

  function renderSliderItems() {
    if (!sliderItemsContainer) return;
    sliderItemsContainer.innerHTML = '';
    sliderItemsState.forEach((item, index) => {
      item.index = index;
      const element = createSliderItemElement(item, index);
      sliderItemsContainer.appendChild(element);
    });
    if (sliderItemsState.length === 0) {
      sliderItemsContainer.innerHTML = '<p class="hint">No slides configured yet.</p>';
    }
  }

  function createAboutImagePreview(item, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'about-image-preview-item';
    wrapper.dataset.index = index;

    const img = document.createElement('img');
    img.alt = 'About image preview';
    if (item.file) {
      img.src = URL.createObjectURL(item.file);
    } else if (item.imageUrl) {
      img.src = item.imageUrl;
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      aboutImagesState.splice(index, 1);
      renderAboutImages();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    return wrapper;
  }

  function renderAboutImages() {
    if (!aboutImagesPreview) return;
    aboutImagesPreview.innerHTML = '';

    if (aboutImagesState.length === 0) {
      aboutImagesPreview.innerHTML = '<p class="hint">No about images configured yet.</p>';
      return;
    }

    aboutImagesState.forEach((item, index) => {
      const previewItem = createAboutImagePreview(item, index);
      aboutImagesPreview.appendChild(previewItem);
    });
  }

  function loadAboutImages(data) {
    aboutImagesState = Array.isArray(data.aboutImages)
      ? data.aboutImages.map((item) => ({
          imageUrl: item.imageUrl || '',
          imagePublicId: item.imagePublicId || '',
          file: null,
        }))
      : [];
    renderAboutImages();
  }

  function appendAboutImagesToForm(formData) {
    formData.delete('aboutImagesData');
    formData.delete('aboutImages');

    const items = [];
    let fileCounter = 0;

    aboutImagesState.forEach((item) => {
      const payloadItem = {
        imageUrl: item.imageUrl || '',
        imagePublicId: item.imagePublicId || '',
      };

      if (item.file) {
        payloadItem.newImageIndex = fileCounter;
        formData.append('aboutImages', item.file);
        fileCounter += 1;
      }

      items.push(payloadItem);
    });

    formData.set('aboutImagesData', JSON.stringify(items));
  }

  function appendSliderItemsToForm(formData) {
    formData.delete('sliderItems');
    formData.delete('sliderImages');

    const items = [];
    let fileCounter = 0;

    sliderItemsState.forEach((item, index) => {
      const wrapper = sliderItemsContainer.querySelector(`.slider-item[data-index="${index}"]`);
      if (!wrapper) return;
      const textarea = wrapper.querySelector('textarea');
      const currentText = textarea ? textarea.value.trim() : '';
      const fileInput = wrapper.querySelector('.slider-item-file');
      const selectedFile = fileInput?.files?.[0];

      const subtitleEl = wrapper.querySelector(`input[name="sliderSubtitle_${index}"]`);
      const currentSubtitle = subtitleEl ? subtitleEl.value.trim() : '';

      const payloadItem = {
        imageUrl: item.imageUrl || '',
        imagePublicId: item.imagePublicId || '',
        sliderText: currentText,
        sliderSubtitle: currentSubtitle,
      };

      const uploadFile = item.file || selectedFile;
      if (uploadFile) {
        payloadItem.newImageIndex = fileCounter;
        formData.append('sliderImages', uploadFile);
        fileCounter += 1;
      }

      items.push(payloadItem);
    });

    formData.set('sliderItems', JSON.stringify(items));
  }

  function loadSliderItems(data) {
    sliderItemsState = Array.isArray(data.sliderItems)
      ? data.sliderItems.map((item) => ({
          imageUrl: item.imageUrl || '',
          imagePublicId: item.imagePublicId || '',
          sliderText: item.sliderText || '',
          sliderSubtitle: item.sliderSubtitle || '',
        }))
      : [];
    renderSliderItems();
  }

  if (addSliderItemBtn) {
    addSliderItemBtn.addEventListener('click', () => {
      sliderItemsState.push({ imageUrl: '', imagePublicId: '', sliderText: '' });
      renderSliderItems();
    });
  }

  if (aboutImagesInput) {
    aboutImagesInput.addEventListener('change', async () => {
      const files = Array.from(aboutImagesInput.files || []);
      for (const file of files) {
        const compressedFile = await prepareUploadFile(file);
        aboutImagesState.push({ imageUrl: '', imagePublicId: '', file: compressedFile });
      }
      aboutImagesInput.value = '';
      renderAboutImages();
    });
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();

      fieldIds.forEach((id) => {
        const mappedId = fieldIdMap[id] || ("settings" + id.charAt(0).toUpperCase() + id.slice(1));
        const el = document.getElementById(mappedId);
        if (el && data[id] !== undefined && data[id] !== null) {
          el.value = data[id];
        }
      });

      if (data.logoUrl) {
        const logoPreview = document.getElementById("settingsLogoPreview");
        logoPreview.src = data.logoUrl;
        logoPreview.hidden = false;
      }
      if (data.faviconUrl) {
        const favPreview = document.getElementById("settingsFaviconPreview");
        favPreview.src = data.faviconUrl;
        favPreview.hidden = false;
      }
      loadSliderItems(data);
      loadAboutImages(data);
    } catch (err) {
      console.error(err);
      setError("Could not load current settings. You can still fill in the form and save.");
    }
  }

  function previewImage(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  }

  previewImage("settingsLogo", "settingsLogoPreview");
  previewImage("settingsFavicon", "settingsFaviconPreview");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const formData = new FormData(form);
      const logoInput = document.getElementById('settingsLogo');
      const faviconInput = document.getElementById('settingsFavicon');

      if (logoInput?.files?.[0]) {
        const compressedLogo = await prepareUploadFile(logoInput.files[0]);
        formData.delete('logo');
        formData.append('logo', compressedLogo, compressedLogo.name || 'logo');
      }
      if (faviconInput?.files?.[0]) {
        const compressedFavicon = await prepareUploadFile(faviconInput.files[0]);
        formData.delete('favicon');
        formData.append('favicon', compressedFavicon, compressedFavicon.name || 'favicon');
      }

      appendSliderItemsToForm(formData);
      appendAboutImagesToForm(formData);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { ...authHeaders() },
        body: formData,
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/admin/login.html';
        return;
      }
      if (!res.ok) {
        let errMsg = 'Save failed';
        try {
          const errData = await res.json();
          if (errData?.message) errMsg = errData.message;
        } catch (jsonErr) {
          const text = await res.text();
          if (text) {
            console.error('Settings save error body:', text);
            errMsg = text;
          }
        }
        throw new Error(errMsg);
      }
      // Refresh UI with server-side saved values (ensures public IDs and subtitles update)
      try {
        const data = await res.json();
        if (data?.aboutImages) {
          aboutImagesState = data.aboutImages.map((item) => ({
            imageUrl: item.imageUrl || '',
            imagePublicId: item.imagePublicId || '',
            file: null,
          }));
        }
        loadSliderItems(data);
        loadAboutImages(data);
      } catch (e) {
        // ignore JSON parse errors here — we still show saved indicator
      }
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => (saveBtn.textContent = "Save changes"), 1500);
    } catch (err) {
      console.error(err);
      let message = "Something went wrong saving these settings. Please try again.";
      if (err?.message) message = err.message;
      setError(message);
      saveBtn.textContent = "Save changes";
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Only load when the Website Settings tab is actually opened
  const settingsNavBtn = document.querySelector('.sidebar-link[data-panel="settings"]');
  let loaded = false;
  if (settingsNavBtn) {
    settingsNavBtn.addEventListener("click", () => {
      if (!loaded) {
        loaded = true;
        loadSettings();
      }
    });
  }
})();