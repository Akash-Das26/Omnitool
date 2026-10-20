/**
 * Read-only design audit of the built Omnitool UI.
 *
 * Captures screenshots into docs/design/built/ (not committed) and writes
 * docs/design/built/measurements.json. Every value comes from the rendered DOM.
 *
 * Usage:
 *   pnpm build
 *   pnpm --filter @omnitool/web preview --host 127.0.0.1 --port 4173
 *   node scripts/audit-built-design.mjs
 *
 * Set AUDIT_BASE_URL to point at another preview server.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:4173';
const OUTPUT_DIR = 'docs/design/built';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const THEMES = ['light', 'dark'];

const TOOL_PAGES = ['uuid-genny', 'qr-genny', 'image-converter', 'json-formatter', 'word-counter'];

const SCREENS = [
  { name: 'home-top', path: '/' },
  { name: 'home-category', path: '/?category=colour' },
  ...TOOL_PAGES.map((id) => ({ name: `tool-${id}`, path: `/tools/${id}` })),
  { name: 'not-found', path: '/tools/does-not-exist' },
];

/** Runs in the page: generic measurements shared by every screen. */
function collectPageMeasurements() {
  const px = (value) => Number.parseFloat(value) || 0;

  function parseColor(value) {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(/[,/]/).map((part) => Number.parseFloat(part.trim()));
    const [r, g, b, a = 1] = parts;
    return { r, g, b, a };
  }

  function over(top, bottom) {
    const alpha = top.a + bottom.a * (1 - top.a);
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (channel) =>
      (top[channel] * top.a + bottom[channel] * bottom.a * (1 - top.a)) / alpha;
    return { r: mix('r'), g: mix('g'), b: mix('b'), a: alpha };
  }

  function luminance({ r, g, b }) {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrast(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function cumulativeOpacity(element) {
    let opacity = 1;
    let node = element;
    while (node && node.nodeType === 1) {
      opacity *= Number(getComputedStyle(node).opacity);
      node = node.parentElement;
    }
    return opacity;
  }

  function backgroundOf(element) {
    const layers = [];
    let gradient = false;
    let node = element;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none' && style.backgroundImage.includes('gradient')) {
        gradient = true;
      }
      const color = parseColor(style.backgroundColor);
      if (color && color.a > 0) {
        // Opacity on the element fades its own background along with its text.
        layers.push({ ...color, a: color.a * cumulativeOpacity(node) });
      }
      node = node.parentElement;
    }
    let result = { r: 255, g: 255, b: 255, a: 1 };
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      result = over(layers[index], result);
    }
    return { color: result, gradient, opacity: cumulativeOpacity(element) };
  }

  function isVisible(element) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false;
    }
    const rects = element.getClientRects();
    return rects.length > 0 && rects[0].width > 1 && rects[0].height > 1;
  }

  function selectorFor(element) {
    if (element?.nodeType !== 1) return '';
    const tag = element.tagName.toLowerCase();
    const classes = [...element.classList].filter((name) => !name.includes('/')).slice(0, 3);
    const label = element.getAttribute('aria-label');
    const dataSlot = element.getAttribute('data-slot');
    return [
      tag,
      classes.length ? `.${classes.join('.')}` : '',
      dataSlot ? `[data-slot="${dataSlot}"]` : '',
      label ? `[aria-label="${label}"]` : '',
    ].join('');
  }

  function ownTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue || node.nodeValue.trim() === '') continue;
      const parent = node.parentElement;
      if (!parent || !isVisible(parent)) continue;
      if (parent.closest('.sr-only')) continue;
      nodes.push(node);
    }
    return nodes;
  }

  function textEntries() {
    return ownTextNodes(document.body).map((node) => {
      const element = node.parentElement;
      const style = getComputedStyle(element);
      const foreground = parseColor(style.color) ?? { r: 0, g: 0, b: 0, a: 1 };
      const background = backgroundOf(element);
      const disabled = Boolean(
        element.closest('[disabled], [aria-disabled="true"], [data-disabled="true"]'),
      );
      const fadedForeground = { ...foreground, a: foreground.a * background.opacity };
      const paintedForeground = over(fadedForeground, background.color);
      return {
        text: node.nodeValue.trim().slice(0, 90),
        selector: selectorFor(element),
        color: style.color,
        opacity: Number(background.opacity.toFixed(3)),
        disabled,
        background: `rgb(${Math.round(background.color.r)} ${Math.round(background.color.g)} ${Math.round(background.color.b)})`,
        gradient: background.gradient,
        fontSize: px(style.fontSize),
        fontWeight: Number(style.fontWeight) || 400,
        contrast: background.gradient ? null : contrast(paintedForeground, background.color),
      };
    });
  }

  function visibleControls() {
    const controls = [
      ...document.querySelectorAll('button, input, select, textarea, [role="combobox"]'),
    ];
    return controls.filter(isVisible).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') ?? '',
        label:
          element.getAttribute('aria-label') ??
          element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50) ??
          '',
        height: Math.round(rect.height * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        borderRadius: style.borderRadius,
        borderColor: style.borderColor,
        borderWidth: style.borderTopWidth,
        backgroundColor: style.backgroundColor,
        fontSize: px(style.fontSize),
      };
    });
  }

  function smallestText() {
    const sizes = textEntries().map((entry) => ({
      fontSize: entry.fontSize,
      text: entry.text,
      selector: entry.selector,
    }));
    sizes.sort((a, b) => a.fontSize - b.fontSize);
    return { smallest: sizes[0] ?? null, below12: sizes.filter((entry) => entry.fontSize < 12) };
  }

  function contrastReport() {
    const entries = textEntries();
    const failures = [];
    let untested = 0;
    let lowest = null;
    for (const entry of entries) {
      if (entry.contrast === null) {
        untested += 1;
        continue;
      }
      const large = entry.fontSize >= 24 || (entry.fontSize >= 18.66 && entry.fontWeight >= 700);
      const threshold = large ? 3 : 4.5;
      if (!lowest || entry.contrast < lowest.contrast) lowest = entry;
      if (entry.contrast < threshold) {
        failures.push({ ...entry, large, threshold: threshold });
      }
    }
    return {
      totalTextNodes: entries.length,
      untestedGradientBackgrounds: untested,
      lowest: lowest
        ? { text: lowest.text, selector: lowest.selector, ratio: lowest.contrast }
        : null,
      failures,
      enabledFailures: failures.filter((entry) => !entry.disabled),
      disabledFailures: failures.filter((entry) => entry.disabled),
    };
  }

  function styleSweep() {
    const shadows = new Map();
    const shadowElements = [];
    const gradients = new Map();
    const iconFonts = new Map();
    for (const element of document.querySelectorAll('*')) {
      if (!isVisible(element)) continue;
      const style = getComputedStyle(element);
      if (style.boxShadow && style.boxShadow !== 'none') {
        shadows.set(style.boxShadow, (shadows.get(style.boxShadow) ?? 0) + 1);
        shadowElements.push({ selector: selectorFor(element), boxShadow: style.boxShadow });
      }
      if (style.backgroundImage?.includes('gradient')) {
        gradients.set(
          style.backgroundImage.slice(0, 80),
          (gradients.get(style.backgroundImage.slice(0, 80)) ?? 0) + 1,
        );
      }
      if (/material|font awesome|glyphicon|icon font/i.test(style.fontFamily)) {
        iconFonts.set(style.fontFamily, (iconFonts.get(style.fontFamily) ?? 0) + 1);
      }
    }
    return {
      shadows: [...shadows.entries()].map(([value, count]) => ({ value, count })),
      shadowElements,
      gradients: [...gradients.entries()].map(([value, count]) => ({ value, count })),
      iconFonts: [...iconFonts.entries()].map(([value, count]) => ({ value, count })),
    };
  }

  function radiusSweep() {
    const controls = new Map();
    const panels = new Map();
    for (const element of document.querySelectorAll('*')) {
      if (!isVisible(element)) continue;
      const style = getComputedStyle(element);
      const radius = style.borderRadius;
      if (radius === '0px') continue;
      if (element.matches('button, input, select, textarea, [role="combobox"], a[href], kbd')) {
        const entry = controls.get(radius) ?? { count: 0, examples: [] };
        entry.count += 1;
        if (entry.examples.length < 4) entry.examples.push(selectorFor(element));
        controls.set(radius, entry);
      } else if (element.matches('article, section, div, dialog, ul')) {
        const entry = panels.get(radius) ?? { count: 0, examples: [] };
        entry.count += 1;
        if (entry.examples.length < 4) entry.examples.push(selectorFor(element));
        panels.set(radius, entry);
      }
    }
    return {
      controls: [...controls.entries()].map(([value, entry]) => ({ value, ...entry })),
      panels: [...panels.entries()].map(([value, entry]) => ({ value, ...entry })),
    };
  }

  function textPatterns() {
    const entries = textEntries();
    const patterns = {
      notBuilt: [],
      uppercaseTransform: [],
      literalCaps: [],
      versionOrEngine: [],
      rowIds: [],
      statusWords: [],
    };
    const counts = {};
    for (const entry of entries) {
      const styleText = entry.text;
      if (/not built|phase \d|coming soon/i.test(styleText)) {
        counts.notBuilt = (counts.notBuilt ?? 0) + 1;
        if (!patterns.notBuilt.includes(styleText)) patterns.notBuilt.push(styleText);
      }
      if (/^[A-Z0-9][A-Z0-9 &/·—–_-]{2,}$/.test(styleText) && /[A-Z]/.test(styleText)) {
        counts.literalCaps = (counts.literalCaps ?? 0) + 1;
        if (!patterns.literalCaps.includes(styleText)) patterns.literalCaps.push(styleText);
      }
      if (/\bv?\d+\.\d+\.\d+\b|engine|simd|\bwasm\b|latency|compile/i.test(styleText)) {
        counts.versionOrEngine = (counts.versionOrEngine ?? 0) + 1;
        if (!patterns.versionOrEngine.includes(styleText)) patterns.versionOrEngine.push(styleText);
      }
      if (/#0x|INDEX \/\//.test(styleText)) {
        counts.rowIds = (counts.rowIds ?? 0) + 1;
        patterns.rowIds.push(styleText);
      }
      if (/\b(standby|idle|buffering)\b/i.test(styleText)) {
        counts.statusWords = (counts.statusWords ?? 0) + 1;
        if (!patterns.statusWords.includes(styleText)) patterns.statusWords.push(styleText);
      }
    }
    for (const element of document.querySelectorAll('*')) {
      if (!isVisible(element)) continue;
      const transform = getComputedStyle(element).textTransform;
      if (transform === 'uppercase') {
        counts.uppercaseTransform = (counts.uppercaseTransform ?? 0) + 1;
        patterns.uppercaseTransform.push(selectorFor(element));
      }
    }
    return { counts, patterns };
  }

  function tokenColors() {
    const style = getComputedStyle(document.documentElement);
    const tokens = {};
    for (const name of window.__AUDIT_TOKENS) tokens[name] = style.getPropertyValue(name).trim();
    return tokens;
  }

  function surfaceProbes() {
    const probe = (selector, role) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        role,
        selector,
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        borderWidth: style.borderTopWidth,
        borderRadius: style.borderRadius,
        height: Math.round(rect.height * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
      };
    };
    return [
      probe('body', 'page'),
      probe('header', 'header'),
      probe('main .rounded-panel', 'panel (home category)'),
      probe('article > div', 'panel (tool frame)'),
      probe('main .bg-surface-inset', 'inset'),
      probe('aside', 'rail'),
    ].filter(Boolean);
  }

  function fontInfo() {
    const sample = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        selector,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    };
    const monoUsage = [];
    for (const element of document.querySelectorAll('*')) {
      if (!isVisible(element)) continue;
      if (!element.children.length && element.textContent?.trim()) {
        const family = getComputedStyle(element).fontFamily;
        if (/Geist Mono/i.test(family)) {
          monoUsage.push({
            selector: selectorFor(element),
            text: element.textContent.trim().slice(0, 40),
          });
        }
      }
    }
    return {
      loaded: [...document.fonts].map((face) => `${face.family} ${face.weight} ${face.status}`),
      body: sample('body'),
      heading: sample('h1'),
      value: sample('code, pre, .font-mono'),
      monoUsage: monoUsage.slice(0, 40),
      monoUsageCount: monoUsage.length,
    };
  }

  function controlBoundaries() {
    const controls = [
      ...document.querySelectorAll('button, input, select, textarea, [role="combobox"]'),
    ];
    const results = [];
    for (const element of controls) {
      if (!isVisible(element)) continue;
      const style = getComputedStyle(element);
      const width = px(style.borderTopWidth);
      if (width === 0) continue;
      const border = parseColor(style.borderTopColor);
      if (!border || border.a === 0) continue;
      const behind = backgroundOf(element.parentElement ?? element).color;
      results.push({
        selector: selectorFor(element),
        label: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? '',
        border: style.borderTopColor,
        behind: `rgb(${Math.round(behind.r)} ${Math.round(behind.g)} ${Math.round(behind.b)})`,
        ratio: contrast(border, behind),
      });
    }
    return results;
  }

  const headerHeading = document.querySelector('header h1, article h1') ?? null;
  const firstStage = document.querySelector('article section') ?? null;
  const headerRect = headerHeading?.getBoundingClientRect() ?? null;
  const headerHeight = headerRect ? Math.round(headerRect.height) : null;
  const stageRect = firstStage?.getBoundingClientRect() ?? null;

  return {
    title: document.title,
    url: location.pathname + location.search,
    viewport: { width: innerWidth, height: innerHeight },
    firstViewport:
      headerHeading && headerRect
        ? {
            heading: headerHeading.textContent?.trim() ?? '',
            headingSelector: headerHeading.closest('header') ? 'header h1' : 'article h1',
            headingBottom: Math.round(headerRect.bottom),
            headingHeight: headerHeight,
            tallestAboveBaseline: (() => {
              let tallest = { height: 0, selector: '' };
              for (const element of document.querySelectorAll('h2, h3, p, li, label, td, button')) {
                if (headerHeading.contains(element)) continue;
                const rect = element.getBoundingClientRect();
                if (rect.top >= headerRect.bottom || rect.bottom <= 0 || rect.height <= 1) continue;
                if (Math.round(rect.height) > tallest.height) {
                  tallest = { height: Math.round(rect.height), selector: selectorFor(element) };
                }
              }
              return tallest;
            })(),
            bodyOverlapsHeading:
              stageRect !== null &&
              headerRect !== null &&
              stageRect.top < headerRect.bottom &&
              stageRect.bottom > headerRect.top,
            headerRectBelowFold: headerRect.top >= innerHeight,
          }
        : null,
    tokens: tokenColors(),
    surfaces: surfaceProbes(),
    fonts: fontInfo(),
    controls: visibleControls(),
    smallestText: smallestText(),
    contrast: contrastReport(),
    style: styleSweep(),
    radius: radiusSweep(),
    patterns: textPatterns(),
    boundaries: controlBoundaries(),
  };
}

