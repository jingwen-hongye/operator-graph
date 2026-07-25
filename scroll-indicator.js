(function exposeScrollIndicator(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScrollIndicator = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildScrollIndicator() {
  function computeIndicatorState({
    scrollTop,
    scrollHeight,
    clientHeight,
    indicatorHeight = 48,
    inset = 8,
  }) {
    const scrollRange = Math.max(0, scrollHeight - clientHeight);
    const travel = Math.max(0, clientHeight - indicatorHeight - inset * 2);
    const progress = scrollRange
      ? Math.min(1, Math.max(0, scrollTop / scrollRange))
      : 0;

    return {
      visible: scrollRange > 0,
      top: Math.round(inset + travel * progress),
    };
  }

  function mount(scrollElement) {
    const host = scrollElement.parentElement;
    const indicator = document.createElement('span');

    host.classList.add('operator-scroll-host');
    scrollElement.classList.add('operator-short-scroll');
    indicator.className = 'operator-scroll-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    host.appendChild(indicator);

    let idleTimer = null;
    const update = () => {
      const state = computeIndicatorState(scrollElement);
      indicator.hidden = !state.visible;
      indicator.style.transform = `translateY(${scrollElement.offsetTop + state.top}px)`;
    };

    const handleScroll = () => {
      update();
      scrollElement.classList.add('is-scrolling');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        scrollElement.classList.remove('is-scrolling');
      }, 180);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(update)
      : null;
    resizeObserver?.observe(scrollElement);
    update();

    return {
      update,
      destroy() {
        window.clearTimeout(idleTimer);
        resizeObserver?.disconnect();
        scrollElement.removeEventListener('scroll', handleScroll);
        scrollElement.classList.remove('operator-short-scroll');
        indicator.remove();
        if (!host.querySelector('.operator-scroll-indicator')) {
          host.classList.remove('operator-scroll-host');
        }
      },
    };
  }

  return { computeIndicatorState, mount };
}));

