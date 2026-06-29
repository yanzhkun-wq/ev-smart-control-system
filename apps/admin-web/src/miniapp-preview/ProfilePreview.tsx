import styles from "./ProfilePreview.module.css";

export function ProfilePreview(props: { getString: (key: string, fallback: string) => string }) {
  const { getString: rs } = props;
  const slogan = rs("profileSlogan", "");

  return (
    <div className={styles.shell}>
      <div className={styles.hero}>
        <div className={styles.card}>
          <div className={styles.main}>
            <div className={styles.avatar}>用</div>
            <div>
              <div className={styles.name}>演示用户</div>
              <div className={styles.sub}>账号 demo · 车主</div>
            </div>
          </div>
          {slogan ? <div className={styles.slogan}>{slogan}</div> : null}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTitle}>常用服务</div>
        <div className={styles.grid}>
          {[
            { c: "行", n: "行车记录" },
            { c: "警", n: "防盗报警" },
            { c: "围", n: "电子围栏" },
            { c: "权", n: "授权管理" },
          ].map((x) => (
            <div key={x.c} className={styles.cell}>
              <div className={styles.ico}>{x.c}</div>
              <div className={styles.cellName}>{x.n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
