import type { PageEdit } from "../../miniapp-page-types";
import { EditableString } from "../EditableString";
import styles from "../../miniapp-preview/MallPreview.module.css";

const R_MALL = "pages/mall/mall";

export function MallVisual(props: { edits: PageEdit[]; onEditsChange: (e: PageEdit[]) => void }) {
  const { edits, onEditsChange } = props;
  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
        <div className={`${styles.tab} ${styles.tabOn}`}>选购设备</div>
        <div className={styles.tab}>我的订单</div>
      </div>

      <div className={styles.mallHero}>
        <div className={styles.mallHeroTop}>
          <div>
            <span className={styles.mallBrandT}>智控商城</span>
            <div className={styles.mallBrandS} style={{ display: "block" }}>
              <EditableString
                route={R_MALL}
                stringKey="mallSubtitle"
                label="商城顶部副标题"
                fallback="官方硬件 · 正品溯源"
                edits={edits}
                onEditsChange={onEditsChange}
              />
            </div>
          </div>
        </div>
        <span className={styles.mallHeroTip} style={{ display: "block" }}>
          <EditableString
            route={R_MALL}
            stringKey="mallHeroTip"
            label="商城紫色区域说明"
            fallback="下单后可在「我的订单」查看快递公司、运单号与物流进度。收到货请至「智控升级网点」安装。"
            edits={edits}
            onEditsChange={onEditsChange}
          />
        </span>
      </div>

      <div className={styles.feedCard}>
        <div className={styles.feedPh}>
          <span className={styles.feedPhT}>智控</span>
          <span className={styles.feedPhS}>示意图 · 以实物为准</span>
        </div>
        <div className={styles.feedBody}>
          <span className={styles.feedTitle}>车载智能终端（示例商品）</span>
          <span className={styles.feedSub}>808 定位 · 含安装说明</span>
          <span className={styles.feedPrice}>¥ 399 起</span>
        </div>
      </div>
    </div>
  );
}
