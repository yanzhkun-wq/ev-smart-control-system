import type { PageEdit } from "../../miniapp-page-types";
import { EditableString } from "../EditableString";
import styles from "../../miniapp-preview/ShopsPreview.module.css";

const R = "pages/shops/shops";

export function ShopsVisual(props: { edits: PageEdit[]; onEditsChange: (e: PageEdit[]) => void }) {
  const { edits, onEditsChange } = props;
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <span className={styles.headTitle}>同城合作网点</span>
        <div className={styles.locRow}>
          <span className={styles.locTxt}>定位 · 杭州市</span>
          <span className={styles.locBtn}>更新定位</span>
        </div>
      </div>

      <div className={styles.tipCard}>
        <span className={styles.tipT}>顶部提示</span>
        <span className={styles.tipS}>
          <EditableString
            route={R}
            stringKey="shopsHeadTip"
            label="网点列表顶部提示"
            fallback=""
            edits={edits}
            onEditsChange={onEditsChange}
          />
        </span>
      </div>

      <div className={styles.shopCard}>
        <div className={styles.shopName}>示例升级网点（演示）</div>
        <div className={styles.shopAddr}>距您约 1.2 km · 可预约安装</div>
      </div>
    </div>
  );
}
