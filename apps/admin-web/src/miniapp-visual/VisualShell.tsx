import type { ReactNode } from "react";
import type { PageEdit } from "../miniapp-page-types";
import { EditableNavTitle } from "./EditableString";
import styles from "./visualShell.module.css";

function pageEnabled(edits: PageEdit[], route: string) {
  const p = edits.find((e) => e.route === route);
  return p ? p.enabled !== false : true;
}

export function VisualShell(props: {
  navRoute: string;
  edits: PageEdit[];
  onEditsChange: (next: PageEdit[]) => void;
  showBack: boolean;
  onBack: () => void;
  showTabBar: boolean;
  tab: 0 | 1;
  onTab: (i: 0 | 1) => void;
  children: ReactNode;
}) {
  const { navRoute, edits, onEditsChange, showBack, onBack, showTabBar, tab, onTab, children } = props;
  const dis = !pageEnabled(edits, navRoute);

  return (
    <div className={styles.device}>
      <div className={styles.statusBar} />
      <div className={styles.nav}>
        {showBack ? (
          <span className={styles.back} onClick={onBack} role="button" tabIndex={0}>
            ‹
          </span>
        ) : null}
        <div className={styles.navTitleWrap}>
          <EditableNavTitle route={navRoute} edits={edits} onEditsChange={onEditsChange} />
        </div>
      </div>
      {dis ? <div className={styles.dis}>此页在后台已关闭，保存后真机无法进入。</div> : null}
      <div className={styles.body}>{children}</div>
      {showTabBar ? (
        <div className={styles.tabbar}>
          <div
            className={tab === 0 ? styles.tabOn : styles.tab}
            onClick={() => onTab(0)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.tabIco}>🏠</span>
            首页
          </div>
          <div
            className={tab === 1 ? styles.tabOn : styles.tab}
            onClick={() => onTab(1)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.tabIco}>👤</span>
            我的
          </div>
        </div>
      ) : null}
    </div>
  );
}