/** Runs in the page: home composition and tool-row anatomy. */
function collectHome() {
  const rectOf = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      height: Math.round(rect.height),
      width: Math.round(rect.width),
    };
  };
  const sections = [...document.querySelectorAll('main section')].map((section) => {
    const heading = section.querySelector('h2');
    const rows = [...section.querySelectorAll('li')];
    return {
      heading: heading?.textContent?.trim() ?? '',
      rows: rows.length,
      builtRows: rows.filter((row) => row.querySelector('a[href]')).length,
      plannedRows: rows.filter((row) => row.querySelector('[data-row-planned]')).length,
      ...rectOf(section),
    };
  });
  const allRows = [...document.querySelectorAll('main section li > a, main section li > div')];
  const rowsInFold = allRows.filter((row) => row.getBoundingClientRect().top < innerHeight);
  const firstRow = allRows[0];
  const firstLink = document.querySelector('main section li > a[href]');
  const targetRow = firstLink ?? firstRow;
  const rowStyle = targetRow ? getComputedStyle(targetRow) : null;
  const nameSpan = targetRow?.querySelector('[data-row-name]') ?? null;
  const nameStyle = nameSpan ? getComputedStyle(nameSpan) : null;

  const rowList = allRows.map((row, index) => {
    const name = row.querySelector('[data-row-name]')?.textContent?.trim() ?? '';
    const description = row.querySelector('[data-row-description]')?.textContent?.trim() ?? null;
    const planned = row.matches('[data-row-planned]');
    return {
      index,
      name,
      built: row.matches('a[href]'),
      height: Math.round(row.getBoundingClientRect().height),
      description,
      planned,
      status: planned ? 'Planned' : null,
      top: Math.round(row.getBoundingClientRect().top),
    };
  });

  return {
    categorySections: sections,
    rows: {
      total: allRows.length,
      inFirstViewport: rowsInFold.length,
      firstRowIndex: allRows.indexOf(rowsInFold[0] ?? allRows[0]),
      firstRowIsBuilt: Boolean(allRows[0]?.matches('a[href]')),
      firstRowHeight: firstRow ? Math.round(firstRow.getBoundingClientRect().height) : null,
      firstRowFontSize: rowStyle?.fontSize ?? null,
      nameFontSize: nameStyle?.fontSize ?? null,
      nameFontWeight: nameStyle?.fontWeight ?? null,
      nameText: nameSpan?.textContent?.trim() ?? null,
      hasDescription: Boolean(targetRow?.querySelector('[data-row-description]')),
      descriptionText:
        targetRow?.querySelector('[data-row-description]')?.textContent?.trim().slice(0, 90) ??
        null,
      rowsWithDescriptionHeight: allRows
        .filter((row) => row.querySelector('[data-row-description]'))
        .map((row) => Math.round(row.getBoundingClientRect().height))
        .slice(0, 6),
      rowsWithoutDescriptionHeight: allRows
        .filter((row) => !row.querySelector('[data-row-description]'))
        .map((row) => Math.round(row.getBoundingClientRect().height))
        .slice(0, 6),
      wholeRowIsLink: targetRow?.tagName === 'A',
      linkHref: targetRow?.getAttribute('href') ?? null,
      withDescription: rowList.filter((row) => row.description).length,
      builtRows: rowList.filter((row) => row.built).length,
      builtRowsWithDescription: rowList.filter((row) => row.built && row.description).length,
      builtRowsInFold: rowList.filter((row) => row.built && row.top < innerHeight).length,
      rowList,
      firstBuiltRows: rowList.filter((row) => row.built).slice(0, 6),
    },
    aboveFold: {
      categories: sections
        .filter((section) => section.top < innerHeight)
        .map((section) => section.heading),
      builtRows: rowList.filter((row) => row.top < innerHeight && row.built).length,
      rows: rowList.filter((row) => row.top < innerHeight).length,
    },
    planned: {
      visibleRows: document.querySelectorAll('[data-row-planned]').length,
      badges: [...document.querySelectorAll('main section li')].filter((row) =>
        row.textContent?.includes('Planned'),
      ).length,
      toggle: (() => {
        const button = document.querySelector('main button[aria-controls="tool-index"]');
        if (!button) return null;
        return {
          text: button.textContent?.trim().replace(/\s+/g, ' ') ?? '',
          expanded: button.getAttribute('aria-expanded'),
          height: Math.round(button.getBoundingClientRect().height),
        };
      })(),
    },
    hero: (() => {
      const hero = document.querySelector('main button[aria-keyshortcuts]');
      if (!hero) return null;
      const style = getComputedStyle(hero);
      const container = hero.parentElement;
      const containerStyle = container ? getComputedStyle(container) : null;
      return {
        height: Math.round(hero.getBoundingClientRect().height),
        radius: style.borderRadius,
        borderColor: style.borderColor,
        text: hero.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        container: container
          ? {
              radius: containerStyle?.borderRadius,
              borderColor: containerStyle?.borderTopColor,
              borderWidth: containerStyle?.borderTopWidth,
              backgroundColor: containerStyle?.backgroundColor,
            }
          : null,
      };
    })(),
    searchEntryPoints: [...document.querySelectorAll('button[aria-keyshortcuts]')]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => ({
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) ?? '',
        region: element.closest('header') ? 'header' : 'main',
        height: Math.round(element.getBoundingClientRect().height),
      })),
    rail: (() => {
      const rail = document.querySelector('aside');
      if (!rail) return null;
      const style = getComputedStyle(rail);
      return {
        width: Math.round(rail.getBoundingClientRect().width),
        backgroundColor: style.backgroundColor,
        visible: rail.getClientRects().length > 0,
      };
    })(),
    content: (() => {
      const main = document.querySelector('main > div');
      if (!main) return null;
      return { width: Math.round(main.getBoundingClientRect().width) };
    })(),
  };
}

