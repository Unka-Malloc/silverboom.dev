(() => {
  'use strict';
  const projects = JSON.parse(document.getElementById('project-data').textContent);
  const byId = new Map(projects.map(project => [project.id, project]));
  const layers = {agent: 'Agent layer', runtime: 'Runtime layer', shared: 'Shared infrastructure'};
  const normalise = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const searchIndex = new Map(projects.map(project => [project.id, normalise([
    project.code, project.name, project.short, project.role, layers[project.layer], project.license
  ].join(' '))]));
  const state = {selected: 'a4aa', filter: 'all', query: ''};
  const rows = [...document.querySelectorAll('[data-project-row]')];
  const groups = [...document.querySelectorAll('[data-project-group]')].map(element => ({element, rows: [...element.querySelectorAll('[data-project-row]')], count: element.querySelector('[data-group-count]')}));
  const selectors = [...document.querySelectorAll('[data-select-project]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const mapLanes = [...document.querySelectorAll('[data-map-layer]')];
  const projectLinks = [...document.querySelectorAll('[data-view-selected]')];
  const search = document.getElementById('project-search');
  const count = document.getElementById('results-count');
  const empty = document.getElementById('empty-state');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selectedCode = document.getElementById('map-selected');
  const selectedRole = document.getElementById('map-role');
  const architectureName = document.getElementById('architecture-name');
  const architectureSymbol = document.getElementById('architecture-symbol');
  const architectureLayer = document.getElementById('architecture-layer');
  const architectureDescription = document.getElementById('architecture-description');
  const architectureRepo = document.getElementById('architecture-repo');
  const architectureSelection = document.getElementById('architecture-selection');

  function selectProject(id, {expand = true, animate = false} = {}) {
    const project = byId.get(id);
    if (!project) return;
    const changed = state.selected !== id;
    state.selected = id;
    selectors.forEach(button => {
      const selected = button.dataset.selectProject === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    mapLanes.forEach(lane => lane.classList.toggle('is-current', lane.dataset.mapLayer === project.layer));
    selectedCode.textContent = project.code;
    selectedRole.textContent = project.short;
    architectureName.textContent = project.name;
    architectureSymbol.setAttribute('href', `#cap-${id}`);
    architectureLayer.textContent = layers[project.layer];
    architectureDescription.textContent = project.role;
    architectureRepo.href = project.url;
    architectureRepo.setAttribute('aria-label', `Open ${project.name} on GitHub`);
    projectLinks.forEach(link => {
      link.href = `#project-${id}`;
      link.setAttribute('aria-label', `View ${project.name} in the project directory`);
    });
    if (expand) rows.forEach(row => { row.open = row.dataset.projectRow === id; });
    if (changed && animate && !reducedMotion.matches) {
      architectureSelection.getAnimations().forEach(animation => animation.cancel());
      architectureSelection.animate([{opacity: .5}, {opacity: 1}], {duration: 180, easing: 'ease-out'});
    }
  }

  function filterProjects() {
    const query = normalise(state.query.trim());
    let visible = 0;
    rows.forEach(row => {
      const project = byId.get(row.dataset.projectRow);
      const matches = (state.filter === 'all' || project.layer === state.filter) && searchIndex.get(project.id).includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    groups.forEach(group => {
      const matching = group.rows.filter(row => !row.hidden).length;
      group.element.hidden = matching === 0;
      group.count.textContent = `${matching} ${matching === 1 ? 'project' : 'projects'}`;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)));
    count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}${state.filter !== 'all' ? ` in ${layers[state.filter].toLowerCase()}` : ''}${state.query.trim() ? ' matching your search' : ''}`;
    empty.hidden = visible !== 0;
  }

  function resetFilters() {
    state.filter = 'all';
    state.query = '';
    search.value = '';
    filterProjects();
  }

  selectors.forEach(button => button.addEventListener('click', () => selectProject(button.dataset.selectProject, {animate: true})));
  rows.forEach(row => row.querySelector('summary').addEventListener('click', event => {
    event.preventDefault();
    const wasOpen = row.open;
    selectProject(row.dataset.projectRow, {expand: !wasOpen, animate: true});
    if (wasOpen) row.open = false;
  }));
  filters.forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    filterProjects();
  }));
  search.addEventListener('input', () => {
    state.query = search.value;
    filterProjects();
  });
  search.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    search.value = '';
    state.query = '';
    filterProjects();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    resetFilters();
    search.focus();
  });
  projectLinks.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    resetFilters();
    selectProject(state.selected);
    const row = document.getElementById(`project-${state.selected}`);
    row.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
    row.querySelector('summary').focus({preventScroll: true});
  }));

  function openLinkedProject() {
    const prefix = '#project-';
    if (!location.hash.startsWith(prefix)) return;
    const id = location.hash.slice(prefix.length);
    if (!byId.has(id)) return;
    resetFilters();
    selectProject(id);
  }
  selectProject(state.selected);
  filterProjects();
  openLinkedProject();
  window.addEventListener('hashchange', openLinkedProject);
  document.querySelectorAll('[data-enhanced-only]').forEach(element => { element.hidden = false; });

  // Layout measurements ignore button animations and follow actual grid geometry.
  const network = document.querySelector('.network');
  const bridge = network.querySelector('.map-bridge');
  const bridgeSpace = network.querySelector('.map-bridge-space');
  const connectionPath = network.querySelector('.map-connections');
  const sourceGroups = [...network.querySelectorAll('.map-lane')].map(lane => [...lane.querySelectorAll('.map-node')]);
  const targetNodes = [...network.querySelectorAll('.map-foundation .map-node')];
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
    if (!bridgeSpace.offsetHeight) {
      connectionPath.setAttribute('d', '');
      return;
    }
    const sources = sourceGroups.flatMap(nodes => {
      const boxes = nodes.map(layoutBox);
      const bottom = Math.max(...boxes.map(box => box.bottom));
      return boxes.filter(box => Math.abs(box.bottom - bottom) <= 1);
    });
    const targets = targetNodes.map(layoutBox);
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
  scheduleConnections();

  // Pause material and direction effects whenever their section is off screen.
  const effectSections = [...document.querySelectorAll('[data-effects]')];
  const visibleEffects = new Set();
  function updateEffects() {
    const enabled = !document.hidden && !reducedMotion.matches;
    effectSections.forEach(section => section.classList.toggle('effects-active', enabled && visibleEffects.has(section)));
  }
  const effectsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visibleEffects.add(entry.target) : visibleEffects.delete(entry.target));
    updateEffects();
  }, {threshold: 0});
  effectSections.forEach(section => effectsObserver.observe(section));
  document.addEventListener('visibilitychange', updateEffects);
  reducedMotion.addEventListener('change', updateEffects);

  const reflectiveSurfaces = [document.getElementById('hero-title'), ...network.querySelectorAll('.map-node')];
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let reflectionFrame = 0;
  let reflectionPoint = null;
  function paintReflection() {
    reflectionFrame = 0;
    if (!reflectionPoint || reducedMotion.matches || !finePointer.matches) return;
    const {element, x, y} = reflectionPoint;
    const box = element.getBoundingClientRect();
    const lightX = Math.max(0, Math.min(100, (x - box.left) / box.width * 100));
    const lightY = Math.max(0, Math.min(100, (y - box.top) / box.height * 100));
    element.style.setProperty('--light-x', `${lightX}%`);
    element.style.setProperty('--light-y', `${lightY}%`);
  }
  reflectiveSurfaces.forEach(element => {
    element.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !finePointer.matches) return;
      reflectionPoint = {element, x: event.clientX, y: event.clientY};
      if (!reflectionFrame) reflectionFrame = requestAnimationFrame(paintReflection);
    }, {passive: true});
    element.addEventListener('pointerleave', () => {
      if (reflectionPoint?.element === element) {
        if (reflectionFrame) cancelAnimationFrame(reflectionFrame);
        reflectionFrame = 0;
        reflectionPoint = null;
      }
      element.style.removeProperty('--light-x');
      element.style.removeProperty('--light-y');
    });
  });
})();
