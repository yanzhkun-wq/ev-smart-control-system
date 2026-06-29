import type { PageEdit } from "../miniapp-page-types";

export function updateEditString(edits: PageEdit[], route: string, key: string, value: string): PageEdit[] {
  return edits.map((p) => {
    if (p.route !== route) return p;
    let found = false;
    const stringRows = p.stringRows.map((r) => {
      if (r.key !== key) return r;
      found = true;
      return { ...r, value };
    });
    if (!found && key.trim()) {
      return {
        ...p,
        stringRows: [...stringRows, { key: key.trim(), value, hint: "自定义" }],
      };
    }
    return { ...p, stringRows };
  });
}

export function updateNavigationTitle(edits: PageEdit[], route: string, title: string): PageEdit[] {
  return edits.map((p) => (p.route === route ? { ...p, navigationBarTitle: title } : p));
}

export function togglePageEnabled(edits: PageEdit[], route: string, enabled: boolean): PageEdit[] {
  return edits.map((p) => (p.route === route ? { ...p, enabled } : p));
}
