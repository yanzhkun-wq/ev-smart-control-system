import type { PageEdit } from "../../miniapp-page-types";
import { EditableString } from "../EditableString";
import styles from "../../miniapp-preview/ShareAppPreview.module.css";

const R = "pages/share-app/share-app";

export function ShareVisual(props: { edits: PageEdit[]; onEditsChange: (e: PageEdit[]) => void }) {
  const { edits, onEditsChange } = props;
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.rewardsHead}>
          <div className={styles.rewardsTitle}>
            <EditableString
              route={R}
              stringKey="shareHeadline"
              label="邀请页主标题"
              fallback="邀请奖励"
              edits={edits}
              onEditsChange={onEditsChange}
            />
          </div>
          <div className={styles.rewardsSub}>好友完成绑定并入网后记数</div>
        </div>
        <div className={styles.tierRow}>
          <div className={styles.tierCell}>
            <div className={styles.tierTop}>
              <span className={styles.tierNum}>5</span>
              <span className={styles.tierUnit}>人</span>
            </div>
            <span className={styles.tierLine}>主机免单</span>
          </div>
          <div className={styles.tierV} />
          <div className={styles.tierCell}>
            <div className={styles.tierTop}>
              <span className={styles.tierNum}>8</span>
              <span className={styles.tierUnit}>人</span>
            </div>
            <span className={styles.tierLine}>VIP</span>
          </div>
          <div className={styles.tierV} />
          <div className={styles.tierCell}>
            <div className={styles.tierTop}>
              <span className={styles.tierNum}>10</span>
              <span className={styles.tierUnit}>人</span>
            </div>
            <span className={styles.tierLine}>VIP</span>
          </div>
        </div>
      </div>
      <div className={styles.ph}>邀请海报区（真机为图片）</div>
    </div>
  );
}
