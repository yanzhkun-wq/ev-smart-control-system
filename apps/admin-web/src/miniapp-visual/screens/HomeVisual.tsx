import type { PageEdit } from "../../miniapp-page-types";
import type { MiniappHomeBlock, MiniappHomeLayout } from "../../types/gatewayStore";
import { miniappFeatureOn } from "../../constants/miniappFeatures";
import { getHomeLayoutBlocksForRender } from "../../utils/normalizeMiniappHomeLayout";
import { EditableString } from "../EditableString";
import styles from "./homeVisual.module.css";

export const R_HOME = "pages/home/home";

export type HomeScene = "login" | "bind" | "dashboard";

function filterDashboardBlocks(blocks: MiniappHomeBlock[], features: Record<string, boolean>): MiniappHomeBlock[] {
  return blocks.filter((b) => {
    if (b.hidden) return false;
    if (b.type === "hero" && !miniappFeatureOn(features, "home_show_hero")) return false;
    if (b.type === "vehicle_status" && !miniappFeatureOn(features, "home_show_status")) return false;
    if (b.type === "carousel" && b.items.length === 0) return false;
    return true;
  });
}

export function HomeVisual(props: {
  scene: HomeScene;
  edits: PageEdit[];
  onEditsChange: (e: PageEdit[]) => void;
  features: Record<string, boolean>;
  homeLayout: MiniappHomeLayout;
}) {
  const { scene, edits, onEditsChange, features, homeLayout } = props;

  if (scene === "login") {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginBrand}>
          <span className={styles.loginBrandName}>电动车智控</span>
          <span className={styles.loginBrandEn}>EV INTELLIGENCE</span>
        </div>
        <div className={styles.loginCard}>
          <span className={styles.loginTitle}>欢迎使用</span>
          <span className={styles.loginSub}>
            使用微信授权登录后，即可绑定车载定位终端，远程掌握车辆状态、轨迹与电子围栏。
          </span>
          <div
            style={{
              marginTop: 14,
              height: 40,
              background: "#111827",
              borderRadius: 8,
              color: "#fff",
              lineHeight: "40px",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            微信授权登录
          </div>
        </div>
      </div>
    );
  }

  if (scene === "bind") {
    return (
      <div className={styles.scrollDash}>
        <span className={styles.bindLead}>将车载终端与车牌关联后，即可远程控车、查轨迹与围栏。</span>
        <div className={`${styles.card} ${styles.bindSheet}`}>
          <div className={styles.bindHero}>
            <span className={styles.bindHeroTitle}>扫码绑定设备</span>
            <span className={styles.bindHeroHint}>识别设备或包装上的二维码，自动填入编码</span>
          </div>
          <button type="button" className={styles.bindSubmit}>
            确认绑定
          </button>
        </div>
      </div>
    );
  }

  const blocks = filterDashboardBlocks(getHomeLayoutBlocksForRender(homeLayout), features);

  return (
    <div className={styles.scrollDash}>
      {blocks.map((b) => {
        if (b.type === "welcome_tip") {
          return (
            <div key={b.id} className={styles.tipBanner}>
              <EditableString
                route={R_HOME}
                stringKey="welcomeTip"
                label="首页提示条"
                fallback=""
                edits={edits}
                onEditsChange={onEditsChange}
              />
            </div>
          );
        }
        if (b.type === "carousel") {
          return (
            <div key={b.id} className={styles.decorWrap}>
              <div className={styles.decorCarousel}>
                {b.items.map((c) => (
                  <div key={c.id} className={styles.decorSlide}>
                    {c.imageUrl ? <img className={styles.decorSlideImg} src={c.imageUrl} alt="" /> : null}
                    {c.title ? <span className={styles.decorSlideCap}>{c.title}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (b.type === "ad") {
          return (
            <div key={b.id} className={styles.decorWrap}>
              <div className={styles.decorAds}>
                <div className={b.variant === "banner" ? styles.decorAdBanner : styles.decorAdCard}>
                  {b.imageUrl ? <img className={styles.decorAdImg} src={b.imageUrl} alt="" /> : null}
                  <div className={styles.decorAdBody}>
                    <span className={styles.decorAdTitle}>{b.title || "广告位"}</span>
                    <span className={styles.decorAdSub}>{b.variant === "banner" ? "横幅" : "卡片"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        if (b.type === "hero") {
          return (
            <div key={b.id} className={`${styles.card} ${styles.hero}`}>
              <div className={styles.heroHead}>
                <span className={styles.heroPlate}>当前车辆 · 京A12345</span>
                <span className={styles.tbBtn}>车辆管理</span>
              </div>
              <div className={styles.lockBanner}>
                <span className={styles.lbMain}>已开锁</span>
              </div>
              {miniappFeatureOn(features, "home_show_remote") ? (
                <div className={styles.remote}>
                  <button type="button" className={`${styles.rbtn} ${styles.rbtnSec}`}>
                    解锁
                  </button>
                  <button type="button" className={styles.rbtn}>
                    上锁
                  </button>
                </div>
              ) : null}
            </div>
          );
        }
        if (b.type === "vehicle_status") {
          return (
            <div key={b.id} className={`${styles.card} ${styles.vstatus}`}>
              <div className={styles.vstatusTitle}>车辆状态</div>
              <div className={styles.mapBox}>地图预览区</div>
              <span className={styles.mapCap}>地图含围栏范围 · 点此查看详情</span>
              <div className={styles.item}>
                <span className={styles.itemK}>实时位置</span>
                <div className={styles.itemMid}>
                  <div className={styles.itemT}>北京市 · 演示地址</div>
                  <div className={styles.itemS}>39.9, 116.4</div>
                </div>
              </div>
              <div className={styles.item}>
                <span className={styles.itemK}>电子围栏</span>
                <div className={styles.itemMid}>
                  <div className={styles.itemT}>矩形围栏 · 半径约 20 m</div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
