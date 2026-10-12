/**
 * Docs ExpandDropdown — vanilla overlay panel (matches filebrowserDocsTheme expand-dropdown.js)
 */

import { escapeHtml } from '../utils/dom';

const EXPAND_OPEN_MS = 300;
const EXPAND_CLOSE_MS = 150;
const ROOT_SELECTOR = '.dashboard-shell, .modal';

let globalListenersBound = false;

export interface DropdownOption {
  value: string;
  label: string;
}

function expandBeforeEnter(el: HTMLElement): void {
  el.style.height = '0';
  el.style.opacity = '0';
}

function expandEnter(el: HTMLElement, done: () => void, durationMs: number): void {
  el.style.transition = '';
  el.style.height = '0';
  el.style.opacity = '0';
  void el.offsetHeight;
  el.style.height = 'auto';
  el.style.visibility = 'hidden';
  void el.offsetHeight;
  const fullHeight = el.scrollHeight;
  el.style.height = '0';
  el.style.visibility = 'visible';
  el.style.transition = `height ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  void el.offsetHeight;
  el.style.height = `${fullHeight}px`;
  el.style.opacity = '1';
  window.setTimeout(done, durationMs);
}

function expandLeave(el: HTMLElement, done: () => void, durationMs: number): void {
  el.style.transition = `height ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  el.style.height = `${el.scrollHeight}px`;
  void el.offsetHeight;
  el.style.height = '0';
  el.style.opacity = '0';
  window.setTimeout(done, durationMs);
}

function getAnchor(dropdown: HTMLElement): HTMLElement | null {
  return dropdown.querySelector('.expand-dropdown-anchor');
}

function getBody(dropdown: HTMLElement): HTMLElement | null {
  return dropdown.querySelector('.expand-dropdown-body');
}

function resolveDropdownPlacement(anchorRect: DOMRect, optionCount: number) {
  const viewportHeight = window.innerHeight;
  const padding = 15;
  const cap = viewportHeight * 0.5;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  const estimatedHeight = Math.min(Math.max(100, optionCount * 40 + 16), cap);
  const minPreferredSpace = estimatedHeight + padding;
  let expandUpward = false;
  if (spaceBelow >= minPreferredSpace) {
    expandUpward = false;
  } else if (spaceAbove >= minPreferredSpace) {
    expandUpward = true;
  } else {
    expandUpward = spaceAbove > spaceBelow;
  }
  return { expandUpward };
}

type DropdownState = {
  backdrop: HTMLElement | null;
  overlay: HTMLElement | null;
  body: HTMLElement | null;
  closing: boolean;
  anchorRect: DOMRect | null;
  expandUpward: boolean;
};

function state(dropdown: HTMLElement): DropdownState {
  if (!(dropdown as HTMLElement & { _fb?: DropdownState })._fb) {
    (dropdown as HTMLElement & { _fb: DropdownState })._fb = {
      backdrop: null,
      overlay: null,
      body: null,
      closing: false,
      anchorRect: null,
      expandUpward: false,
    };
  }
  return (dropdown as HTMLElement & { _fb: DropdownState })._fb;
}

function applyOverlayGeometry(dropdown: HTMLElement, anchorRect: DOMRect): void {
  const s = state(dropdown);
  const overlay = s.overlay;
  const body = s.body;
  const anchor = getAnchor(dropdown);
  if (!overlay || !anchor || !body) return;

  const optionCount = body.querySelectorAll('.menu-option').length;
  const placement = resolveDropdownPlacement(anchorRect, optionCount);
  const expandUpward = placement.expandUpward;

  s.expandUpward = expandUpward;
  s.anchorRect = anchorRect;
  anchor.classList.toggle('expand-upward', expandUpward);
  body.classList.toggle('expand-upward', expandUpward);
  overlay.classList.toggle('expand-upward', expandUpward);

  const width = anchorRect.width;
  overlay.style.position = 'fixed';
  overlay.style.left = `${anchorRect.left}px`;
  overlay.style.width = `${width}px`;
  overlay.style.minWidth = `${width}px`;
  overlay.style.maxWidth = `${width}px`;
  overlay.style.boxSizing = 'border-box';
  overlay.style.zIndex = '1000';

  body.style.width = '100%';
  body.style.minWidth = '0';
  body.style.maxWidth = '100%';
  body.style.boxSizing = 'border-box';

  if (expandUpward) {
    overlay.style.top = '';
    overlay.style.bottom = `${window.innerHeight - anchorRect.top + 1}px`;
  } else {
    overlay.style.bottom = '';
    overlay.style.top = `${anchorRect.bottom - 1}px`;
  }
}

