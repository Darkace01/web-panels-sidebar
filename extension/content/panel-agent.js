"use strict";

// Runs in every web frame. It stays silent unless the Zen Sidebar page (a
// moz-extension:// page that is this frame's direct parent) says hello first;
// then it reports its address, title and unread count to that page, applies
// per-panel dark mode / custom CSS, and obeys back/forward/reload requests.
(() => {
  if (window === window.top) return;

  let host = null;
  let hostOrigin = "";
  let last = "";
  let timer = 0;

  const post = msg => host?.postMessage({ __zs: true, ...msg }, hostOrigin);

  // "(3) WhatsApp", "[12] Inbox" -> 3, 12
  const badgeOf = title => {
    const m = /^\s*[([](\d{1,4})\+?[)\]]/.exec(title);
    return m ? Number(m[1]) : 0;
  };

  const report = () => {
    const url = location.href;
    const title = document.title;
    const key = url + "\n" + title;
    if (key === last) return;
    last = key;
    post({ type: "state", url, title, badge: badgeOf(title) });
  };

  const DARK_CSS = `
    html { filter: invert(1) hue-rotate(180deg) !important; background: #fff !important; }
    img, picture, video, canvas, iframe, svg image, [style*="background-image"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }`;

  const setStyle = (id, css) => {
    let style = document.getElementById(id);
    if (!css) return style?.remove();
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      (document.head || document.documentElement).append(style);
    }
    if (style.textContent !== css) style.textContent = css;
  };

  const apply = cfg => {
    setStyle("zs-dark", cfg.dark ? DARK_CSS : "");
    setStyle("zs-css", typeof cfg.css === "string" ? cfg.css : "");
  };

  addEventListener("message", e => {
    const d = e.data;
    if (!d || d.__zs !== true) return;
    if (e.source !== window.parent || !e.origin.startsWith("moz-extension://")) return;
    switch (d.type) {
      case "init":
        host = e.source;
        hostOrigin = e.origin;
        apply(d);
        last = "";
        report();
        clearInterval(timer);
        timer = setInterval(report, 700); // catches SPA navigation too
        break;
      case "back":
        history.back();
        break;
      case "forward":
        history.forward();
        break;
      case "reload":
        location.reload();
        break;
    }
  });
})();
