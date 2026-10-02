export interface ITheme {
  background: string;
  color: string;
  font: string;
  radius: number;
  maxWidth: number;
  zIndex: number;
  duration: number;
}

export const DEFAULT_THEME: ITheme = {
  background: '#1f2329',
  color: '#fff',
  font: '12px/1.4 system-ui, sans-serif',
  radius: 6,
  maxWidth: 280,
  zIndex: 10000,
  duration: 200,
};

export const getCss = (id: string, theme: ITheme) => `
#${id} {
  position: fixed;
  top: 0;
  left: 0;
  z-index: ${theme.zIndex};
  box-sizing: border-box;
  max-width: ${theme.maxWidth}px;
  overflow: hidden;
  padding: 6px 10px;
  border-radius: ${theme.radius}px;
  background: ${theme.background};
  color: ${theme.color};
  font: ${theme.font};
  pointer-events: none;
  white-space: pre-line;
  word-wrap: break-word;
  transition-property: opacity, translate, display, background-color, color, border-radius;
  transition-duration: ${theme.duration}ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  transition-behavior: normal, normal, allow-discrete, normal, normal, normal;
}

#${id} > span {
  display: block;
}

#${id}[data-switching] {
  transition-property: opacity, translate, display, background-color, color, border-radius, transform, width, height;
  transition-behavior: normal, normal, allow-discrete, normal, normal, normal, normal, normal, normal;
}

#${id} > span[data-leaving] + span {
  animation: ${id}-text-in ${theme.duration}ms ease-out;
}

#${id} > span[data-leaving] {
  position: absolute;
  animation: ${id}-text-out ${theme.duration / 2}ms ease-out forwards;
}

@keyframes ${id}-text-in {
  from {
    opacity: 0;
  }
}

@keyframes ${id}-text-out {
  to {
    opacity: 0;
  }
}

/* The delay keeps the tooltip opaque while the pointer crosses the gap to the next anchor */
#${id}[hidden] {
  display: none;
  opacity: 0;
  translate: 0 -4px;
  transition-delay: 80ms;
}

@starting-style {
  #${id} {
    opacity: 0;
    translate: 0 -4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #${id},
  #${id} > span,
  #${id} > span[data-leaving] + span {
    transition: none;
    animation: none;
  }

  #${id} > span[data-leaving] {
    display: none;
  }
}
`;