/** Runs in the page: omnibox state. */
function collectOmnibox() {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return { open: false };
  const items = [...dialog.querySelectorAll('[cmdk-item]')];
  const background = (element) => getComputedStyle(element).backgroundColor;
  const rowData = items.map((item) => {
    const selected = item.getAttribute('aria-selected');
    const dataSelected = item.getAttribute('data-selected');
    const description = item.querySelector('span.text-xs');
    return {
      text: item.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70) ?? '',
      ariaSelected: selected,
      dataSelected,
      background: background(item),
      color: getComputedStyle(item).color,
      descriptionColor: description ? getComputedStyle(description).color : null,
      disabled: item.getAttribute('data-disabled') ?? item.getAttribute('aria-disabled'),
      height: Math.round(item.getBoundingClientRect().height),
      borderRadius: getComputedStyle(item).borderRadius,
      fontSize: getComputedStyle(item).fontSize,
    };
  });
  const plannedRows = [...dialog.querySelectorAll('[data-planned-tool]')].map((row) => ({
    text: row.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) ?? '',
    background: background(row),
    color: getComputedStyle(row).color,
    height: Math.round(row.getBoundingClientRect().height),
    ariaSelected: row.getAttribute('aria-selected'),
  }));
  const groups = [...dialog.querySelectorAll('[cmdk-group-heading]')].map((heading) =>
    heading.textContent?.trim(),
  );
  const footerElement = dialog.querySelector('[data-slot="command"] > div:last-child');
  const keyHints = footerElement
    ? [...footerElement.querySelectorAll('kbd')].map((element) => element.textContent?.trim() ?? '')
    : [];
  const footerText = footerElement?.textContent?.trim().replace(/\s+/g, ' ') ?? '';
  const selectedItem = items.find((item) => item.getAttribute('aria-selected') === 'true');
  const marks = [...dialog.querySelectorAll('mark')].map((mark) => ({
    text: mark.textContent,
    decoration: getComputedStyle(mark).textDecorationLine,
    backgroundColor: getComputedStyle(mark).backgroundColor,
  }));
  const chip = dialog.querySelector('.bg-surface-inset');
  return {
    open: true,
    items: rowData,
    itemCount: rowData.length,
    yellowRows: rowData.filter((row) => row.background === 'rgb(255, 216, 77)').length,
    selectedRows: rowData.filter((row) => row.ariaSelected === 'true').length,
    selectedItem: selectedItem
      ? {
          text: selectedItem.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70) ?? '',
          background: getComputedStyle(selectedItem).backgroundColor,
          color: getComputedStyle(selectedItem).color,
        }
      : null,
    firstGroup: groups[0] ?? null,
    groups,
    keyHints,
    footerText,
    marks,
    plannedRows,
    plannedCount: plannedRows.length,
    plannedGroup: groups.find((heading) => /^Planned/.test(heading ?? '')) ?? null,
    notBuiltRows: [...rowData, ...plannedRows].filter((row) =>
      /not built|phase \d|coming soon/i.test(row.text),
    ).length,
    plannedLabels: plannedRows.filter((row) => /\bPlanned\b/.test(row.text)).length,
    inputCount: dialog.querySelectorAll('input').length,
    chipText: chip?.textContent?.trim().replace(/\s+/g, ' ') ?? null,
    text: dialog.textContent?.replace(/\s+/g, ' ').slice(0, 400) ?? '',
  };
}

