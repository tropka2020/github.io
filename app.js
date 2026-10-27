/* AMD plus: dependency-free progressive enhancement. Load after services.js with defer. */
(() => {
  'use strict';

  function init() {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const sourceOrigin = 'https://amdplus.ru';
    const consultationURL = `${sourceOrigin}/konsultaciya`;
    const services = Array.isArray(window.AMD_SERVICES)
      ? window.AMD_SERVICES.filter(service => service && typeof service.id === 'string'
        && typeof service.title === 'string' && typeof service.description === 'string'
        && ['body', 'interior', 'restoration'].includes(service.category)
        && Array.isArray(service.details) && typeof service.path === 'string'
        && /^\/(?!\/)[a-z0-9/-]+$/.test(service.path))
      : [];
    const byId = new Map(services.map(service => [service.id, service]));
    const normalize = value => String(value || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
    const searchText = new Map(services.map(service => [service.id,
      normalize([service.title, service.description, ...service.details,
        ...(Array.isArray(service.searchAliases) ? service.searchAliases.filter(alias => typeof alias === 'string') : [])
      ].join(' '))]));
    const matches = (service, query) => query.split(/\s+/).filter(Boolean)
      .every(word => searchText.get(service.id).includes(word));
    const status = $('#app-status');
    function announce(message) {
      if (!status) return;
      status.hidden = false;
      status.textContent = message;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const animations = new Map();
    function stopAnimation(element) {
      const animation = animations.get(element);
      if (animation) {
        animation.cancel();
        animations.delete(element);
      }
    }
    function animate(element, frames, options) {
      if (!element || motionQuery.matches || typeof element.animate !== 'function') return;
      stopAnimation(element);
      const animation = element.animate(frames, { ...options, fill: 'none' });
      animations.set(element, animation);
      const forget = () => {
        if (animations.get(element) === animation) animations.delete(element);
      };
      animation.addEventListener('finish', forget, { once: true });
      animation.addEventListener('cancel', forget, { once: true });
    }

    // One modal at a time; a modal-to-modal handoff keeps the original page opener.
    let activeDialog = null;
    let returnFocus = null;
    let closeMenu = () => {};
    function focusElement(element) {
      if (element instanceof HTMLElement && element.isConnected
        && !element.closest('[hidden], [inert]') && element.getClientRects().length) {
        element.focus({ preventScroll: true });
      }
    }
    function openDialog(dialog, opener, initialFocus) {
      if (!dialog || typeof dialog.showModal !== 'function') {
        announce('Окно недоступно в этом браузере. Консультация: amdplus.ru/konsultaciya.');
        return false;
      }
      if (activeDialog === dialog && dialog.open) return true;
      let origin = activeDialog ? returnFocus : (opener || document.activeElement);
      // A navigation item becomes hidden when the mobile menu closes.
      if (origin && origin.closest && origin.closest('#site-nav')
        && $('[data-menu-toggle]')?.getAttribute('aria-expanded') === 'true') {
        origin = $('[data-menu-toggle]') || origin;
      }
      closeMenu(false);
      if (activeDialog && activeDialog.open) activeDialog.close();
      activeDialog = dialog;
      returnFocus = origin;
      dialog.showModal();
      document.documentElement.classList.add('has-modal');
      focusElement(initialFocus || $('[autofocus]', dialog)
        || $('input, select, textarea, button, a[href], [tabindex="0"]', dialog));
      return true;
    }
    $$('dialog').forEach(dialog => {
      let backdropPointer = false;
      const outside = event => {
        const rect = dialog.getBoundingClientRect();
        return event.clientX < rect.left || event.clientX > rect.right
          || event.clientY < rect.top || event.clientY > rect.bottom;
      };
      dialog.addEventListener('pointerdown', event => {
        backdropPointer = event.target === dialog && outside(event);
      });
      dialog.addEventListener('pointercancel', () => { backdropPointer = false; });
      dialog.addEventListener('click', event => {
        if (backdropPointer && event.target === dialog && outside(event)) dialog.close();
        backdropPointer = false;
      });
      dialog.addEventListener('close', () => {
        if (activeDialog !== dialog || dialog.open) return;
        const target = returnFocus;
        activeDialog = null;
        returnFocus = null;
        document.documentElement.classList.remove('has-modal');
        requestAnimationFrame(() => {
          if (!activeDialog) focusElement(target);
        });
      });
      // Native Escape/cancel behaviour is deliberately not intercepted.
    });
    document.addEventListener('click', event => {
      const closer = event.target.closest('[data-close-dialog]');
      if (!closer) return;
      const dialog = closer.closest('dialog');
      if (dialog && dialog.open) {
        event.preventDefault();
        dialog.close();
      }
    });

    // The designer controls the menu breakpoint by hiding/showing its toggle.
    const nav = $('#site-nav');
    const menuToggle = $('[data-menu-toggle]');
    if (nav && menuToggle) {
      let menuOpen = false;
      const compactMenu = () => getComputedStyle(menuToggle).display !== 'none'
        && menuToggle.getClientRects().length > 0;
      const navItems = () => $$('a[href], button:not([disabled]), [tabindex="0"]', nav)
        .filter(item => item.getClientRects().length && !item.closest('[hidden], [inert]'));
      function setMenu(open, restoreFocus = false) {
        menuOpen = Boolean(open && compactMenu());
        menuToggle.setAttribute('aria-expanded', String(menuOpen));
        menuToggle.setAttribute('aria-label', menuOpen ? 'Закрыть меню' : 'Открыть меню');
        menuToggle.setAttribute('aria-controls', 'site-nav');
        nav.hidden = compactMenu() && !menuOpen;
        nav.classList.toggle('is-open', menuOpen);
        document.documentElement.classList.toggle('menu-open', menuOpen);
        if (restoreFocus) focusElement(menuToggle);
      }
      closeMenu = restoreFocus => setMenu(false, restoreFocus);
      menuToggle.addEventListener('click', () => {
        setMenu(!menuOpen);
        if (menuOpen) focusElement(navItems()[0]);
      });
      nav.addEventListener('click', event => {
        if (event.target.closest('a[href]')) closeMenu(true);
      });
      document.addEventListener('pointerdown', event => {
        if (menuOpen && !nav.contains(event.target) && !menuToggle.contains(event.target)) {
          closeMenu(nav.contains(document.activeElement));
        }
      });
      document.addEventListener('keydown', event => {
        if (!menuOpen || activeDialog) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu(true);
        } else if (event.key === 'Tab') {
          const items = [menuToggle, ...navItems()];
          const index = items.indexOf(document.activeElement);
          if (event.shiftKey && index <= 0) {
            event.preventDefault();
            focusElement(items[items.length - 1]);
          } else if (!event.shiftKey && (index === items.length - 1 || index < 0)) {
            event.preventDefault();
            focusElement(menuToggle);
          }
        }
      });
      let resizeFrame = 0;
      window.addEventListener('resize', () => {
        if (resizeFrame) return;
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = 0;
          const focusWasInNav = nav.contains(document.activeElement);
          setMenu(menuOpen);
          if (nav.hidden && focusWasInNav) focusElement(menuToggle);
        });
      }, { passive: true });
      setMenu(false);
    }

    const estimateDialog = $('#estimate-dialog');
    const estimateSelect = $('#estimate-service');
    const estimateMessage = $('#estimate-message');
    const estimateHandoff = $('#estimate-handoff');
    const directions = {
      protect: 'Защитить кузов: плёнка и защитные покрытия.',
      restore: 'Восстановить интерьер: ремонт, окраска и перетяжка.',
      care: 'Уход за автомобилем: полировка кузова и химчистка салона.'
    };
    let activeDirection = 'protect';
    let selectedService = '';
    if (estimateSelect && services.length) {
      const fragment = document.createDocumentFragment();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Помогите выбрать услугу';
      fragment.append(placeholder);
      services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.title;
        fragment.append(option);
      });
      estimateSelect.replaceChildren(fragment);
    }
    if (estimateHandoff) {
      estimateHandoff.href = consultationURL;
      // No message, personal data, or fabricated submission is sent in the URL.
      if (estimateHandoff.target === '_blank') estimateHandoff.rel = 'noopener noreferrer';
    }
    if (estimateMessage) {
      estimateMessage.setAttribute('aria-describedby',
        [...new Set(`${estimateMessage.getAttribute('aria-describedby') || ''} estimate-local-note`
          .trim().split(/\s+/))].join(' '));
      if (!$('#estimate-local-note') && estimateMessage.parentNode) {
        const note = document.createElement('p');
        note.id = 'estimate-local-note';
        note.className = 'estimate-local-note';
        note.textContent = 'Текст остаётся только в этом окне и не отправляется. '
          + 'Скопируйте его перед переходом на сайт AMD plus. Фотографии можно передать после согласования со специалистом.';
        estimateMessage.insertAdjacentElement('afterend', note);
      }
    }
    function updateEstimateSummary() {
      const service = byId.get(selectedService);
      const summary = service
        ? `Выбранная услуга: ${service.title}. ${service.description}`
        : directions[activeDirection];
      $$('[data-estimate-summary]').forEach(element => { element.textContent = summary; });
    }
    function resolveService(value) {
      return byId.get(value) || services.find(service => service.path === value || service.title === value);
    }
    function openEstimate(value, opener) {
      const service = resolveService(value);
      if (service) selectedService = service.id;
      if (estimateSelect) estimateSelect.value = selectedService;
      updateEstimateSummary();
      return openDialog(estimateDialog, opener, estimateSelect);
    }
    if (estimateSelect) estimateSelect.addEventListener('change', () => {
      selectedService = byId.has(estimateSelect.value) ? estimateSelect.value : '';
      updateEstimateSummary();
    });
    // An estimate is a local brief, not a form endpoint. Never submit it implicitly.
    if (estimateDialog) $$('form', estimateDialog).forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        announce('Заявка не отправлена. Для консультации перейдите на сайт AMD plus по ссылке в окне.');
      });
    });
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-estimate]');
      if (!trigger) return;
      if (openEstimate(trigger.dataset.service, trigger)) event.preventDefault();
    });

    const serviceDialog = $('#service-dialog');
    const serviceTitle = $('#service-title');
    const serviceDescription = $('#service-description');
    const serviceDetails = $('#service-details');
    const serviceSource = $('#service-source');
    const serviceEstimate = $('#service-estimate');
    let currentService = null;
    function openService(id, opener) {
      const service = byId.get(id);
      if (!service || !serviceDialog) return false;
      currentService = service;
      if (serviceTitle) serviceTitle.textContent = service.title;
      if (serviceDescription) serviceDescription.textContent = service.description;
      if (serviceDetails) {
        const list = serviceDetails.tagName === 'UL' ? serviceDetails : document.createElement('ul');
        const fragment = document.createDocumentFragment();
        service.details.forEach(detail => {
          const item = document.createElement('li');
          item.textContent = String(detail);
          fragment.append(item);
        });
        list.replaceChildren(fragment);
        if (list !== serviceDetails) serviceDetails.replaceChildren(list);
      }
      if (serviceSource) {
        serviceSource.href = sourceOrigin + service.path;
        if (!serviceSource.textContent.trim()) serviceSource.textContent = 'Услуга на сайте AMD plus';
        if (serviceSource.target === '_blank') serviceSource.rel = 'noopener noreferrer';
      }
      if (serviceEstimate) serviceEstimate.dataset.service = service.id;
      if (serviceTitle) {
        serviceTitle.tabIndex = -1;
        serviceDialog.setAttribute('aria-labelledby', 'service-title');
      }
      if (serviceDescription) serviceDialog.setAttribute('aria-describedby', 'service-description');
      return openDialog(serviceDialog, opener, serviceTitle);
    }
    if (serviceEstimate) serviceEstimate.addEventListener('click', event => {
      // A button may also carry the generic data-estimate hook.
      event.preventDefault();
      event.stopPropagation();
      if (currentService) openEstimate(currentService.id, serviceEstimate);
    });

    function serviceButton(service, index, className) {
      const button = document.createElement('a');
      button.href = `service.html?id=${encodeURIComponent(service.id)}`;
      button.className = className;
      button.dataset.serviceId = service.id;
      const number = document.createElement('span');
      number.className = 'service-card-number';
      number.textContent = String(index + 1).padStart(2, '0');
      number.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span');
      title.className = 'service-card-title';
      title.textContent = service.title;
      const description = document.createElement('span');
      description.className = 'service-card-description';
      description.textContent = service.description;
      const arrow = document.createElement('span');
      arrow.className = 'service-card-arrow';
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(number, title, description, arrow);
      return button;
    }
    const catalogGrid = $('#catalog-grid');
    const catalogSearch = $('#catalog-search');
    const catalogCount = $('#catalog-count');
    const catalogEmpty = $('#catalog-empty');
    const categoryButtons = $$('button[data-category]');
    const validCategories = ['all', 'body', 'interior', 'restoration'];
    let category = 'all';
    function renderCatalog(shouldAnnounce = false) {
      if (!catalogGrid || !services.length) return;
      const query = normalize(catalogSearch ? catalogSearch.value : '');
      const filtered = services.filter(service => (category === 'all' || category === service.category)
        && matches(service, query));
      const fragment = document.createDocumentFragment();
      filtered.forEach(service => {
        fragment.append(serviceButton(service, services.indexOf(service), 'service-card'));
      });
      catalogGrid.replaceChildren(fragment);
      const count = `Найдено: ${filtered.length} из ${services.length}`;
      if (catalogCount) catalogCount.textContent = count;
      if (catalogEmpty) {
        catalogEmpty.hidden = filtered.length !== 0;
        if (!filtered.length && !$('[data-catalog-reset]', catalogEmpty)) {
          const reset = document.createElement('button');
          reset.type = 'button';
          reset.className = 'text-link';
          reset.dataset.catalogReset = '';
          reset.textContent = 'Сбросить поиск и фильтры';
          catalogEmpty.append(document.createTextNode(' '), reset);
        }
      }
      categoryButtons.forEach(button => {
        const selected = button.dataset.category === category;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      });
      if (shouldAnnounce) announce(count);
    }
    if (catalogSearch) catalogSearch.addEventListener('input', () => renderCatalog(true));
    categoryButtons.forEach(button => button.addEventListener('click', () => {
      if (!validCategories.includes(button.dataset.category)) return;
      category = button.dataset.category;
      renderCatalog(true);
    }));
    // Optional reset hook; native form reset and search Escape work without it.
    function resetCatalog() {
      category = 'all';
      if (catalogSearch) catalogSearch.value = '';
      renderCatalog(true);
      focusElement(catalogSearch);
    }
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-catalog-reset]')) return;
      event.preventDefault();
      resetCatalog();
    });
    if (catalogSearch) {
      catalogSearch.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !catalogSearch.value) return;
        event.preventDefault();
        catalogSearch.value = '';
        renderCatalog(true);
      });
      if (catalogSearch.form) catalogSearch.form.addEventListener('reset', () => {
        category = 'all';
        // Let native defaultValue restoration finish first.
        queueMicrotask(() => renderCatalog(true));
      });
      if (catalogSearch.form) catalogSearch.form.addEventListener('submit', event => event.preventDefault());
    }
    if (catalogGrid) catalogGrid.addEventListener('click', event => {
      const button = event.target.closest('button[data-service-id]');
      if (button && catalogGrid.contains(button)) openService(button.dataset.serviceId, button);
    });
    renderCatalog();

    const searchDialog = $('#search-dialog');
    const globalSearch = $('#global-search');
    const searchResults = $('#search-results');
    function renderSearch() {
      if (!searchResults || !services.length) return;
      const query = normalize(globalSearch ? globalSearch.value : '');
      const filtered = services.filter(service => matches(service, query));
      const fragment = document.createDocumentFragment();
      const count = document.createElement('p');
      count.className = 'search-results-count';
      count.setAttribute('role', 'status');
      count.textContent = filtered.length
        ? `Найдено услуг: ${filtered.length}`
        : 'Ничего не найдено. Попробуйте другое название услуги.';
      fragment.append(count);
      filtered.forEach(service => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result';
        button.dataset.serviceId = service.id;
        button.setAttribute('aria-haspopup', 'dialog');
        const label = document.createElement('span');
        label.textContent = service.title;
        const description = document.createElement('span');
        description.className = 'search-result-label';
        description.textContent = service.description;
        button.append(label, description);
        fragment.append(button);
      });
      searchResults.replaceChildren(fragment);
    }
    $$('[data-search-open]').forEach(button => button.addEventListener('click', event => {
      renderSearch();
      if (openDialog(searchDialog, button, globalSearch)) event.preventDefault();
    }));
    if (globalSearch) {
      globalSearch.addEventListener('input', renderSearch);
      globalSearch.setAttribute('aria-controls', 'search-results');
      if (globalSearch.form) {
        globalSearch.form.addEventListener('submit', event => event.preventDefault());
        globalSearch.form.addEventListener('reset', () => queueMicrotask(renderSearch));
      }
      // Results remain native buttons, not a partially implemented ARIA combobox.
      globalSearch.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' && searchResults) {
          const first = $('button[data-service-id]', searchResults);
          if (first) {
            event.preventDefault();
            focusElement(first);
          }
        }
      });
    }
    if (searchResults) {
      searchResults.addEventListener('click', event => {
        const button = event.target.closest('button[data-service-id]');
        if (button && searchResults.contains(button)) openService(button.dataset.serviceId, button);
      });
      searchResults.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        const buttons = $$('button[data-service-id]', searchResults);
        const index = buttons.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        if (event.key === 'ArrowUp' && index === 0) return focusElement(globalSearch);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
        focusElement(buttons[next]);
      });
    }

    const tabList = $('#direction-tabs');
    const tabs = tabList ? $$('button[data-direction]', tabList)
      .filter(tab => Object.hasOwn(directions, tab.dataset.direction)) : [];
    const panels = $$('[data-direction-panel]');
    function activateDirection(direction, moveFocus = false, withAnimation = true) {
      const nextTab = tabs.find(tab => tab.dataset.direction === direction);
      const nextPanel = panels.find(panel => panel.dataset.directionPanel === direction);
      if (!nextTab || !nextPanel) return;
      activeDirection = direction;
      tabs.forEach(tab => {
        const selected = tab === nextTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.classList.toggle('is-active', selected);
      });
      panels.forEach(panel => {
        stopAnimation(panel);
        panel.hidden = panel !== nextPanel;
        panel.classList.toggle('is-active', panel === nextPanel);
      });
      updateEstimateSummary();
      if (moveFocus) focusElement(nextTab);
      if (withAnimation) animate(nextPanel, [
        { opacity: 0.45, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    if (tabList && tabs.length) {
      tabList.setAttribute('role', 'tablist');
      tabs.forEach((tab, index) => {
        const panel = panels.find(item => item.dataset.directionPanel === tab.dataset.direction);
        if (!panel) return;
        if (!tab.id) tab.id = `direction-tab-${index + 1}`;
        if (!panel.id) panel.id = `direction-panel-${index + 1}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;
        tab.addEventListener('click', () => activateDirection(tab.dataset.direction));
        tab.addEventListener('keydown', event => {
          const vertical = tabList.getAttribute('aria-orientation') === 'vertical';
          const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft';
          const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
          if (![previousKey, nextKey, 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
            : (index + (event.key === nextKey ? 1 : -1) + tabs.length) % tabs.length;
          activateDirection(tabs[nextIndex].dataset.direction, true);
        });
      });
      const initial = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0];
      activateDirection(initial.dataset.direction, false, false);
    }
    updateEstimateSummary();

    const works = {
      prado: {
        title: 'Toyota Land Cruiser Prado',
        image: 'assets/prado.jpg',
        caption: 'Материалы AMD plus: восстановление элементов салона Toyota Land Cruiser Prado.'
      },
      bmw: {
        title: 'BMW 750',
        image: 'assets/bmw.jpg',
        caption: 'Материалы AMD plus: покраска сиденья BMW 750.'
      },
      retro: {
        title: 'Реставрация ретроавтомобиля',
        image: 'assets/retro.jpg',
        caption: 'Материалы AMD plus: интерьер ретроавтомобиля.'
      }
    };
    const workDialog = $('#work-dialog');
    const workImage = $('#work-image');
    const workCaption = $('#work-caption');
    const workTitle = $('#work-title');
    $$('[data-work]').forEach(button => button.addEventListener('click', event => {
      const work = works[button.dataset.work];
      if (!work || !workDialog) return;
      if (workImage) {
        workImage.src = work.image;
        workImage.alt = work.caption;
      }
      if (workCaption) workCaption.textContent = work.caption;
      if (workTitle) {
        workTitle.textContent = work.title;
        workTitle.tabIndex = -1;
        workDialog.setAttribute('aria-labelledby', 'work-title');
      }
      if (workCaption) workDialog.setAttribute('aria-describedby', 'work-caption');
      if (openDialog(workDialog, button, workTitle)) event.preventDefault();
    }));

    const stateButtons = $$('button[data-work-state]')
      .filter(button => ['before', 'after'].includes(button.dataset.workState));
    const resultImage = $('#result-image');
    const resultCaption = $('#result-caption');
    function setWorkState(state, moveFocus = false) {
      if (!resultImage) return;
      const before = state === 'before';
      resultImage.src = `assets/prado-${before ? 'before' : 'after'}.jpg`;
      resultImage.alt = `Toyota Land Cruiser Prado: сиденье ${before ? 'до' : 'после'} восстановления.`;
      if (resultCaption) resultCaption.textContent = `${before ? 'До' : 'После'} восстановления. `
        + 'Фотографии сняты с разных ракурсов: это два отдельных кадра, а не совмещённый слайдер.';
      stateButtons.forEach(button => {
        const selected = button.dataset.workState === state;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      });
      if (moveFocus) focusElement(stateButtons.find(button => button.dataset.workState === state));
    }
    stateButtons.forEach((button, index) => {
      button.addEventListener('click', () => setWorkState(button.dataset.workState));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? stateButtons[0]
          : event.key === 'End' ? stateButtons[stateButtons.length - 1]
            : stateButtons[(index + (event.key === 'ArrowRight' ? 1 : -1)
              + stateButtons.length) % stateButtons.length];
        setWorkState(next.dataset.workState, true);
      });
    });
    if (stateButtons.length && resultImage) {
      const initial = stateButtons.find(button => button.getAttribute('aria-pressed') === 'true')
        || stateButtons.find(button => button.classList.contains('is-active')) || stateButtons[0];
      setWorkState(initial.dataset.workState);
    }

    // Addressable service and case pages render from the same data as the dialogs.
    const categoryNames = { body: 'Кузов', interior: 'Салон', restoration: 'Реставрация' };
    function readParam(name) {
      try { return new URLSearchParams(window.location.search).get(name); }
      catch (error) { return null; }
    }
    const servicePage = $('[data-service-page]');
    if (servicePage) {
      const service = byId.get(readParam('id'));
      const titleNode = $('#page-service-title');
      const descNode = $('#page-service-description');
      const detailsNode = $('#page-service-details');
      const sourceNode = $('#page-service-source');
      const estimateNode = $('#page-service-estimate');
      const categoryNode = $('#page-service-category');
      if (!service) {
        if (titleNode) titleNode.textContent = 'Услуга не найдена';
        if (descNode) descNode.textContent = 'Выберите услугу в каталоге — покажем подробности.';
        if (detailsNode) detailsNode.hidden = true;
        [estimateNode, sourceNode].forEach(node => { if (node) node.hidden = true; });
        const back = $('[data-service-fallback]', servicePage);
        if (back) back.hidden = false;
      } else {
        document.title = `${service.title} — AMD plus`;
        if (titleNode) titleNode.textContent = service.title;
        if (descNode) descNode.textContent = service.description;
        if (categoryNode) categoryNode.textContent = categoryNames[service.category] || 'Услуга';
        if (detailsNode) {
          const fragment = document.createDocumentFragment();
          service.details.forEach(detail => {
            const item = document.createElement('li');
            item.textContent = String(detail);
            fragment.append(item);
          });
          detailsNode.replaceChildren(fragment);
        }
        if (sourceNode) {
          sourceNode.href = sourceOrigin + service.path;
          sourceNode.rel = 'noopener';
        }
        if (estimateNode) estimateNode.dataset.service = service.id;
      }
    }

    const casePage = $('[data-case-page]');
    if (casePage) {
      const cases = {
        prado: {
          title: 'Toyota Land Cruiser Prado',
          category: 'Восстановление кожи',
          before: 'assets/prado-before.jpg',
          after: 'assets/prado-after.jpg',
          caption: 'Фотографии сняты с разных ракурсов: это отдельные кадры, а не совмещённый слайдер.',
          brief: [
            ['Материал', 'Кожа сиденья'],
            ['Задача', 'Восстановление и окраска'],
            ['Результат', 'Восстановленная поверхность кожи — на фото «после»']
          ]
        },
        bmw: {
          title: 'BMW 750',
          category: 'Покраска сиденья',
          before: 'assets/bmw.jpg',
          after: 'assets/bmw.jpg',
          caption: 'Архивная фотография работы с кожаным сиденьем BMW 750.',
          brief: [
            ['Материал', 'Кожа сиденья'],
            ['Задача', 'Локальная работа с повреждённым участком']
          ]
        },
        retro: {
          title: 'Реставрация ретроавтомобиля',
          category: 'Интерьер',
          before: 'assets/retro.jpg',
          after: 'assets/retro.jpg',
          caption: 'Архивная фотография интерьера ретроавтомобиля.',
          brief: [
            ['Материал', 'Кожа и дерево'],
            ['Задача', 'Восстановление элементов интерьера']
          ]
        }
      };
      const current = cases[readParam('work')] || cases.prado;
      document.title = `${current.title} — работы AMD plus`;
      const titleNode = $('#case-title');
      const imageNode = $('#case-image');
      const captionNode = $('#case-caption');
      const categoryNode = $('#case-category');
      const briefNode = $('#case-brief');
      let state = 'before';
      function renderCase(moveFocus) {
        const before = state === 'before';
        if (imageNode) {
          imageNode.src = before ? current.before : current.after;
          imageNode.alt = `${current.title}: ${before ? 'до' : 'после'} работы ателье.`;
        }
        if (captionNode) captionNode.textContent = `${before ? 'До' : 'После'}. ${current.caption}`;
        $$('button[data-case-state]', casePage).forEach(button => {
          const selected = button.dataset.caseState === state;
          button.setAttribute('aria-pressed', String(selected));
          button.classList.toggle('is-active', selected);
          if (moveFocus && selected) focusElement(button);
        });
      }
      if (titleNode) titleNode.textContent = current.title;
      if (categoryNode) categoryNode.textContent = current.category;
      if (briefNode) {
        const fragment = document.createDocumentFragment();
        current.brief.forEach(([term, value]) => {
          const row = document.createElement('div');
          const dt = document.createElement('dt');
          dt.textContent = term;
          const dd = document.createElement('dd');
          dd.textContent = value;
          row.append(dt, dd);
          fragment.append(row);
        });
        briefNode.replaceChildren(fragment);
      }
      $$('button[data-case-state]', casePage).forEach(button =>
        button.addEventListener('click', () => { state = button.dataset.caseState; renderCase(); }));
      renderCase();
    }

    // Home and catalog category links scroll to or preselect a catalog group.
    function applyCategoryFromHash() {
      const hash = (window.location.hash || '').replace('#', '');
      const map = { body: 'body', interior: 'interior', care: 'restoration', restoration: 'restoration' };
      if (!map[hash] || !categoryButtons.length) return;
      category = map[hash];
      renderCatalog(true);
    }
    if (catalogGrid) {
      applyCategoryFromHash();
      window.addEventListener('hashchange', applyCategoryFromHash);
    }

    // Scroll-reveal for any [data-animate] element and a condensed header on scroll.
    const header = $('.site-header');
    if (header && !motionQuery.matches) {
      let headerFrame = 0;
      const syncHeader = () => {
        headerFrame = 0;
        header.classList.toggle('is-scrolled', (window.scrollY || 0) > 40);
      };
      window.addEventListener('scroll', () => {
        if (!headerFrame) headerFrame = requestAnimationFrame(syncHeader);
      }, { passive: true });
      syncHeader();
    }
    const animateTargets = $$('[data-animate]');
    if (animateTargets.length) {
      if (motionQuery.matches) {
        animateTargets.forEach(element => element.classList.add('is-visible'));
      } else {
        let pending = animateTargets.slice();
        let revealFrame = 0;
        const revealCheck = () => {
          revealFrame = 0;
          const limit = window.innerHeight * 0.9;
          pending = pending.filter(element => {
            if (element.getBoundingClientRect().top <= limit) {
              element.classList.add('is-visible');
              return false;
            }
            return true;
          });
          if (!pending.length) {
            window.removeEventListener('scroll', scheduleReveal);
            window.removeEventListener('resize', scheduleReveal);
          }
        };
        function scheduleReveal() {
          if (!revealFrame) revealFrame = requestAnimationFrame(revealCheck);
        }
        window.addEventListener('scroll', scheduleReveal, { passive: true });
        window.addEventListener('resize', scheduleReveal, { passive: true });
        revealCheck();
      }
    }

    // Effects only decorate already visible content; no opacity:0 baseline or scroll interception.
    const hero = $('[data-hero]');
    const heroPhoto = $('[data-hero-photo]');
    const heroType = $('[data-hero-type]');
    const progress = $('[data-progress]');
    const revealElements = $$('[data-reveal]');
    const revealed = new WeakSet();
    let heroVisible = true;
    let scrollFrame = 0;
    let pointerFrame = 0;
    let pointerPosition = null;
    let heroIntroDone = false;
    const lightMotion = () => !motionQuery.matches && !mobileQuery.matches && !document.hidden;
    function resetHeroMotion() {
      if (heroPhoto) {
        heroPhoto.style.setProperty('--hero-shift', '0px');
        heroPhoto.style.setProperty('--hero-scale', '1');
      }
      if (hero) {
        hero.style.removeProperty('--pointer-x');
        hero.style.removeProperty('--pointer-y');
      }
    }
    function updateScroll() {
      scrollFrame = 0;
      if (document.hidden) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = range > 0 ? Math.max(0, Math.min(1, scrollTop / range)) : 0;
      if (progress) {
        progress.style.setProperty('--page-progress', String(fraction));
        progress.style.transform = `scaleX(${fraction})`;
        progress.style.transformOrigin = 'left center';
        progress.setAttribute('aria-hidden', 'true');
      }
      if (hero && heroPhoto && heroVisible && lightMotion()) {
        const rect = hero.getBoundingClientRect();
        const travel = Math.max(-1, Math.min(1, -rect.top / Math.max(rect.height, 1)));
        heroPhoto.style.setProperty('--hero-shift', `${(travel * 46).toFixed(2)}px`);
        heroPhoto.style.setProperty('--hero-scale', (1.035 + Math.abs(travel) * 0.025).toFixed(4));
      }
    }
    function scheduleScroll() {
      if (!scrollFrame && !document.hidden) scrollFrame = requestAnimationFrame(updateScroll);
    }
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll, { passive: true });
    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(scheduleScroll);
      resizeObserver.observe(document.documentElement);
      if (document.body) resizeObserver.observe(document.body);
    }
    function reveal(element) {
      if (revealed.has(element)) return;
      revealed.add(element);
      if (!motionQuery.matches && !document.hidden) animate(element, [
        { opacity: 0.35, transform: `translateY(${mobileQuery.matches ? 12 : 28}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: mobileQuery.matches ? 360 : 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    if (typeof IntersectionObserver === 'function') {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      revealElements.forEach(element => revealObserver.observe(element));
      if (hero) {
        const heroObserver = new IntersectionObserver(entries => {
          heroVisible = entries[0].isIntersecting;
          if (!heroVisible) {
            stopAnimation(heroPhoto);
            stopAnimation(heroType);
          }
          scheduleScroll();
        });
        heroObserver.observe(hero);
      }
    }
    function heroIntro() {
      if (heroIntroDone || !hero || !heroVisible || document.hidden) return;
      heroIntroDone = true;
      if (motionQuery.matches) return;
      // Animate the image's crop, not its transform: CSS owns the scroll transform.
      if (!mobileQuery.matches) animate(heroPhoto, [
        { clipPath: 'inset(0 8% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }
      ], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' });
      animate(heroType, [
        { opacity: 0.4, transform: `translateY(${mobileQuery.matches ? 14 : 42}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: mobileQuery.matches ? 420 : 900, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(heroIntro, heroIntro);
    if (hero) {
      hero.addEventListener('pointermove', event => {
        if (!lightMotion() || !heroVisible || event.pointerType === 'touch') return;
        pointerPosition = { x: event.clientX, y: event.clientY };
        if (pointerFrame) return;
        pointerFrame = requestAnimationFrame(() => {
          pointerFrame = 0;
          if (!pointerPosition || !lightMotion() || !heroVisible) return;
          const rect = hero.getBoundingClientRect();
          hero.style.setProperty('--pointer-x', `${(pointerPosition.x - rect.left).toFixed(1)}px`);
          hero.style.setProperty('--pointer-y', `${(pointerPosition.y - rect.top).toFixed(1)}px`);
        });
      }, { passive: true });
      hero.addEventListener('pointerleave', () => {
        pointerPosition = null;
        hero.style.removeProperty('--pointer-x');
        hero.style.removeProperty('--pointer-y');
      });
    }
    function onMotionChange() {
      animations.forEach(animation => animation.cancel());
      animations.clear();
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      pointerPosition = null;
      resetHeroMotion();
      scheduleScroll();
    }
    motionQuery.addEventListener('change', onMotionChange);
    mobileQuery.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        animations.forEach(animation => animation.cancel());
        animations.clear();
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        if (pointerFrame) cancelAnimationFrame(pointerFrame);
        scrollFrame = 0;
        pointerFrame = 0;
      } else {
        scheduleScroll();
        fontsReady.then(heroIntro, heroIntro);
      }
    });
    resetHeroMotion();
    scheduleScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
