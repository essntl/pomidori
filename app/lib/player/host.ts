/** Hidden container the platform iframes live in. Kept in the DOM for the whole session. */
export function playerHost() {
  let host = document.getElementById("pomidori-player-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "pomidori-player-host";
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "200px",
      height: "200px",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
      overflow: "hidden",
    });
    document.body.appendChild(host);
  }
  return host;
}

const scripts = new Map<string, Promise<void>>();

export function loadScript(src: string) {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scripts.delete(src);
        reject(new Error(`Could not load ${src}`));
      };
      document.head.appendChild(s);
    });
    scripts.set(src, p);
  }
  return p;
}