/** Runs in the page: tool frame anatomy. */
function collectToolFrame() {
  const article = document.querySelector('article');
  if (!article) return null;
  const headings = [...article.querySelectorAll('section h2')].map((heading) => ({
    text: heading.textContent?.trim() ?? '',
    numbered: /^\d/.test(heading.textContent?.trim() ?? ''),
  }));
  const actionBar = article.querySelector('[data-slot="tool-actions"]');
  const actionStyle = actionBar ? getComputedStyle(actionBar) : null;
  const buttons = [...article.querySelectorAll('button')].map((button) => ({
    name:
      button.getAttribute('aria-label') ??
      button.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ??
      '',
    height: Math.round(button.getBoundingClientRect().height),
  }));
  return {
    title: article.querySelector('h1')?.textContent?.trim() ?? '',
    stages: headings,
    stageCount: headings.length,
    numberedStages: headings.filter((heading) => heading.numbered).length,
    resetVisible: buttons.some((button) => button.name === 'Reset'),
    shareVisible: buttons.some(
      (button) => button.name === 'Share' || button.name === 'Link copied',
    ),
    copyRowButtons: buttons.filter((button) => /^Copy (value|row)/i.test(button.name)).length,
    actionBar: actionBar
      ? {
          position: actionStyle?.position,
          bottom: actionStyle?.bottom,
          height: Math.round(actionBar.getBoundingClientRect().height),
          text: actionBar.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) ?? '',
        }
      : null,
    buttons,
  };
}

