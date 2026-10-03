import { DEFAULT_THEME, getCss, type ITheme } from './style.js';

export type { ITheme } from './style.js';

export type TPlacement = 'top' | 'bottom';

export interface IOptions {
  placement: TPlacement;
  offset: number;
  theme: ITheme;
}

export interface IConfig extends Partial<Omit<IOptions, 'theme'>> {
  theme?: Partial<ITheme>;
}

export interface IInitialConfig extends IConfig {
  root?: Document | Element;
}

interface IAnchorEvent {
  currentTarget: EventTarget | null;
}

type TListener = (event: IAnchorEvent) => void;

interface ISize {
  width: number;
  height: number;
}

export interface IListeners {
  onMouseEnter: TListener;
  onMouseLeave: TListener;
  onFocus: TListener;
  onBlur: TListener;
}

const VIEWPORT_MARGIN = 8;
const ATTRIBUTE = 'data-tooltip';
const PLACEMENT_ATTRIBUTE = `${ATTRIBUTE}-placement`;
const PLACEMENTS: TPlacement[] = ['top', 'bottom'];

const getPlacement = (value: string | null) => PLACEMENTS.find((placement) => placement === value);

const getAnchor = (target: EventTarget | null) =>
  target instanceof Element ? target.closest(`[${ATTRIBUTE}]`) : null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getId = () => `tooltip-${Math.random().toString(36).slice(2, 10)}`;

export class Tooltip {
  readonly id: string;
  private element: HTMLDivElement | null = null;
  private style: HTMLStyleElement | null = null;
  private anchor: Element | null = null;
  private content: { text: string; placement?: TPlacement } | null = null;
  private observer: MutationObserver | null = null;
  private options: IOptions = { placement: 'top', offset: 8, theme: DEFAULT_THEME };
  private unlisten = () => {};

  constructor({ root, ...config }: IInitialConfig = {}) {
    this.id = getId();
    this.configure(config);

    const isBrowser = typeof document !== 'undefined';

    if (isBrowser) {
      this.unlisten = this.listen(root ?? document);
    }
  }

  configure({ theme, ...options }: IConfig) {
    this.options = { ...this.options, ...options, theme: { ...this.options.theme, ...theme } };

    if (this.style) {
      this.style.textContent = getCss(this.id, this.options.theme);
    }

    if (this.anchor && this.content) {
      this.show(this.anchor, this.content.text, this.content.placement);
    }
  }

  getListeners(text: string, placement?: TPlacement): IListeners {
    const show = (event: IAnchorEvent) => {
      if (event.currentTarget instanceof Element) {
        this.show(event.currentTarget, text, placement);
      }
    };

    const hide = (event: IAnchorEvent) => {
      if (event.currentTarget instanceof Element) {
        this.hide(event.currentTarget);
      }
    };

    return { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide };
  }

  attach(target: Element, text: string, placement?: TPlacement) {
    const listeners = Object.entries(this.getListeners(text, placement)).map(
      ([name, listener]) => [name.slice(2).toLowerCase(), listener] as const,
    );

    listeners.forEach(([type, listener]) => target.addEventListener(type, listener));

    return () => {
      listeners.forEach(([type, listener]) => target.removeEventListener(type, listener));
      this.hide(target);
    };
  }

  private listen(root: Document | Element) {
    const handleEnter = (event: Event) => {
      const anchor = getAnchor(event.target);

      if (anchor?.getAttribute(ATTRIBUTE) && anchor !== this.anchor && root.contains(anchor)) {
        this.showFromAttributes(anchor);
        this.observe(anchor);
      }
    };

    const handleLeave = (event: Event) => {
      const anchor = getAnchor(event.target);
      const { relatedTarget } = event as MouseEvent | FocusEvent;
      const isStayingInside = relatedTarget instanceof Node && anchor?.contains(relatedTarget);

      if (anchor && !isStayingInside) {
        this.hide(anchor);
      }
    };

    const listeners = [
      ['mouseover', handleEnter],
      ['focusin', handleEnter],
      ['mouseout', handleLeave],
      ['focusout', handleLeave],
    ] as const;

    listeners.forEach(([type, listener]) => root.addEventListener(type, listener));

    return () => listeners.forEach(([type, listener]) => root.removeEventListener(type, listener));
  }

