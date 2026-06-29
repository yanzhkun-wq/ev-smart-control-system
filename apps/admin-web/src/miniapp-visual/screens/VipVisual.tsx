import { Segmented } from "antd";
import type { ReactNode } from "react";
import { useState } from "react";
import type { PageEdit } from "../../miniapp-page-types";
import { EditableString } from "../EditableString";
import styles from "../../miniapp-preview/VipCenterPreview.module.css";

const R_VIP = "pages/vip-center/vip-center";

type VMode = "needLogin" | "loadErr" | "notGate" | "super" | "vip";

const PAY = "36.5";
const ORDER_HINT = "邀请好友完成绑定并入网，达标即可开通。";

export function VipVisual(props: { edits: PageEdit[]; onEditsChange: (e: PageEdit[]) => void }) {
  const { edits, onEditsChange } = props;
  const [mode, setMode] = useState<VMode>("notGate");

  const body = () => {
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
            <span className={styles.errS}>演示</span>
            <div className={styles.loginBtn}>返回首页</div>
          </div>
        </div>
      );
    }

    let title: ReactNode;
    let sub: ReactNode;
    let gateOk = false;
    let isSuper = false;
    let showPay = true;
    let showInvite = true;
    let showSoft = false;

    if (mode === "notGate") {
      title = (
        <EditableString
          route={R_VIP}
          stringKey="titleNotOpen"
          label="未开通 VIP · 主标题"
          fallback="尚未开通 VIP"
          edits={edits}
          onEditsChange={onEditsChange}
        />
      );
      sub = (
        <>
          <EditableString
            route={R_VIP}
            stringKey="subNotOpen"
            label="未开通 VIP · 副说明"
            fallback={ORDER_HINT}
            edits={edits}
            onEditsChange={onEditsChange}
          />
          <EditableString
            route={R_VIP}
            stringKey="paySuffix"
            label="付费开通后缀"
            fallback={` 也可直接付费 ¥${PAY}/年 立即开通。`}
            edits={edits}
            onEditsChange={onEditsChange}
            style={{ marginLeft: 4 }}
          />
        </>
      );
    } else if (mode === "super") {
      gateOk = true;
      isSuper = true;
      showPay = false;
      showInvite = false;
      showSoft = true;
      title = (
        <EditableString
          route={R_VIP}
          stringKey="titleSuper"
          label="超管 · 权益标题"
          fallback="权益已解锁"
          edits={edits}
          onEditsChange={onEditsChange}
        />
      );
      sub = (
        <EditableString
          route={R_VIP}
          stringKey="subSuper"
          label="超管 · 权益说明"
          fallback="演示超管可使用电子围栏与多账号授权（正式环境以平台规则为准）。"
          edits={edits}
          onEditsChange={onEditsChange}
        />
      );
    } else {
      gateOk = true;
      showInvite = false;
      showSoft = true;
      title = (
        <EditableString
          route={R_VIP}
          stringKey="titleVipActive"
          label="已开通 VIP · 默认主标题"
          fallback="VIP 已开通"
          edits={edits}
          onEditsChange={onEditsChange}
        />
      );
      sub = <span>有效期至 2027-12-31</span>;
    }

    return (
      <div className={styles.root}>
        <div style={{ padding: "0 12px 10px" }}>
          <Segmented<VMode>
            block
            size="small"
            value={mode}
            onChange={setMode}
            options={[
              { label: "未登录", value: "needLogin" },
              { label: "未开通", value: "notGate" },
              { label: "超管", value: "super" },
              { label: "已开通", value: "vip" },
              { label: "异常", value: "loadErr" },
            ]}
          />
        </div>

        <div className={`${styles.vipCard} ${styles.statusCard}`}>
          <span className={styles.statusK}>会员状态</span>
          <span className={styles.statusTitle}>{title}</span>
          <span className={styles.statusSub}>{sub}</span>
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

        {showPay && !isSuper && (
          <div className={`${styles.vipCard} ${styles.cta} ${styles.payCta}`}>
            <span className={styles.ctaTitle}>付费开通 / 续费</span>
            <span className={styles.ctaDesc}>¥{PAY} / 年，支付后立即生效；可与邀请达标权益叠加。</span>
            <div className={`${styles.ctaBtn} ${styles.ctaBtnPay}`}>
              {gateOk ? "续费一年" : "立即支付"} ¥{PAY} / 年
            </div>
          </div>
        )}

        {showInvite && !gateOk && (
          <div className={`${styles.vipCard} ${styles.cta}`}>
            <span className={styles.ctaTitle}>邀请好友开通</span>
            <span className={styles.ctaDesc}>演示邀请进度文案</span>
            <div className={styles.ctaBtn}>邀请好友 · 查看进度</div>
          </div>
        )}

        {showSoft && gateOk && (
          <div className={`${styles.vipCard} ${styles.cta} ${styles.ctaSoft}`}>
            <span className={styles.ctaSoftT}>邀请更多好友，可升级更长 VIP 权益。</span>
            <div className={`${styles.ctaBtn} ${styles.ctaBtnOutline}`}>邀请好友</div>
          </div>
        )}
      </div>
    );
  };

  return body();
}
