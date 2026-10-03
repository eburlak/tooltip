import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './index.js';

let tooltip: Tooltip;

const getTooltip = () => document.getElementById(tooltip.id) as HTMLDivElement;
const getStyle = () => document.head.querySelector('style')?.textContent ?? '';

const createButton = () => {
  const button = document.createElement('button');
  document.body.append(button);
  return button;
};

beforeEach(() => {
  tooltip = new Tooltip();
});

afterEach(() => {
  tooltip.destroy();
  document.querySelectorAll('button').forEach((button) => button.remove());
});

describe('tooltip', () => {
  it('mounts nothing until the first show', () => {
    expect(getTooltip()).toBeNull();

    tooltip.show(createButton(), 'Save');
    tooltip.hide();
    expect(getTooltip().hidden).toBe(true);
    expect(getTooltip().getAttribute('role')).toBe('tooltip');
  });

  it('shows and hides via spreadable listeners', () => {
    const button = createButton();
    const listeners = tooltip.getListeners('Save');

    listeners.onMouseEnter({ currentTarget: button });
    expect(getTooltip().hidden).toBe(false);
    expect(getTooltip().textContent).toBe('Save');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);

    listeners.onMouseLeave({ currentTarget: button });
    expect(getTooltip().hidden).toBe(true);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
  });

  it('attaches native listeners and detaches them', () => {
    const button = createButton();
    const detach = tooltip.attach(button, 'Delete');

    button.dispatchEvent(new FocusEvent('focus'));
    expect(getTooltip().textContent).toBe('Delete');
    expect(getTooltip().hidden).toBe(false);

    detach();
    expect(getTooltip().hidden).toBe(true);

    button.dispatchEvent(new MouseEvent('mouseenter'));
    expect(getTooltip().hidden).toBe(true);
  });

  it('hides for a given anchor only while it is the current one', () => {
    const first = createButton();
    const second = createButton();

    tooltip.show(first, 'First');
    tooltip.show(second, 'Second');
    tooltip.hide(first);
    expect(getTooltip().hidden).toBe(false);

    tooltip.hide(second);
    expect(getTooltip().hidden).toBe(true);
  });

  it('ignores blur of an anchor the tooltip has already left', () => {
    const focused = createButton();
    const hovered = createButton();
    tooltip.attach(focused, 'Focused');
    tooltip.attach(hovered, 'Hovered');

    focused.dispatchEvent(new FocusEvent('focus'));
    hovered.dispatchEvent(new MouseEvent('mouseenter'));
    focused.dispatchEvent(new FocusEvent('blur'));

    expect(getTooltip().hidden).toBe(false);
    expect(getTooltip().lastElementChild?.textContent).toBe('Hovered');
  });

  it('hides on Escape and on scroll', () => {
    const button = createButton();

    tooltip.show(button, 'Text');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(getTooltip().hidden).toBe(true);

    tooltip.show(button, 'Text');
    window.dispatchEvent(new Event('scroll'));
    expect(getTooltip().hidden).toBe(true);
  });

  it('animates the move only when switching from a visible tooltip', () => {
    tooltip.show(createButton(), 'One');
    expect(getTooltip().hasAttribute('data-switching')).toBe(false);

    tooltip.show(createButton(), 'Two');
    expect(getTooltip().hasAttribute('data-switching')).toBe(true);
    expect(getTooltip().lastElementChild?.textContent).toBe('Two');
    expect(getTooltip().querySelector('[data-leaving]')?.getAttribute('aria-hidden')).toBe('true');

    tooltip.hide();
    tooltip.show(createButton(), 'Three');
    expect(getTooltip().hasAttribute('data-switching')).toBe(false);
  });

  describe('placement', () => {
    const createRoomyButton = () => {
      const button = createButton();
      button.getBoundingClientRect = () => new DOMRect(100, 300, 80, 20);
      return button;
    };

    const getPlacement = () => getTooltip().dataset.placement;

    it('moves an open tooltip to the new default placement on configure', () => {
      tooltip.show(createRoomyButton(), 'Text');
      expect(getPlacement()).toBe('top');

      tooltip.configure({ placement: 'bottom' });
      expect(getPlacement()).toBe('bottom');
    });

    it('keeps an explicit placement of an open tooltip on configure', () => {
      tooltip.show(createRoomyButton(), 'Text', 'top');
      tooltip.configure({ placement: 'bottom' });

      expect(getPlacement()).toBe('top');
    });
  });

  it('keeps a single element and remounts after destroy', () => {
    tooltip.show(createButton(), 'One');
    tooltip.show(createButton(), 'Two');
    expect(document.querySelectorAll(`#${tooltip.id}`)).toHaveLength(1);

    tooltip.destroy();
    expect(getTooltip()).toBeNull();

    tooltip.show(createButton(), 'Three');
    expect(document.querySelectorAll(`#${tooltip.id}`)).toHaveLength(1);
    expect(document.querySelectorAll('style')).toHaveLength(1);
  });
});