  show = (anchor: Element, text: string, placement?: TPlacement) => {
    const element = this.mount();

    if (anchor !== this.anchor) {
      this.disconnect();
    }

    this.anchor?.removeAttribute('aria-describedby');
    this.anchor = anchor;
    this.content = { text, placement };
    anchor.setAttribute('aria-describedby', this.id);

    const isSwitching = getComputedStyle(element).display !== 'none';
    const previousSize = element.getBoundingClientRect();

    element.toggleAttribute('data-switching', isSwitching);
    element.hidden = false;
    const size = this.render(element, text, isSwitching);

    if (isSwitching) {
      this.resize(element, previousSize);
      element.getBoundingClientRect();
    }

    this.resize(element, size);
    this.position(anchor, element, placement ?? this.options.placement, size);

    window.addEventListener('scroll', this.handleScroll, true);
    document.addEventListener('keydown', this.handleKeyDown);
  };

  hide = (anchor?: Element) => {
    if (anchor && anchor !== this.anchor) {
      return;
    }

    this.disconnect();
    this.anchor?.removeAttribute('aria-describedby');
    this.anchor = null;
    this.content = null;

    if (this.element) {
      this.element.hidden = true;
    }

    window.removeEventListener('scroll', this.handleScroll, true);
    document.removeEventListener('keydown', this.handleKeyDown);
  };

  destroy() {
    this.unlisten();
    this.hide();
    this.element?.remove();
    this.style?.remove();
    this.element = null;
    this.style = null;
  }

  private showFromAttributes(anchor: Element) {
    const text = anchor.getAttribute(ATTRIBUTE);

    if (text) {
      this.show(anchor, text, getPlacement(anchor.getAttribute(PLACEMENT_ATTRIBUTE)));
    } else {
      this.hide(anchor);
    }
  }

  private observe(anchor: Element) {
    this.observer = new MutationObserver((records) => {
      const isChanged = records.some(({ attributeName, oldValue }) => anchor.getAttribute(attributeName!) !== oldValue);

      if (isChanged) {
        this.showFromAttributes(anchor);
      }
    });

    this.observer.observe(anchor, { attributeFilter: [ATTRIBUTE, PLACEMENT_ATTRIBUTE], attributeOldValue: true });
  }

  private disconnect() {
    this.observer?.disconnect();
    this.observer = null;
  }

  private mount() {
    if (this.element?.isConnected) {
      return this.element;
    }

    this.style?.remove();
    this.style = document.createElement('style');
    this.style.textContent = getCss(this.id, this.options.theme);
    document.head.append(this.style);

    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.setAttribute('role', 'tooltip');
    this.element.hidden = true;
    document.body.append(this.element);

    return this.element;
  }

  private render(element: HTMLElement, text: string, isSwitching: boolean): ISize {
    const previousContent = isSwitching ? (element.lastElementChild as HTMLElement | null) : null;
    const content = previousContent?.textContent === text ? previousContent : document.createElement('span');

    if (content === previousContent) {
      element.replaceChildren(content);
    } else {
      previousContent?.setAttribute('data-leaving', '');
      previousContent?.setAttribute('aria-hidden', 'true');
      content.textContent = text;
      element.replaceChildren(...(previousContent ? [previousContent] : []), content);
    }

    content.style.width = '';
    element.style.width = '';
    element.style.height = '';
    element.style.maxWidth = '';
    const { width, height } = element.getBoundingClientRect();
    content.style.width = `${Math.ceil(content.getBoundingClientRect().width)}px`;

    return { width: Math.ceil(width), height: Math.ceil(height) };
  }

  private resize(element: HTMLElement, { width, height }: ISize) {
    element.style.maxWidth = 'none';
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
  }

  private position(anchor: Element, element: HTMLElement, placement: TPlacement, { width, height }: ISize) {
    const anchorRect = anchor.getBoundingClientRect();
    const { offset } = this.options;

    const top = { above: anchorRect.top - height - offset, below: anchorRect.bottom + offset };
    const fitsAbove = top.above >= VIEWPORT_MARGIN;
    const fitsBelow = top.below + height <= window.innerHeight - VIEWPORT_MARGIN;
    const isAbove = placement === 'top' ? fitsAbove || !fitsBelow : fitsAbove && !fitsBelow;

    const left = clamp(
      anchorRect.left + anchorRect.width / 2 - width / 2,
      VIEWPORT_MARGIN,
      window.innerWidth - width - VIEWPORT_MARGIN,
    );

    element.dataset.placement = isAbove ? 'top' : 'bottom';
    element.style.transform = `translate(${Math.round(left)}px, ${Math.round(isAbove ? top.above : top.below)}px)`;
  }

  private handleScroll = () => this.hide();

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.hide();
    }
  };
}
