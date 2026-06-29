import styles from "./ShareAppPreview.module.css";

export function ShareAppPreview(props: { getString: (key: string, fallback: string) => string }) {
  const { getString: rs } = props;
  const headline = rs("shareHeadline", "邀请奖励");

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.rewardsHead}>
          <div className={styles.rewardsTitle}>{headline}</div>
          <div className={styles.rewardsSub}>好友完成绑定并入网后记数</div>
        </div>
        <div className={styles.tierRow}>
          <div className={styles.tierCell}>
            <div className={styles.tierTop}>
              <span className={styles.tierNum}>5</span>
              <span className={styles.tierUnit}>人</span>
            </div>
            <span className={styles.tierLine}>主机免单</span>
            <span className={styles.tierNote}>×1</span>
          </div>
          <div className={styles.tierV} />
          <div className={styles.tierCell}>
            <div className={styles.tierTop}>
              <span className={styles.tierNum}>8</span>
              <span className={styles.tierUnit}>人</span>
            </div>
            <span className={styles.tierLine}>VIP</span>
            <span className={styles.tierNote}>1 年</span>
          </div>
          <div className={styles.tierV} />
          <div className={styles.tierCell}>
            <div className={styles.tierTop}>
              <span className={styles.tierNum}>10</span>
              <span className={styles.tierUnit}>人</span>
            </div>
            <span className={styles.tierLine}>VIP</span>
            <span className={styles.tierNote}>3 年</span>
          </div>
        </div>
      </div>

      <div className={styles.ph}>邀请海报区（真机为图片）</div>
    </div>
  );
}
