(() => {
  'use strict';
  const dataNode = document.getElementById('project-data');
  if (!dataNode) return;
  const projects = JSON.parse(dataNode.textContent);
  const byId = new Map(projects.map(project => [project.id, project]));
  const layers = {agent: 'Agent layer', runtime: 'Runtime layer', shared: 'Shared infrastructure'};
  const styles = {
    industrial: {name: '精密工业风', color: '#f3f5f7', palette: '雾白、铂银、石墨黑、冷蓝'},
    editorial: {name: '银色编辑风', color: '#fcfcfd', palette: '纯白、银灰、墨黑'},
    nocturne: {name: '深色金属风', color: '#10151b', palette: '深石墨、亮银、冰蓝'}
  };
  const state = {selected: 'a4aa', filter: 'all', query: '', style: 'industrial', themePreference: document.documentElement.dataset.themePreference || 'system'};
  const details = [...document.querySelectorAll('[data-project-row]')];
  const selectors = [...document.querySelectorAll('[data-select-project]')];
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const styleButtons = [...document.querySelectorAll('[data-style-choice]')];
  const styleSelect = document.getElementById('style-select');
  const themeSelect = document.getElementById('theme-choice');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const search = document.getElementById('project-search');
  const count = document.getElementById('results-count');
  const empty = document.getElementById('empty-state');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const normalise = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

  const network = document.querySelector('.network');
  const bridge = network.querySelector('.map-bridge');
  const bridgeSpace = network.querySelector('.map-bridge-space');
  const connectionPath = network.querySelector('.map-connections');
  let connectionFrame = 0;

  function layoutBox(element) {
    let left = 0;
    let top = 0;
    for (let current = element; current && current !== network; current = current.offsetParent) {
      left += current.offsetLeft;
      top += current.offsetTop;
    }
    return {x: left + element.offsetWidth / 2, top, bottom: top + element.offsetHeight};
  }

  function drawConnections() {
    connectionFrame = 0;
    if (bridgeSpace.offsetHeight === 0) {
      connectionPath.setAttribute('d', '');
      return;
    }
    const sources = [...network.querySelectorAll('.map-lane')].flatMap(lane => {
      const boxes = [...lane.querySelectorAll('.map-node')].map(layoutBox);
      const bottom = Math.max(...boxes.map(box => box.bottom));
      return boxes.filter(box => Math.abs(box.bottom - bottom) <= 1);
    });
    const targets = [...network.querySelectorAll('.map-foundation .map-node')].map(layoutBox);
    const sourceBottom = Math.max(...sources.map(box => box.bottom));
    const targetTop = Math.min(...targets.map(box => box.top));
    const busY = (sourceBottom + targetTop) / 2;
    const hubX = network.clientWidth / 2;
    const radius = Math.min(8, Math.max(0, targetTop - sourceBottom) / 4);
    const paths = [];
    for (const source of sources) {
      const direction = Math.sign(hubX - source.x);
      const corner = Math.min(radius, Math.abs(hubX - source.x));
      paths.push(`M ${source.x} ${source.bottom} V ${busY - corner} Q ${source.x} ${busY} ${source.x + direction * corner} ${busY} H ${hubX}`);
    }
    for (const target of targets) {
      const direction = Math.sign(target.x - hubX);
      const corner = Math.min(radius, Math.abs(target.x - hubX));
      paths.push(`M ${hubX} ${busY} H ${target.x - direction * corner} Q ${target.x} ${busY} ${target.x} ${busY + corner} V ${target.top}`);
    }
    bridge.setAttribute('viewBox', `0 0 ${network.clientWidth} ${network.clientHeight}`);
    connectionPath.setAttribute('d', paths.join(' '));
  }

  function scheduleConnections() {
    if (!connectionFrame) connectionFrame = requestAnimationFrame(drawConnections);
  }

  const connectionObserver = new ResizeObserver(scheduleConnections);
  [network, bridgeSpace, ...network.querySelectorAll('.map-lane, .map-foundation, .map-node')]
    .forEach(element => connectionObserver.observe(element));

  function setStyle(id, persist = true) {
    if (!Object.hasOwn(styles, id)) return;
    state.style = id;
    document.documentElement.dataset.style = id;
    scheduleConnections();
    styleButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.styleChoice === id)));
    document.getElementById('style-status').textContent = `当前方案：${styles[id].name}，银色 BOOM! 标题`;
    document.getElementById('demo-palette').setAttribute('aria-label', styles[id].palette);
    styleSelect.value = id;
    document.getElementById('theme-control').hidden = id !== 'industrial';
    applyTheme();
    if (persist) {
      try { localStorage.setItem('boom-design-direction', id); } catch (_) { /* The in-memory choice remains active. */ }
    }
  }

  function applyTheme() {
    const dark = state.themePreference === 'dark' || (state.themePreference === 'system' && systemTheme.matches);
    const theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = state.themePreference;
    themeSelect.value = state.themePreference;
    const icon = state.themePreference === 'system' ? 'display' : dark ? 'moon' : 'sun';
    document.getElementById('theme-icon').setAttribute('href', `#icon-${icon}`);
    const isIndustrial = state.style === 'industrial';
    document.getElementById('theme-status').textContent = isIndustrial ? `${dark ? 'Dark' : 'Light'} appearance${state.themePreference === 'system' ? ', following system' : ''}` : '';
    const color = isIndustrial && dark ? '#141b22' : styles[state.style].color;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
    document.getElementById('demo-palette').setAttribute('aria-label', isIndustrial && dark ? '深石墨、哑光银、冰蓝' : styles[state.style].palette);
  }

  function selectProject(id, options = {}) {
    const project = byId.get(id);
    if (!project) return;
    state.selected = id;
    selectors.forEach(button => {
      const member = byId.get(button.dataset.selectProject);
      const selected = member.id === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-map-layer]').forEach(lane => lane.classList.toggle('is-current', lane.dataset.mapLayer === project.layer));
    document.getElementById('map-selected').textContent = project.code;
    document.getElementById('map-role').textContent = project.short;
    document.getElementById('architecture-name').textContent = project.name;
    document.getElementById('architecture-layer').textContent = layers[project.layer];
    document.getElementById('architecture-description').textContent = project.role;
    const repo = document.getElementById('architecture-repo');
    repo.href = project.url;
    repo.setAttribute('aria-label', `Open ${project.name} on GitHub`);
    document.querySelectorAll('[data-view-selected]').forEach(link => {
      link.href = `#project-${id}`;
      link.setAttribute('aria-label', `View ${project.name} in the project directory`);
    });
    if (options.open !== false) details.forEach(row => { row.open = row.dataset.projectRow === id; });
    if (!reduced.matches && options.animate) {
      const panel = document.getElementById('architecture-selection');
      panel.getAnimations().forEach(animation => animation.cancel());
      panel.animate([{opacity: .5, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 220, easing: 'ease-out'});
    }
  }

  function filterProjects() {
    const query = normalise(state.query.trim());
    let visible = 0;
    details.forEach(row => {
      const project = byId.get(row.dataset.projectRow);
      const layerMatch = state.filter === 'all' || project.layer === state.filter;
      const haystack = normalise([project.code, project.name, project.short, project.role, layers[project.layer], project.license].join(' '));
      row.hidden = !(layerMatch && haystack.includes(query));
      if (!row.hidden) visible += 1;
    });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)));
    count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}${state.filter !== 'all' ? ` in ${layers[state.filter].toLowerCase()}` : ''}${state.query.trim() ? ' matching your search' : ''}`;
    empty.hidden = visible !== 0;
  }

  styleSelect.addEventListener('change', () => setStyle(styleSelect.value));
  themeSelect.addEventListener('change', () => {
    state.themePreference = themeSelect.value;
    applyTheme();
    try { localStorage.setItem('boom-color-mode', state.themePreference); } catch (_) { /* The in-memory choice remains active. */ }
  });
  systemTheme.addEventListener('change', () => {
    if (state.themePreference === 'system') applyTheme();
  });

  styleButtons.forEach((button, index) => {
    button.addEventListener('click', () => setStyle(button.dataset.styleChoice));
    button.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % styleButtons.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + styleButtons.length) % styleButtons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = styleButtons.length - 1;
      else return;
      event.preventDefault();
      styleButtons[next].focus({preventScroll: true});
      setStyle(styleButtons[next].dataset.styleChoice);
    });
  });
  selectors.forEach(button => button.addEventListener('click', () => selectProject(button.dataset.selectProject, {animate: true})));
  details.forEach(row => row.querySelector('summary').addEventListener('click', event => {
    event.preventDefault();
    const wasOpen = row.open;
    selectProject(row.dataset.projectRow, {open: !wasOpen, animate: true});
    if (wasOpen) row.open = false;
  }));
  filterButtons.forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    filterProjects();
  }));
  search.addEventListener('input', () => {
    state.query = search.value;
    filterProjects();
  });
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      search.value = '';
      state.query = '';
      filterProjects();
    }
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    state.filter = 'all';
    state.query = '';
    search.value = '';
    filterProjects();
    search.focus();
  });
  document.querySelectorAll('[data-view-selected]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    state.filter = 'all';
    state.query = '';
    search.value = '';
    filterProjects();
    selectProject(state.selected);
    const row = document.getElementById(`project-${state.selected}`);
    row.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'start'});
    row.querySelector('summary').focus({preventScroll: true});
  }));
  let initialStyle = 'industrial';
  try {
    const saved = localStorage.getItem('boom-design-direction');
    if (saved && Object.hasOwn(styles, saved)) initialStyle = saved;
  } catch (_) { /* Local storage is optional in embedded previews. */ }
  setStyle(initialStyle, false);
  selectProject(state.selected);
  filterProjects();
  document.querySelectorAll('[data-enhanced-only]').forEach(element => { element.hidden = false; });
})();