function updateOverlayPosition(dropdown: HTMLElement): void {
  const anchor = getAnchor(dropdown);
  if (!anchor) return;
  applyOverlayGeometry(dropdown, anchor.getBoundingClientRect());
}

function finishClose(dropdown: HTMLElement): void {
  const s = state(dropdown);
  const overlay = s.overlay;
  const body = s.body;
  const anchor = getAnchor(dropdown);

  dropdown.classList.remove('expand-dropdown--open');
  anchor?.classList.remove('expand-upward');

  if (body && overlay) {
    body.style.height = '';
    body.style.opacity = '';
    body.style.transition = '';
    body.style.visibility = '';
    body.style.width = '';
    body.style.minWidth = '';
    body.style.maxWidth = '';
    body.style.boxSizing = '';
    body.setAttribute('hidden', '');
    dropdown.appendChild(body);
  }

  s.backdrop?.parentNode?.removeChild(s.backdrop);
  overlay?.parentNode?.removeChild(overlay);

  s.backdrop = null;
  s.overlay = null;
  s.body = null;
  s.closing = false;

  const trigger = dropdown.querySelector('.expand-dropdown-trigger');
  trigger?.setAttribute('aria-expanded', 'false');
}

function closeDropdown(dropdown: HTMLElement, opts?: { immediate?: boolean }): void {
  const s = state(dropdown);
  if (!dropdown.classList.contains('expand-dropdown--open')) return;
  if (s.closing && !opts?.immediate) return;

  const body = s.body;
  if (!body || opts?.immediate) {
    s.closing = false;
    finishClose(dropdown);
    return;
  }

  s.closing = true;
  expandLeave(body, () => finishClose(dropdown), EXPAND_CLOSE_MS);
}

function closeAll(except?: HTMLElement | null): void {
  document.querySelectorAll(`${ROOT_SELECTOR} [data-fb-dropdown].expand-dropdown--open`).forEach((el) => {
    if (el !== except) closeDropdown(el as HTMLElement);
  });
}

function openDropdown(dropdown: HTMLElement): void {
  closeAll(dropdown);

  const anchor = getAnchor(dropdown);
  const body = getBody(dropdown);
  const trigger = dropdown.querySelector('.expand-dropdown-trigger');
  if (!anchor || !body || !trigger) return;

  const anchorRect = anchor.getBoundingClientRect();
  const s = state(dropdown);

  const backdrop = document.createElement('div');
  backdrop.className = 'expand-dropdown-backdrop';
  backdrop.addEventListener('mousedown', (e) => {
    e.preventDefault();
    closeDropdown(dropdown);
  });

  const overlay = document.createElement('div');
  overlay.className = 'expand-dropdown expand-dropdown--open expand-dropdown-overlay';
  overlay.dataset.fbDropdownOverlay = dropdown.dataset.fbDropdownId || '';

  s.backdrop = backdrop;
  s.overlay = overlay;
  s.body = body;
  dropdown.classList.add('expand-dropdown--open');
  trigger.setAttribute('aria-expanded', 'true');

  body.removeAttribute('hidden');
  expandBeforeEnter(body);
  overlay.appendChild(body);
  document.body.appendChild(backdrop);
  document.body.appendChild(overlay);

  applyOverlayGeometry(dropdown, anchorRect);

  requestAnimationFrame(() => {
    expandEnter(body, () => {
      const cached = s.anchorRect;
      const current = anchor.getBoundingClientRect();
      if (
        cached &&
        (Math.abs(cached.left - current.left) > 0.5 ||
          Math.abs(cached.top - current.top) > 0.5 ||
          Math.abs(cached.width - current.width) > 0.5)
      ) {
        applyOverlayGeometry(dropdown, current);
      }
    }, EXPAND_OPEN_MS);
  });
}

function toggleDropdown(dropdown: HTMLElement): void {
  const s = state(dropdown);
  if (s.closing) {
    finishClose(dropdown);
  }
  if (dropdown.classList.contains('expand-dropdown--open')) {
    closeDropdown(dropdown);
  } else {
    openDropdown(dropdown);
  }
}

