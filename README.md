# @eburlak/tooltip

Tooltip without dependencies, for React and plain HTML. An instance mounts one
`<div role="tooltip">` and one `<style>` on the first `show`; every anchor it serves reuses
the same element. Create one instance per app and share it.

```sh
npm install @eburlak/tooltip
```

## Markup

One delegated `listen()` serves every `[data-tooltip]` under the root, including elements
added later. While a tooltip is open its anchor is observed: a new `data-tooltip` or
`data-tooltip-placement` is applied right away with the same crossfade, removing the text
hides it.

```html
<button data-tooltip="Save changes">Save</button>
<button data-tooltip="Delete forever" data-tooltip-placement="bottom">Delete</button>

<script type="module">
  import { Tooltip } from 'https://cdn.jsdelivr.net/npm/@eburlak/tooltip/+esm';

  const tooltip = new Tooltip({ theme: { background: '#3b5bdb' } });
  const unlisten = tooltip.listen();
</script>
```

Without modules (works from `file://` too) - `dist/index.global.js` sets `window.Tooltip`.
It is also the default file on unpkg and jsDelivr, and `@eburlak/tooltip/global` for bundlers:

```html
<script src="https://cdn.jsdelivr.net/npm/@eburlak/tooltip"></script>
<script>
  new Tooltip().listen();
</script>
```

## React

The same attributes work in JSX after one `listen()` at startup, and a re-render that
changes the text updates the open tooltip (`data-tooltip={isCopied ? 'Copied!' : 'Copy'}`):

```tsx
// tooltip.ts
import { Tooltip } from '@eburlak/tooltip';

export const tooltip = new Tooltip({ theme: { maxWidth: 240 } });
tooltip.listen();
```

```tsx
<button data-tooltip="Save changes">Save</button>
<a href="#" data-tooltip="Open" data-tooltip-placement="bottom">Open</a>
```

Or spread listeners on a single element without a global `listen()`; their text is fixed
when they are created, call `tooltip.show(anchor, text)` to change an open tooltip:

```tsx
<button {...tooltip.getListeners('Save changes')}>Save</button>
```

## API

| Method | Purpose |
| --- | --- |
| `new Tooltip({ placement, offset, theme })` | defaults: `'top'`, `8`, theme below |
| `listen(root = document)` | delegated listeners for `[data-tooltip]` / `[data-tooltip-placement]`, returns `unlisten()` |
| `getListeners(text, placement?)` | `{ onMouseEnter, onMouseLeave, onFocus, onBlur }` to spread on a React element |
| `attach(element, text, placement?)` | the same listeners via `addEventListener`, returns `detach()` |
| `show(anchor, text, placement?)` / `hide(anchor?)` | manual control; with an anchor, `hide` does nothing once the tooltip has moved to another one |
| `configure({ placement, offset, theme })` | merges into the current options; a theme regenerates the mounted styles and an open tooltip animates into it |
| `destroy()` | removes markup and styles; the next `show` mounts them again |
| `id` | random element id, `tooltip-` plus 8 characters, unique per instance |

## Theme

Any subset, merged with the defaults; styles are generated from the values, no CSS variables.

| Key | Default |
| --- | --- |
| `background` | `'#1f2329'` |
| `color` | `'#fff'` |
| `font` | `'12px/1.4 system-ui, sans-serif'` |
| `radius` | `6` (px) |
| `maxWidth` | `280` (px) |
| `zIndex` | `10000` |
| `duration` | `200` (ms, every animation) |

Fades in sliding down and fades out sliding up. Moving to another anchor while still
visible slides and resizes it and crossfades the text; an 80ms hide delay keeps it opaque
while the pointer crosses the gap. Hides on mouse leave, blur, `Escape` and any scroll.
Flips to the other side when the preferred one does not fit and clamps to the viewport
horizontally.

Animations are off under `prefers-reduced-motion`.

## Scripts

`npm run build` - a clean `dist/` via tsc plus `dist/index.global.js`, `npm test` - vitest + jsdom,
`example/index.html` - demo, open it straight from disk after the build.

`npm publish` builds the package on `prepack` and runs the tests on `prepublishOnly`.

## License

MIT
