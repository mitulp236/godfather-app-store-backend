/* Godfather App Store — admin panel.
 *
 * Plain ES modules-free JavaScript, no framework and no build step. The one
 * generated artefact is styles.css (Tailwind), committed to the repo so a
 * deploy never needs to build CSS.
 *
 * The same file serves both pages; which half runs is decided by whether
 * #login-form is present.
 */
(function () {
  'use strict';

  /* ------------------------------ plumbing ------------------------------- */

  // The panel is mounted at <base>/admin, so the API is <base>/api. Deriving it
  // keeps the whole thing working if BASE_PATH ever changes.
  var adminIndex = location.pathname.indexOf('/admin');
  var BASE = adminIndex >= 0 ? location.pathname.slice(0, adminIndex) : '';
  var API = BASE + '/api';
  var LOGIN_URL = BASE + '/admin/login';
  var HOME_URL = BASE + '/admin/';

  function request(path, options) {
    options = options || {};
    return fetch(API + path, {
      method: options.method || 'GET',
      credentials: 'include', // send the session cookie
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          throw new Error('The server returned an unreadable response (HTTP ' + response.status + ').');
        })
        .then(function (payload) {
          if (!response.ok || !payload.success) {
            var error = new Error((payload.error && payload.error.message) || 'Request failed.');
            error.status = response.status;
            error.details = payload.error && payload.error.details;
            throw error;
          }
          return payload.data;
        });
    });
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  /* ------------------------------ login page ----------------------------- */

  var loginForm = el('login-form');

  if (loginForm) {
    var errorBox = el('login-error');
    var submit = el('login-submit');
    var passwordInput = el('password');

    el('toggle-password').addEventListener('click', function () {
      var showing = passwordInput.type === 'text';
      passwordInput.type = showing ? 'password' : 'text';
      this.textContent = showing ? 'Show' : 'Hide';
    });

    // Already signed in? Skip the form.
    request('/auth/me')
      .then(function () {
        location.replace(HOME_URL);
      })
      .catch(function () {
        /* not signed in — stay put */
      });

    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      errorBox.classList.add('hidden');
      submit.disabled = true;
      submit.textContent = 'Signing in…';

      request('/auth/login', {
        method: 'POST',
        body: { email: el('email').value, password: passwordInput.value },
      })
        .then(function () {
          location.replace(HOME_URL);
        })
        .catch(function (error) {
          errorBox.textContent = error.message;
          errorBox.classList.remove('hidden');
          submit.disabled = false;
          submit.textContent = 'Sign in';
          passwordInput.select();
        });
    });

    return;
  }

  /* ------------------------------- dashboard ----------------------------- */

  var shell = el('shell');
  if (!shell) return;

  var state = { apps: [], categories: [], tab: 'apps', search: '', filter: '' };

  /* -------- toasts -------- */

  function toast(message, tone) {
    var node = document.createElement('div');
    node.className =
      'pointer-events-auto animate-fade-up rounded-xl border px-4 py-3 text-[0.88rem] font-semibold shadow-xl ' +
      (tone === 'error'
        ? 'border-blood-600/60 bg-blood-900 text-blood-100'
        : 'border-emerald-600/50 bg-emerald-950 text-emerald-100');
    node.textContent = message;
    el('toasts').appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity 300ms';
      node.style.opacity = '0';
      setTimeout(function () {
        node.remove();
      }, 320);
    }, 3200);
  }

  /* -------- confirm dialog -------- */

  var confirmResolve = null;

  function confirmDialog(title, body) {
    el('confirm-title').textContent = title;
    el('confirm-body').textContent = body;
    el('confirm').classList.remove('hidden');
    return new Promise(function (resolve) {
      confirmResolve = resolve;
    });
  }

  function closeConfirm(result) {
    el('confirm').classList.add('hidden');
    if (confirmResolve) confirmResolve(result);
    confirmResolve = null;
  }

  el('confirm-cancel').addEventListener('click', function () {
    closeConfirm(false);
  });
  el('confirm-ok').addEventListener('click', function () {
    closeConfirm(true);
  });

  /* -------- modal -------- */

  var modalSubmit = null;

  function openModal(title, fieldsHtml, onSubmit) {
    el('modal-title').textContent = title;
    el('modal-form').innerHTML = fieldsHtml;
    el('modal-error').classList.add('hidden');
    el('modal').classList.remove('hidden');
    modalSubmit = onSubmit;
    wireImagePreviews();

    var first = el('modal-form').querySelector('input, textarea, select');
    if (first) first.focus();
  }

  function closeModal() {
    el('modal').classList.add('hidden');
    el('modal-form').innerHTML = '';
    modalSubmit = null;
  }

  el('modal-close').addEventListener('click', closeModal);
  el('modal-cancel').addEventListener('click', closeModal);
  el('modal-backdrop').addEventListener('click', closeModal);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!el('confirm').classList.contains('hidden')) return closeConfirm(false);
    if (!el('modal').classList.contains('hidden')) closeModal();
  });

  el('modal-save').addEventListener('click', function () {
    if (!modalSubmit) return;

    var form = el('modal-form');
    var values = {};
    Array.prototype.forEach.call(form.querySelectorAll('[name]'), function (input) {
      values[input.name] = input.type === 'checkbox' ? input.checked : input.value.trim();
    });

    var button = this;
    button.disabled = true;
    button.textContent = 'Saving…';

    Promise.resolve(modalSubmit(values))
      .then(function () {
        closeModal();
      })
      .catch(function (error) {
        var box = el('modal-error');
        var detail =
          error.details && error.details.length
            ? ' (' + error.details.map(function (d) { return d.field + ': ' + d.message; }).join('; ') + ')'
            : '';
        box.textContent = error.message + detail;
        box.classList.remove('hidden');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = 'Save';
      });
  });

  /* Live thumbnail for any input marked data-preview. */
  function wireImagePreviews() {
    Array.prototype.forEach.call(
      el('modal-form').querySelectorAll('input[data-preview]'),
      function (input) {
        var target = el(input.getAttribute('data-preview'));
        if (!target) return;

        function update() {
          var url = input.value.trim();
          if (!url) {
            target.classList.add('hidden');
            target.removeAttribute('src');
            return;
          }
          target.src = url;
          target.classList.remove('hidden');
        }

        input.addEventListener('input', update);
        target.addEventListener('error', function () {
          target.classList.add('hidden');
        });
        update();
      }
    );
  }

  /* -------- form builders -------- */

  function field(opts) {
    var value = escapeHtml(opts.value == null ? '' : opts.value);
    var required = opts.required ? ' required' : '';
    var span = opts.full ? 'sm:col-span-2' : '';
    var hint = opts.hint
      ? '<p class="mt-1.5 text-[0.75rem] text-white/25">' + escapeHtml(opts.hint) + '</p>'
      : '';

    if (opts.type === 'textarea') {
      return (
        '<div class="' + span + '"><label class="label" for="f-' + opts.name + '">' +
        escapeHtml(opts.label) + (opts.required ? ' *' : '') + '</label>' +
        '<textarea id="f-' + opts.name + '" name="' + opts.name + '" rows="' + (opts.rows || 4) +
        '" class="field resize-y"' + required + ' placeholder="' + escapeHtml(opts.placeholder || '') +
        '">' + value + '</textarea>' + hint + '</div>'
      );
    }

    if (opts.type === 'select') {
      var options = opts.options
        .map(function (option) {
          var selected = String(option.value) === String(opts.value) ? ' selected' : '';
          return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' +
            escapeHtml(option.label) + '</option>';
        })
        .join('');
      return (
        '<div class="' + span + '"><label class="label" for="f-' + opts.name + '">' +
        escapeHtml(opts.label) + (opts.required ? ' *' : '') + '</label>' +
        '<select id="f-' + opts.name + '" name="' + opts.name + '" class="field"' + required + '>' +
        options + '</select>' + hint + '</div>'
      );
    }

    if (opts.type === 'checkbox') {
      return (
        '<label class="' + span + ' flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3.5">' +
        '<input type="checkbox" name="' + opts.name + '"' + (opts.value ? ' checked' : '') +
        ' class="h-5 w-5 shrink-0 accent-blood-500" />' +
        '<span><span class="text-[0.95rem] font-bold">' + escapeHtml(opts.label) + '</span>' +
        (opts.hint ? '<span class="block text-[0.75rem] text-white/30">' + escapeHtml(opts.hint) + '</span>' : '') +
        '</span></label>'
      );
    }

    var preview = opts.preview ? ' data-preview="' + opts.preview + '"' : '';
    return (
      '<div class="' + span + '"><label class="label" for="f-' + opts.name + '">' +
      escapeHtml(opts.label) + (opts.required ? ' *' : '') + '</label>' +
      '<input id="f-' + opts.name + '" name="' + opts.name + '" type="' + (opts.type || 'text') +
      '" value="' + value + '" class="field"' + required + preview +
      ' placeholder="' + escapeHtml(opts.placeholder || '') + '" />' + hint + '</div>'
    );
  }

  function appForm(app) {
    app = app || {};
    var categoryValue = app.category ? app.category.slug || app.category : '';

    return (
      '<div class="grid gap-5 sm:grid-cols-2">' +
      field({ name: 'title', label: 'Title', value: app.title, required: true, placeholder: 'Godfather Player' }) +
      field({
        name: 'packageName',
        label: 'Package name',
        value: app.packageName,
        required: true,
        placeholder: 'com.example.app',
        hint: 'Must match the APK exactly — this drives Install vs. Update.',
      }) +
      field({
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        value: categoryValue,
        options: state.categories.map(function (category) {
          return { value: category.slug, label: (category.icon ? category.icon + '  ' : '') + category.name };
        }),
      }) +
      field({ name: 'version', label: 'Version', value: app.version, required: true, placeholder: '1.0.0' }) +
      field({
        name: 'versionCode',
        label: 'Version code',
        type: 'number',
        value: app.versionCode == null ? '' : app.versionCode,
        hint: 'Integer Android uses to gate upgrades. Recommended.',
      }) +
      field({ name: 'size', label: 'Size', value: app.size, placeholder: '38.4 MB' }) +
      field({
        name: 'apkUrl',
        label: 'APK URL',
        type: 'url',
        value: app.apkUrl,
        required: true,
        full: true,
        placeholder: 'https://drive.google.com/file/d/FILE_ID/view',
        hint: 'Any Google Drive share URL works — it is rewritten to a direct download. Share it as "Anyone with the link".',
      }) +
      field({
        name: 'imageUrl',
        label: 'Icon / poster URL',
        type: 'url',
        value: app.imageUrl,
        required: true,
        preview: 'preview-image',
        placeholder: 'https://…/poster.jpg',
      }) +
      field({
        name: 'bannerUrl',
        label: 'Banner URL',
        type: 'url',
        value: app.bannerUrl,
        preview: 'preview-banner',
        placeholder: 'https://…/banner.jpg',
      }) +
      '<div class="flex gap-4 sm:col-span-2">' +
      '<img id="preview-image" alt="" class="hidden h-28 w-[5.6rem] rounded-xl object-cover ring-1 ring-white/10" />' +
      '<img id="preview-banner" alt="" class="hidden h-28 flex-1 rounded-xl object-cover ring-1 ring-white/10" />' +
      '</div>' +
      field({
        name: 'description',
        label: 'Description',
        type: 'textarea',
        value: app.description,
        required: true,
        full: true,
        rows: 4,
      }) +
      field({
        name: 'releaseNotes',
        label: "What's new",
        type: 'textarea',
        value: app.releaseNotes,
        full: true,
        rows: 3,
        placeholder: '• Fixed the thing',
      }) +
      field({ name: 'featured', label: 'Featured', type: 'checkbox', value: !!app.featured, hint: 'Pinned to the top of the TV app.' }) +
      field({
        name: 'published',
        label: 'Published',
        type: 'checkbox',
        value: app.published === undefined ? true : !!app.published,
        hint: 'Unpublished apps are hidden from the TV app.',
      }) +
      '</div>'
    );
  }

  function categoryForm(category) {
    category = category || {};
    return (
      '<div class="grid gap-5 sm:grid-cols-2">' +
      field({ name: 'name', label: 'Name', value: category.name, required: true, placeholder: 'Streaming' }) +
      field({
        name: 'slug',
        label: 'Slug',
        value: category.slug,
        placeholder: 'streaming',
        hint: 'Leave blank to generate from the name.',
      }) +
      field({ name: 'icon', label: 'Icon', value: category.icon, placeholder: '▶', hint: 'A single emoji or glyph.' }) +
      field({
        name: 'order',
        label: 'Order',
        type: 'number',
        value: category.order == null ? 100 : category.order,
        hint: 'Lower numbers appear first.',
      }) +
      field({
        name: 'description',
        label: 'Description',
        type: 'textarea',
        value: category.description,
        full: true,
        rows: 2,
      }) +
      '</div>'
    );
  }

  /* -------- rendering -------- */

  function visibleApps() {
    var search = state.search.toLowerCase();
    return state.apps.filter(function (app) {
      if (state.filter && (!app.category || app.category.slug !== state.filter)) return false;
      if (!search) return true;
      return (
        app.title.toLowerCase().indexOf(search) >= 0 ||
        app.packageName.toLowerCase().indexOf(search) >= 0 ||
        (app.description || '').toLowerCase().indexOf(search) >= 0
      );
    });
  }

  function renderApps() {
    var list = visibleApps();
    var grid = el('apps-grid');
    var empty = el('apps-empty');

    el('count-apps').textContent = state.apps.length;

    if (!list.length) {
      grid.innerHTML = '';
      empty.textContent = state.apps.length
        ? 'No apps match that search.'
        : 'No apps yet — add your first one.';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = list
      .map(function (app) {
        var badges = '';
        if (app.featured)
          badges += '<span class="chip bg-gold-500/15 text-gold-300">★ Featured</span>';
        if (!app.published)
          badges += '<span class="chip bg-white/10 text-white/50">Hidden</span>';

        return (
          '<article class="card group flex flex-col overflow-hidden transition hover:border-white/20">' +
          '<div class="relative aspect-[5/6] overflow-hidden bg-ink-800">' +
          // No inline onerror handler: the CSP is script-src 'self', and an
          // attribute handler counts as inline script. Broken images are hidden
          // by the listener attached in hideBrokenImages() instead.
          '<img src="' + escapeHtml(app.imageUrl) + '" alt="" loading="lazy" data-fallback ' +
          'class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />' +
          '<div class="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/90 to-transparent p-3">' +
          badges + '</div></div>' +

          '<div class="flex flex-1 flex-col p-4">' +
          '<h3 class="truncate text-[1.02rem] font-extrabold tracking-tight">' + escapeHtml(app.title) + '</h3>' +
          '<p class="mt-1 truncate font-mono text-[0.74rem] text-white/30">' + escapeHtml(app.packageName) + '</p>' +

          '<div class="mt-3 flex flex-wrap items-center gap-2 text-[0.74rem] font-bold">' +
          '<span class="chip bg-blood-900/60 text-blood-200">v' + escapeHtml(app.version) + '</span>' +
          '<span class="chip bg-white/[0.06] text-white/50">' +
          escapeHtml((app.category && app.category.name) || '—') + '</span>' +
          (app.size ? '<span class="chip bg-white/[0.06] text-white/50">' + escapeHtml(app.size) + '</span>' : '') +
          '</div>' +

          '<div class="mt-4 flex gap-2 pt-1">' +
          '<button class="btn-ghost flex-1 !py-2 !text-[0.82rem]" data-edit-app="' + app.id + '">Edit</button>' +
          '<button class="btn-danger !px-3 !py-2 !text-[0.82rem]" data-delete-app="' + app.id + '" title="Delete">✕</button>' +
          '</div></div></article>'
        );
      })
      .join('');

    hideBrokenImages(grid);
  }

  /** Leaves the dark tile showing rather than a broken-image glyph. */
  function hideBrokenImages(root) {
    Array.prototype.forEach.call(root.querySelectorAll('img[data-fallback]'), function (image) {
      image.addEventListener('error', function () {
        image.classList.add('hidden');
      });
    });
  }

  function renderCategories() {
    var list = state.categories;
    el('count-categories').textContent = list.length;

    var container = el('categories-list');
    var empty = el('categories-empty');

    // Keep the Apps filter dropdown in step with the category list.
    var filter = el('app-filter');
    filter.innerHTML =
      '<option value="">All categories</option>' +
      list
        .map(function (category) {
          return '<option value="' + escapeHtml(category.slug) + '">' +
            escapeHtml(category.name) + ' (' + category.appCount + ')</option>';
        })
        .join('');
    filter.value = state.filter;

    if (!list.length) {
      container.innerHTML = '';
      empty.textContent = 'No categories yet — add one before adding apps.';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    container.innerHTML = list
      .map(function (category) {
        return (
          '<article class="card flex items-center gap-4 p-5">' +
          '<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[1.4rem]">' +
          escapeHtml(category.icon || '◆') + '</span>' +
          '<div class="min-w-0 flex-1">' +
          '<h3 class="truncate text-[1.02rem] font-extrabold tracking-tight">' + escapeHtml(category.name) + '</h3>' +
          '<p class="truncate text-[0.78rem] text-white/30">' + escapeHtml(category.slug) +
          ' · ' + category.appCount + ' app' + (category.appCount === 1 ? '' : 's') +
          ' · order ' + category.order + '</p>' +
          '</div>' +
          '<div class="flex shrink-0 gap-2">' +
          '<button class="btn-ghost !px-3 !py-2 !text-[0.8rem]" data-edit-category="' + category.id + '">Edit</button>' +
          '<button class="btn-danger !px-3 !py-2 !text-[0.8rem]" data-delete-category="' + category.id + '">✕</button>' +
          '</div></article>'
        );
      })
      .join('');
  }

  /* -------- data -------- */

  function reload() {
    // /admin/apps rather than /apps: the admin listing includes unpublished
    // records, and that must sit behind auth rather than a public query flag.
    return Promise.all([
      request('/categories'),
      request('/admin/apps?limit=200'),
    ]).then(function (results) {
      state.categories = results[0];
      state.apps = results[1];
      renderCategories();
      renderApps();
    });
  }

  /**
   * `clearable` lists optional fields that must be sent even when blank —
   * otherwise emptying a field in the form silently keeps the old value.
   * Everything else is omitted when blank so the server keeps its default.
   */
  function toPayload(values, clearable) {
    clearable = clearable || [];
    var payload = {};

    Object.keys(values).forEach(function (key) {
      var value = values[key];
      if (typeof value === 'boolean') {
        payload[key] = value; // checkboxes: false must persist
        return;
      }
      if (value === '' && clearable.indexOf(key) < 0) return;
      payload[key] = value;
    });

    if (values.versionCode !== '' && values.versionCode != null) {
      payload.versionCode = Number(values.versionCode);
    } else {
      delete payload.versionCode;
    }

    return payload;
  }

  var APP_CLEARABLE = ['bannerUrl', 'size', 'releaseNotes'];
  var CATEGORY_CLEARABLE = ['description', 'icon'];

  /* -------- actions -------- */

  el('add-app').addEventListener('click', function () {
    if (!state.categories.length) {
      return toast('Add a category first — every app needs one.', 'error');
    }
    openModal('New app', appForm(null), function (values) {
      return request('/admin/apps', { method: 'POST', body: toPayload(values, APP_CLEARABLE) })
        .then(reload)
        .then(function () {
          toast('App created.');
        });
    });
  });

  el('add-category').addEventListener('click', function () {
    openModal('New category', categoryForm(null), function (values) {
      return request('/admin/categories', { method: 'POST', body: toPayload(values, CATEGORY_CLEARABLE) })
        .then(reload)
        .then(function () {
          toast('Category created.');
        });
    });
  });

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-edit-app],[data-delete-app],[data-edit-category],[data-delete-category]');
    if (!target) return;

    var editApp = target.getAttribute('data-edit-app');
    var deleteApp = target.getAttribute('data-delete-app');
    var editCategory = target.getAttribute('data-edit-category');
    var deleteCategory = target.getAttribute('data-delete-category');

    if (editApp) {
      var app = state.apps.find(function (item) { return item.id === editApp; });
      if (!app) return;
      openModal('Edit ' + app.title, appForm(app), function (values) {
        return request('/admin/apps/' + app.id, { method: 'PUT', body: toPayload(values, APP_CLEARABLE) })
          .then(reload)
          .then(function () {
            toast('App updated.');
          });
      });
    }

    if (deleteApp) {
      var doomed = state.apps.find(function (item) { return item.id === deleteApp; });
      if (!doomed) return;
      confirmDialog('Delete ' + doomed.title + '?', 'This removes it from the TV app. It cannot be undone.').then(
        function (confirmed) {
          if (!confirmed) return;
          request('/admin/apps/' + doomed.id, { method: 'DELETE' })
            .then(reload)
            .then(function () {
              toast('App deleted.');
            })
            .catch(function (error) {
              toast(error.message, 'error');
            });
        }
      );
    }

    if (editCategory) {
      var category = state.categories.find(function (item) { return item.id === editCategory; });
      if (!category) return;
      openModal('Edit ' + category.name, categoryForm(category), function (values) {
        return request('/admin/categories/' + category.id, { method: 'PUT', body: toPayload(values, CATEGORY_CLEARABLE) })
          .then(reload)
          .then(function () {
            toast('Category updated.');
          });
      });
    }

    if (deleteCategory) {
      var target2 = state.categories.find(function (item) { return item.id === deleteCategory; });
      if (!target2) return;
      confirmDialog(
        'Delete ' + target2.name + '?',
        target2.appCount
          ? 'It still holds ' + target2.appCount + ' app(s). Move or delete them first.'
          : 'This category is empty and safe to remove.'
      ).then(function (confirmed) {
        if (!confirmed) return;
        request('/admin/categories/' + target2.id, { method: 'DELETE' })
          .then(reload)
          .then(function () {
            toast('Category deleted.');
          })
          .catch(function (error) {
            toast(error.message, 'error');
          });
      });
    }
  });

  el('app-search').addEventListener('input', function () {
    state.search = this.value;
    renderApps();
  });

  el('app-filter').addEventListener('change', function () {
    state.filter = this.value;
    renderApps();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (button) {
    button.addEventListener('click', function () {
      state.tab = button.getAttribute('data-tab');
      Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (other) {
        other.classList.toggle('tab-active', other === button);
      });
      el('panel-apps').classList.toggle('hidden', state.tab !== 'apps');
      el('panel-categories').classList.toggle('hidden', state.tab !== 'categories');
    });
  });

  el('logout').addEventListener('click', function () {
    request('/auth/logout', { method: 'POST' })
      .catch(function () {})
      .then(function () {
        location.replace(LOGIN_URL);
      });
  });

  /* -------- boot -------- */

  request('/auth/me')
    .then(function (data) {
      el('user-email').textContent = data.user.email;
      shell.classList.remove('hidden');
      document.querySelector('[data-tab="apps"]').classList.add('tab-active');
      return reload();
    })
    .catch(function (error) {
      if (error.status === 401) return location.replace(LOGIN_URL);
      document.body.innerHTML =
        '<div class="flex min-h-screen items-center justify-center p-8 text-center">' +
        '<p class="max-w-md text-[1rem] text-white/60">' + escapeHtml(error.message) + '</p></div>';
    });
})();
