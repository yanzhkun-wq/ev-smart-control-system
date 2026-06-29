/** 与小程序 remoteUi.getString 一致：仅当后台填了非空文案才覆盖默认 */

export type MiniappStringRow = { key: string; value: string };

export type MiniappPageEditLite = {
  route: string;
  navigationBarTitle: string;
  enabled: boolean;
  stringRows: MiniappStringRow[];
};

export function buildGetString(edits: MiniappPageEditLite[], route: string) {
  const page = edits.find((e) => e.route === route);
  const m = new Map<string, string>();
  for (const r of page?.stringRows ?? []) {
    const k = r.key.trim();
    if (!k) continue;
    const v = r.value.trim();
    if (v.length) m.set(k, v);
  }
  return (key: string, fallback: string) => {
    const v = m.get(key);
    return v != null && v.length > 0 ? v : fallback;
  };
}

export function navigationTitleForRoute(edits: MiniappPageEditLite[], route: string) {
  const page = edits.find((e) => e.route === route);
  return page?.navigationBarTitle?.trim() || route;
}

export function pageEnabled(edits: MiniappPageEditLite[], route: string) {
  const page = edits.find((e) => e.route === route);
  return page ? page.enabled !== false : true;
}