describe('delegation', () => {
  const createAnchor = (attributes: Record<string, string>) => {
    const button = createButton();
    Object.entries(attributes).forEach(([name, value]) => button.setAttribute(name, value));
    button.append(document.createElement('i'));
    return button;
  };

  const flushMutations = () => new Promise((resolve) => setTimeout(resolve));

  const hover = (target: Element) => target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  const leave = (target: Element, relatedTarget: Element) =>
    target.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget }));

  it('shows text and placement from data attributes, including nested targets', () => {
    const button = createAnchor({ 'data-tooltip': 'Delete', 'data-tooltip-placement': 'bottom' });

    hover(button.firstElementChild!);
    expect(getTooltip().hidden).toBe(false);
    expect(getTooltip().textContent).toBe('Delete');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('hides only when the pointer leaves the anchor', () => {
    const button = createAnchor({ 'data-tooltip': 'Save' });

    hover(button);
    leave(button, button.firstElementChild!);
    expect(getTooltip().hidden).toBe(false);

    leave(button.firstElementChild!, document.body);
    expect(getTooltip().hidden).toBe(true);
  });

  it('handles focus and reads the attribute at show time', () => {
    const button = createAnchor({ 'data-tooltip': 'Old' });
    button.setAttribute('data-tooltip', 'New');

    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(getTooltip().textContent).toBe('New');

    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(getTooltip().hidden).toBe(true);
  });

  it('follows attribute changes while the tooltip is shown', async () => {
    const button = createAnchor({ 'data-tooltip': 'Copy' });

    hover(button);
    button.setAttribute('data-tooltip', 'Copied!');
    button.setAttribute('data-tooltip-placement', 'bottom');
    await flushMutations();

    expect(getTooltip().lastElementChild?.textContent).toBe('Copied!');
    expect(getTooltip().hasAttribute('data-switching')).toBe(true);
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('ignores writes of the same value', async () => {
    const button = createAnchor({ 'data-tooltip': 'Copy' });

    hover(button);
    button.setAttribute('data-tooltip', 'Copy');
    await flushMutations();

    expect(getTooltip().querySelector('[data-leaving]')).toBeNull();
  });

  it('hides when the text is removed while shown', async () => {
    const button = createAnchor({ 'data-tooltip': 'Copy' });

    hover(button);
    button.removeAttribute('data-tooltip');
    await flushMutations();

    expect(getTooltip().hidden).toBe(true);
  });

  it('stops following the anchor after it is left', async () => {
    const button = createAnchor({ 'data-tooltip': 'Copy' });

    hover(button);
    leave(button, document.body);
    button.setAttribute('data-tooltip', 'Copied!');
    await flushMutations();

    expect(getTooltip().hidden).toBe(true);
    expect(getTooltip().textContent).toBe('Copy');
  });

  it('listens only inside the given root and stops after destroy', () => {
    const root = document.createElement('div');
    document.body.append(root);
    tooltip.destroy();
    tooltip = new Tooltip({ root });

    hover(createAnchor({ 'data-tooltip': 'Outside' }));
    expect(getTooltip()).toBeNull();

    const inside = createAnchor({ 'data-tooltip': 'Inside' });
    root.append(inside);
    hover(inside);
    expect(getTooltip().textContent).toBe('Inside');

    tooltip.destroy();
    expect(getTooltip()).toBeNull();

    hover(inside);
    expect(getTooltip()).toBeNull();
    root.remove();
  });

  it('skips listening where there is no document', () => {
    vi.stubGlobal('document', undefined);

    try {
      expect(() => new Tooltip()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('theme', () => {
  it('builds styles from the constructor theme merged with defaults', () => {
    tooltip.destroy();
    tooltip = new Tooltip({ theme: { background: '#3b5bdb', maxWidth: 240 } });
    tooltip.show(createButton(), 'Themed');

    expect(getStyle()).toContain('background: #3b5bdb;');
    expect(getStyle()).toContain('max-width: 240px;');
    expect(getStyle()).toContain('color: #fff;');
  });

  it('regenerates the mounted styles on configure', () => {
    tooltip.show(createButton(), 'Themed');
    tooltip.configure({ theme: { color: '#000', duration: 100 } });

    expect(getStyle()).toContain('color: #000;');
    expect(getStyle()).toContain('transition-duration: 100ms;');
    expect(getStyle()).toContain('background: #1f2329;');
    expect(document.querySelectorAll('style')).toHaveLength(1);
  });

  it('re-renders an open tooltip on configure without crossfading the same text', () => {
    const button = createButton();
    tooltip.show(button, 'Themed');
    const content = getTooltip().lastElementChild;

    tooltip.configure({ theme: { maxWidth: 120 } });

    expect(getTooltip().hasAttribute('data-switching')).toBe(true);
    expect(getTooltip().children).toHaveLength(1);
    expect(getTooltip().lastElementChild).toBe(content);
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('disables every animation under reduced motion', () => {
    tooltip.show(createButton(), 'Themed');
    const rules = Array.from(document.head.querySelector('style')!.sheet!.cssRules);
    const reducedMotion = rules.find((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)!;
    const getSelectors = (rule: CSSStyleRule) => rule.selectorText.split(',').map((selector) => selector.trim());

    const animated = rules
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && Boolean(rule.style.animation))
      .map((rule) => rule.selectorText);
    const disabled = Array.from(reducedMotion.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      .filter((rule) => rule.style.animation === 'none' || rule.style.display === 'none')
      .flatMap(getSelectors);

    expect(animated.length).toBeGreaterThan(0);
    expect(disabled).toEqual(expect.arrayContaining(animated));
  });

  it('does not show a hidden tooltip on configure', () => {
    tooltip.show(createButton(), 'Themed');
    tooltip.hide();
    tooltip.configure({ theme: { background: '#000' } });

    expect(getTooltip().hidden).toBe(true);
  });

  it('gives every instance its own element and styles', () => {
    const accent = new Tooltip({ theme: { background: '#3b5bdb' } });
    tooltip.show(createButton(), 'Default');
    accent.show(createButton(), 'Accent');

    expect(accent.id).not.toBe(tooltip.id);
    expect(accent.id).toMatch(/^tooltip-[a-z0-9]+$/);
    expect(document.getElementById(accent.id)?.textContent).toBe('Accent');
    expect(getTooltip().textContent).toBe('Default');
    expect(document.querySelectorAll('style')).toHaveLength(2);

    accent.destroy();
  });
});
