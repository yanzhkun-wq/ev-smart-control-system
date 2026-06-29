import type { MiniappPageEditLite } from "./buildGetString";
import styles from "./GenericStringsPreview.module.css";

export function GenericStringsPreview(props: { page: MiniappPageEditLite }) {
  const rows = props.page.stringRows.filter((r) => r.key.trim() && r.value.trim());

  if (!rows.length) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>暂无文案，可在左侧该页面填写后出现预览。</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.note}>这一页还没做完整预览，下面是你填写的文案。</div>
      {rows.map((r, i) => (
        <div key={`${r.key}-${i}`} className={styles.card}>
          <div className={styles.v}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}
