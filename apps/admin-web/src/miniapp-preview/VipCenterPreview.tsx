import styles from "./VipCenterPreview.module.css";

export type VipPreviewMode = "needLogin" | "loadErr" | "notGate" | "super" | "vip";

const PAY = "36.5";
const INVITE_HINT_DEMO = "邀请 3 位好友完成绑定并入网（演示数据）。";
const ORDER_HINT = "邀请好友完成绑定并入网，达标即可开通。";

export function VipCenterPreview(props: {
  getString: (key: string, fallback: string) => string;
  mode: VipPreviewMode;
}) {
  const { getString: rs, mode } = props;

  if (mode === "needLogin") {
    return (
      <div className={styles.root}>
        <div className={`${styles.vipCard} ${styles.loginCard}`}>
          <span className={styles.loginT}>请先登录后查看 VIP 权益</span>
          <div className={styles.loginBtn}>去首页登录</div>
        </div>
      </div>
    );
  }

  if (mode === "loadErr") {
    return (
      <div className={styles.root}>
        <div className={`${styles.vipCard} ${styles.errCard}`}>
          <span className={styles.errT}>页面加载异常</span>
          <span className={styles.errS}>演示：接口超时示例</span>
          <div className={styles.loginBtn}>返回首页</div>
        </div>
      </div>
    );
  }

  const payPriceStr = PAY;
  let statusTitle = rs("titleNotOpen", "尚未开通 VIP");
  let statusSub = ORDER_HINT;
  let gateOk = false;
  let isSuper = false;
  let showPayCta = true;
  let showInviteBlock = true;
  let showSoftInvite = false;

  if (mode === "notGate") {
    /* 与 vip-center.js 一致：无 vipOrderHint 时走 subNotOpen */
    statusSub = rs("subNotOpen", ORDER_HINT);
    const payTail = rs("paySuffix", ` 也可直接付费 ¥${payPriceStr}/年 立即开通。`);
    statusSub = `${statusSub}${payTail}`;
    gateOk = false;
    isSuper = false;
  } else if (mode === "super") {
    gateOk = true;
    isSuper = true;
    showPayCta = false;
    showInviteBlock = false;
    showSoftInvite = true;
    statusTitle = rs("titleSuper", "权益已解锁");
    statusSub = rs(
      "subSuper",
      "演示超管可使用电子围栏与多账号授权（正式环境以平台规则为准）。",
    );
  } else if (mode === "vip") {
    gateOk = true;
    isSuper = false;
    showPayCta = true;
    showInviteBlock = false;
    showSoftInvite = true;
    statusTitle = rs("titleVipActive", "VIP 已开通");
    statusSub = "有效期至 2027-12-31";
  }

  return (
    <div className={styles.root}>
      <div className={`${styles.vipCard} ${styles.statusCard}`}>
        <span className={styles.statusK}>会员状态</span>
        <span className={styles.statusTitle}>{statusTitle}</span>
        <span className={styles.statusSub}>{statusSub}</span>
      </div>

      <span className={styles.secLabel}>包含权益</span>

      <div className={`${styles.vipCard} ${styles.benefit}`}>
        <div className={`${styles.benefitIco} ${styles.icoTeal}`}>
          <span className={styles.benefitChar}>围</span>
        </div>
        <div className={styles.benefitBody}>
          <span className={styles.benefitName}>电子围栏</span>
          <span className={styles.benefitDesc}>设置车辆活动区域，驶出或驶入可告警提醒（演示）。</span>
        </div>
        <span className={styles.benefitArr}>›</span>
      </div>

      <div className={`${styles.vipCard} ${styles.benefit}`}>
        <div className={`${styles.benefitIco} ${styles.icoSky}`}>
          <span className={styles.benefitChar}>权</span>
        </div>
        <div className={styles.benefitBody}>
          <span className={styles.benefitName}>授权管理 · 多账号用车</span>
          <span className={styles.benefitDesc}>主账号授权亲友手机号用车；支持多名用车人协同（演示）。</span>
        </div>
        <span className={styles.benefitArr}>›</span>
      </div>

      {showPayCta && !isSuper && (
        <div className={`${styles.vipCard} ${styles.cta} ${styles.payCta}`}>
          <span className={styles.ctaTitle}>付费开通 / 续费</span>
          <span className={styles.ctaDesc}>
            ¥{payPriceStr} / 年，支付后立即生效；可与邀请达标权益叠加。
          </span>
          <span className={styles.ctaMore}>
            演示版点击确认即视为支付成功；正式环境需接入微信支付回调后再写入会员。
          </span>
          <div className={`${styles.ctaBtn} ${styles.ctaBtnPay}`}>
            {gateOk ? "续费一年" : "立即支付"} ¥{payPriceStr} / 年
          </div>
        </div>
      )}

      {showInviteBlock && !gateOk && (
        <div className={`${styles.vipCard} ${styles.cta}`}>
          <span className={styles.ctaTitle}>邀请好友开通</span>
          <span className={styles.ctaDesc}>{INVITE_HINT_DEMO}</span>
          <span className={styles.ctaMore}>
            邀请好友达标后，系统自动延长 VIP 有效期（演示数据仅存本机）。
          </span>
          <div className={styles.ctaBtn}>邀请好友 · 查看进度</div>
        </div>
      )}

      {showSoftInvite && gateOk && (
        <div className={`${styles.vipCard} ${styles.cta} ${styles.ctaSoft}`}>
          <span className={styles.ctaSoftT}>邀请更多好友，可升级更长 VIP 权益。</span>
          <div className={`${styles.ctaBtn} ${styles.ctaBtnOutline}`}>邀请好友</div>
        </div>
      )}
    </div>
  );
}