function bindOptions(dropdown: HTMLElement, onSelect?: (value: string) => void): void {
  dropdown.querySelectorAll('.menu-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = option.getAttribute('data-value') || option.textContent?.trim() || '';
      const label = dropdown.querySelector('.expand-dropdown-trigger-label');
      if (label) {
        label.textContent = option.textContent?.trim() || value;
      }
      dropdown.querySelectorAll('.menu-option').forEach((opt) => {
        opt.classList.toggle('menu-option--selected', opt === option);
      });
      closeDropdown(dropdown, { immediate: true });
      onSelect?.(value);
    });
  });
}

function bindDropdown(dropdown: HTMLElement, onSelect?: (value: string) => void): void {
  if (dropdown.dataset.fbDropdownInit !== 'true') {
    dropdown.dataset.fbDropdownInit = 'true';
    const trigger = dropdown.querySelector('.expand-dropdown-trigger');
    trigger?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(dropdown);
    });
  }
  bindOptions(dropdown, onSelect);
}

function bindGlobalListeners(): void {
  if (globalListenersBound) return;
  globalListenersBound = true;

  document.addEventListener('mousedown', (e) => {
    document.querySelectorAll(`${ROOT_SELECTOR} [data-fb-dropdown].expand-dropdown--open`).forEach((dropdown) => {
      const el = dropdown as HTMLElement;
      const overlay = state(el).overlay;
      const anchor = getAnchor(el);
      if (overlay?.contains(e.target as Node)) return;
      if (anchor?.contains(e.target as Node)) return;
      closeDropdown(el);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll(null);
  });

  const onViewportChange = () => {
    document.querySelectorAll(`${ROOT_SELECTOR} [data-fb-dropdown].expand-dropdown--open`).forEach((dropdown) => {
      updateOverlayPosition(dropdown as HTMLElement);
    });
  };

  window.addEventListener('resize', onViewportChange);
  window.addEventListener('scroll', onViewportChange, true);
}

function renderOptions(list: HTMLElement, options: DropdownOption[], selected: string): void {
  list.innerHTML = options
    .map(
      (opt) =>
        `<button type="button" class="action menu-option${opt.value === selected ? ' menu-option--selected' : ''}" role="option" data-value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</button>`,
    )
    .join('');
}

/** Close an open expand dropdown and restore its panel to the DOM. */
export function closeExpandDropdown(dropdown: HTMLElement): void {
  closeDropdown(dropdown, { immediate: true });
}

export class ExpandDropdown {
  readonly el: HTMLElement;
  private listEl: HTMLElement;
  private labelEl: HTMLElement;
  private onChange: (value: string) => void;

  constructor(
    options: DropdownOption[],
    selected: string,
    onChange: (value: string) => void,
    opts: { compact?: boolean; ariaLabel?: string } = {},
  ) {
    this.onChange = onChange;
    const compact = opts.compact ?? true;

    this.el = document.createElement('div');
    this.el.className = `expand-dropdown${compact ? ' form-compact' : ''}`;
    this.el.dataset.fbDropdown = '';
    if (opts.ariaLabel) this.el.setAttribute('aria-label', opts.ariaLabel);

    const selectedLabel = options.find((o) => o.value === selected)?.label ?? selected;

    this.el.innerHTML = `
      <div class="expand-dropdown-anchor menu-panel border-radius">
        <button type="button" class="action expand-dropdown-trigger" aria-expanded="false">
          <span class="expand-dropdown-trigger-label">${escapeHtml(selectedLabel)}</span>
          <i class="material-icons expand-dropdown-chevron" aria-hidden="true">expand_more</i>
        </button>
      </div>
      <div class="expand-dropdown-body menu-panel border-radius" hidden>
        <div class="menu-option-list" role="listbox"></div>
      </div>
    `;

    this.labelEl = this.el.querySelector('.expand-dropdown-trigger-label')!;
    this.listEl = this.el.querySelector('.menu-option-list')!;
    renderOptions(this.listEl, options, selected);

    bindGlobalListeners();
    bindDropdown(this.el, (value) => this.onChange(value));
  }

  setOptions(options: DropdownOption[], selected: string): void {
    const label = options.find((o) => o.value === selected)?.label ?? selected;
    this.labelEl.textContent = label;
    renderOptions(this.listEl, options, selected);
    bindOptions(this.el, (value) => this.onChange(value));
  }

  setValue(value: string, label: string): void {
    this.labelEl.textContent = label;
    this.listEl.querySelectorAll('.menu-option').forEach((opt) => {
      opt.classList.toggle('menu-option--selected', opt.getAttribute('data-value') === value);
    });
  }
}
