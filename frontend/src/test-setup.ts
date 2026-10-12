Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value(query: string) {
    return {
      matches: query.includes("min-width"),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    };
  },
});

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