/** Runs in the page: CSSOM rules relevant to focus and selection. */
function collectCssRules() {
  const rules = [];
  const walk = (list) => {
    for (const rule of list) {
      const selector = rule.selectorText ?? '';
      if (selector.includes('::selection') || selector.includes(':focus-visible')) {
        rules.push({ selector, cssText: rule.cssText.slice(0, 300) });
      }
      if (rule.cssRules) walk(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Cross-origin sheets cannot be read; the app has none.
    }
  }
  return rules;
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

async function openOmnibox(page) {
  await page.keyboard.press('Control+K');
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
}

async function dropPng(page) {
  await page.evaluate(() => {
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'sample.png', {
      type: 'image/png',
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const target = document.querySelector('main button[aria-keyshortcuts]');
    target?.dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
    );
  });
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
}

async function measureImageConverterStates(page) {
  const fileInput = page.locator('article input[type="file"]');
  if ((await fileInput.count()) === 0) return null;
  await fileInput.setInputFiles('tests/fixtures/sample.png');
  const convert = page.getByRole('button', { name: 'Convert' });
  await convert.waitFor({ state: 'visible' });
  await convert.click();
  await page.getByRole('progressbar').waitFor({ state: 'visible', timeout: 15_000 });
  const state = await page.evaluate(() => {
    const bar = document.querySelector('[role="progressbar"]');
    const cancel = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancel',
    );
    return {
      progressVisible: Boolean(bar),
      progressValue: bar?.getAttribute('aria-valuenow') ?? null,
      progressText: document
        .querySelector('article')
        ?.textContent?.replace(/\s+/g, ' ')
        .slice(0, 300),
      cancelVisible: Boolean(cancel && cancel.getClientRects().length > 0),
      cancelHeight: cancel ? Math.round(cancel.getBoundingClientRect().height) : null,
    };
  });
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(600);
  const cancelled = await page.evaluate(() =>
    /cancelled/i.test(document.querySelector('article')?.textContent ?? ''),
  );
  return { ...state, cancelled };
}

async function capture(browser, viewport, theme, screen) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((value) => {
    window.localStorage.setItem('omnitool-theme', value);
    window.__AUDIT_TOKENS = [
      '--background',
      '--surface',
      '--surface-inset',
      '--surface-hover',
      '--foreground',
      '--muted-foreground',
      '--border',
      '--border-strong',
      '--primary',
      '--primary-foreground',
      '--highlight',
      '--highlight-foreground',
      '--ring',
    ];
  }, theme);

  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await page.goto(`${BASE_URL}${screen.path}`);
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));

  const baseName = `${screen.name}-${viewport.name}-${theme}`;
  await page.screenshot({ path: `${OUTPUT_DIR}/${baseName}.png` });

  const measurement = await page.evaluate(collectPageMeasurements);
  measurement.theme = theme;
  measurement.screen = screen.name;
  measurement.viewportName = viewport.name;
  measurement.cssRules = await page.evaluate(collectCssRules);

  if (screen.name === 'home-top' || screen.name === 'home-category') {
    measurement.home = await page.evaluate(collectHome);
    await page.evaluate(() => window.scrollTo(0, 0));
    // Hover the first built row to read the hover surface.
    const link = page.locator('main section li > a[href]').first();
    if ((await link.count()) > 0) {
      await link.hover();
      await page.waitForTimeout(100);
      measurement.home.rowHoverBackground = await link.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      await page.mouse.move(0, 0);
    }

    // Reveal the planned rows to measure their labels and non-link state.
    const toggle = page.getByRole('button', { name: /Show planned tools/ });
    if ((await toggle.count()) > 0) {
      await toggle.click();
      await page.waitForTimeout(150);
      measurement.homePlanned = await page.evaluate(collectHome);
      measurement.homePlannedContrast = (await page.evaluate(collectPageMeasurements)).contrast;
      await page.getByRole('button', { name: /Hide planned tools/ }).click();
      await page.waitForTimeout(150);
    }
  }

  if (screen.name.startsWith('tool-')) {
    measurement.tool = await page.evaluate(collectToolFrame);
    if (screen.path.endsWith('image-converter')) {
      measurement.imageConverter = await measureImageConverterStates(page);
      await page.goto(`${BASE_URL}${screen.path}`);
      await settle(page);
    }
  }

  await page.keyboard.press('Escape').catch(() => {});

  if (screen.name === 'home-top') {
    await openOmnibox(page);
    await page.screenshot({ path: `${OUTPUT_DIR}/omnibox-empty-${viewport.name}-${theme}.png` });
    measurement.omniboxEmpty = await page.evaluate(collectOmnibox);
    measurement.omniboxEmptyContrast = (await page.evaluate(collectPageMeasurements)).contrast;
    await page.keyboard.press('Escape');
  }

  if (screen.name === 'home-top') {
    await openOmnibox(page);
    await page.locator('[data-slot="command-input"]').fill('pdf');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUTPUT_DIR}/omnibox-pdf-${viewport.name}-${theme}.png` });
    const queryState = await page.evaluate(collectOmnibox);
    measurement.omniboxQuery = queryState;
    measurement.omniboxQueryContrast = (await page.evaluate(collectPageMeasurements)).contrast;
    await page.keyboard.press('Escape');

    await dropPng(page);
    await page.screenshot({
      path: `${OUTPUT_DIR}/omnibox-dropped-png-${viewport.name}-${theme}.png`,
    });
    measurement.omniboxFile = await page.evaluate(collectOmnibox);
    measurement.omniboxFileContrast = (await page.evaluate(collectPageMeasurements)).contrast;
    await page.keyboard.press('Escape');
  }

  await context.close();
  return measurement;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const measurements = [];
  try {
    for (const theme of THEMES) {
      for (const viewport of VIEWPORTS) {
        for (const screen of SCREENS) {
          const result = await capture(browser, viewport, theme, screen);
          measurements.push(result);
          console.log(`captured ${screen.name} ${viewport.name} ${theme}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(
    `${OUTPUT_DIR}/measurements.json`,
    `${JSON.stringify({ baseUrl: BASE_URL, capturedAt: new Date().toISOString(), measurements }, null, 2)}\n`,
  );
  console.log(`wrote ${OUTPUT_DIR}/measurements.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
