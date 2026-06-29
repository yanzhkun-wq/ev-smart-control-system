import styles from "./ShopsPreview.module.css";

export function ShopsPreview(props: { getString: (key: string, fallback: string) => string }) {
  const { getString: rs } = props;
  const tip = rs("shopsHeadTip", "");

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <span className={styles.headTitle}>同城合作网点</span>
        <div className={styles.locRow}>
          <span className={styles.locTxt}>定位 · 杭州市</span>
          <span className={styles.locBtn}>更新定位</span>
        </div>
      </div>

      {tip ? (
        <div className={styles.tipCard}>
          <span className={styles.tipT}>运营提示</span>
          <span className={styles.tipS}>{tip}</span>
        </div>
      ) : null}

      <div className={styles.shopCard}>
        <div className={styles.shopName}>示例升级网点（演示）</div>
        <div className={styles.shopAddr}>距您约 1.2 km · 可预约安装</div>
      </div>
    </div>
  );
}
