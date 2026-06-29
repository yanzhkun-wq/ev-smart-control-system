import type { MouseEvent } from "react";
import type { PageEdit } from "../../miniapp-page-types";
import { miniappFeatureOn } from "../../constants/miniappFeatures";
import { EditableString } from "../EditableString";
import pstyles from "../../miniapp-preview/ProfilePreview.module.css";

function skipEditNav(e: MouseEvent, go: () => void) {
  if ((e.target as HTMLElement).closest("[data-miniapp-edit-hit]")) return;
  go();
}

export const R_PROFILE = "pages/profile/profile";

const d = {
  sectionServices: "常用服务",
  tracksIcon: "行",
  tracksName: "行车记录",
  alarmIcon: "警",
  alarmName: "防盗报警",
  fenceIcon: "围",
  fenceName: "电子围栏",
  authIcon: "权",
  authName: "授权管理",
  sectionMall: "智控商城与升级",
  mallIcon: "商",
  mallName: "智控商城",
  shopsIcon: "网",
  shopsName: "智控升级网点",
  sectionPartner: "合作与拓展",
  inviteIcon: "邀",
  inviteName: "邀请好友",
  applyIcon: "渠",
  applyName: "合作商申请",
};

export function ProfileVisual(props: {
  edits: PageEdit[];
  onEditsChange: (e: PageEdit[]) => void;
  navigate: (route: string) => void;
  features: Record<string, boolean>;
}) {
  const { edits, onEditsChange, navigate, features } = props;

  const svcAll = [
    { iconKey: "profileSvcTracksIcon", nameKey: "profileSvcTracksName", il: d.tracksIcon, nl: d.tracksName, route: "pages/tracks/tracks", feat: "profile_svc_tracks" },
    { iconKey: "profileSvcAlarmIcon", nameKey: "profileSvcAlarmName", il: d.alarmIcon, nl: d.alarmName, route: "pages/alarm/alarm", feat: "profile_svc_alarm" },
    { iconKey: "profileSvcFenceIcon", nameKey: "profileSvcFenceName", il: d.fenceIcon, nl: d.fenceName, route: "pages/fence-edit/fence-edit", feat: "profile_svc_fence" },
    { iconKey: "profileSvcAuthIcon", nameKey: "profileSvcAuthName", il: d.authIcon, nl: d.authName, route: "pages/auth/auth", feat: "profile_svc_auth" },
  ] as const;
  const svc = svcAll.filter((x) => miniappFeatureOn(features, x.feat));

  const showMall = miniappFeatureOn(features, "profile_mall_module");
  const showMallEntry = showMall && miniappFeatureOn(features, "profile_mall_entry");
  const showShopsEntry = showMall && miniappFeatureOn(features, "profile_shops_entry");

  const showPartner = miniappFeatureOn(features, "profile_partner_module");
  const showShare = showPartner && miniappFeatureOn(features, "profile_share_invite");
  const showApply = showPartner && miniappFeatureOn(features, "profile_partner_apply");

  return (
    <div className={pstyles.shell}>
      <div className={pstyles.hero}>
        <div className={pstyles.card}>
          <div className={pstyles.main}>
            <div className={pstyles.avatar}>用</div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                className={pstyles.name}
              >
                演示用户
                {miniappFeatureOn(features, "profile_vip_entry") ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate("pages/vip-center/vip-center")}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#fef3c7",
                    color: "#92400e",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  VIP
                </span>
                ) : null}
              </div>
              <div className={pstyles.sub}>账号 demo · 车主</div>
            </div>
          </div>
          <div className={pstyles.slogan}>
            <EditableString
              route={R_PROFILE}
              stringKey="profileSlogan"
              label="我的页标语"
              fallback=""
              edits={edits}
              onEditsChange={onEditsChange}
            />
          </div>
        </div>
      </div>

      {svc.length > 0 ? (
      <div className={pstyles.panel}>
        <div className={pstyles.panelTitle}>
          <EditableString
            route={R_PROFILE}
            stringKey="profileSectionServicesTitle"
            label="板块标题 · 常用服务"
            fallback={d.sectionServices}
            edits={edits}
            onEditsChange={onEditsChange}
          />
        </div>
        <div className={pstyles.grid}>
          {svc.map((x) => (
            <div
              key={x.route}
              className={pstyles.cell}
              role="button"
              tabIndex={0}
              onClick={(e) => skipEditNav(e, () => navigate(x.route))}
              style={{ cursor: "pointer" }}
            >
              <div className={pstyles.ico}>
                <EditableString
                  route={R_PROFILE}
                  stringKey={x.iconKey}
                  label={`图标 · ${x.nl}`}
                  fallback={x.il}
                  edits={edits}
                  onEditsChange={onEditsChange}
                  multiline={false}
                  variant="icon"
                  style={{ color: "#fff" }}
                />
              </div>
              <div className={pstyles.cellName}>
                <EditableString
                  route={R_PROFILE}
                  stringKey={x.nameKey}
                  label={`名称 · ${x.nl}`}
                  fallback={x.nl}
                  edits={edits}
                  onEditsChange={onEditsChange}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {showMall && (showMallEntry || showShopsEntry) ? (
      <div className={pstyles.panel}>
        <div className={pstyles.panelTitle}>
          <EditableString
            route={R_PROFILE}
            stringKey="profileSectionMallTitle"
            label="板块标题 · 商城与升级"
            fallback={d.sectionMall}
            edits={edits}
            onEditsChange={onEditsChange}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {showMallEntry ? (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => skipEditNav(e, () => navigate("pages/mall/mall"))}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: "#ecfdf5",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#065f46", marginBottom: 4 }}>
              <EditableString
                route={R_PROFILE}
                stringKey="profileMallEntryIcon"
                label="智控商城 · 图标"
                fallback={d.mallIcon}
                edits={edits}
                onEditsChange={onEditsChange}
                multiline={false}
                variant="icon"
                style={{ color: "#065f46" }}
              />
            </div>
            <div style={{ fontWeight: 800, color: "#065f46" }}>
              <EditableString
                route={R_PROFILE}
                stringKey="profileMallEntryName"
                label="智控商城 · 名称"
                fallback={d.mallName}
                edits={edits}
                onEditsChange={onEditsChange}
              />
            </div>
          </div>
          ) : null}
          {showShopsEntry ? (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => skipEditNav(e, () => navigate("pages/shops/shops"))}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: "#f1f5f9",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#334155", marginBottom: 4 }}>
              <EditableString
                route={R_PROFILE}
                stringKey="profileShopsEntryIcon"
                label="升级网点 · 图标"
                fallback={d.shopsIcon}
                edits={edits}
                onEditsChange={onEditsChange}
                multiline={false}
                variant="icon"
                style={{ color: "#334155" }}
              />
            </div>
            <div style={{ fontWeight: 800, color: "#334155" }}>
              <EditableString
                route={R_PROFILE}
                stringKey="profileShopsEntryName"
                label="升级网点 · 名称"
                fallback={d.shopsName}
                edits={edits}
                onEditsChange={onEditsChange}
              />
            </div>
          </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {showPartner && (showShare || showApply) ? (
        <div className={pstyles.panel}>
        <div className={pstyles.panelTitle}>
          <EditableString
            route={R_PROFILE}
            stringKey="profileSectionPartnerTitle"
            label="板块标题 · 合作与拓展"
            fallback={d.sectionPartner}
            edits={edits}
            onEditsChange={onEditsChange}
          />
        </div>
        <div className={pstyles.grid} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {showShare ? (
          <div
            className={pstyles.cell}
            role="button"
            tabIndex={0}
            onClick={(e) => skipEditNav(e, () => navigate("pages/share-app/share-app"))}
            style={{ cursor: "pointer" }}
          >
            <div className={pstyles.ico} style={{ background: "#8b5cf6" }}>
              <EditableString
                route={R_PROFILE}
                stringKey="profilePartnerInviteIcon"
                label="邀请好友 · 图标"
                fallback={d.inviteIcon}
                edits={edits}
                onEditsChange={onEditsChange}
                multiline={false}
                variant="icon"
                style={{ color: "#fff" }}
              />
            </div>
            <div className={pstyles.cellName}>
              <EditableString
                route={R_PROFILE}
                stringKey="profilePartnerInviteName"
                label="邀请好友 · 名称"
                fallback={d.inviteName}
                edits={edits}
                onEditsChange={onEditsChange}
              />
            </div>
          </div>
          ) : null}
          {showApply ? (
          <div
            className={pstyles.cell}
            role="button"
            tabIndex={0}
            onClick={(e) => skipEditNav(e, () => navigate("pages/partner-apply/partner-apply"))}
            style={{ cursor: "pointer" }}
          >
            <div className={pstyles.ico} style={{ background: "#06b6d4" }}>
              <EditableString
                route={R_PROFILE}
                stringKey="profilePartnerApplyIcon"
                label="合作商申请 · 图标"
                fallback={d.applyIcon}
                edits={edits}
                onEditsChange={onEditsChange}
                multiline={false}
                variant="icon"
                style={{ color: "#fff" }}
              />
            </div>
            <div className={pstyles.cellName}>
              <EditableString
                route={R_PROFILE}
                stringKey="profilePartnerApplyName"
                label="合作商申请 · 名称"
                fallback={d.applyName}
                edits={edits}
                onEditsChange={onEditsChange}
              />
            </div>
          </div>
          ) : null}
        </div>
        </div>
      ) : null}

      {miniappFeatureOn(features, "profile_system_module") ? (
        <div className={pstyles.panel}>
        <div className={pstyles.panelTitle}>
          <EditableString
            route={R_PROFILE}
            stringKey="profileSectionSystemTitle"
            label="板块标题 · 系统"
            fallback="系统"
            edits={edits}
            onEditsChange={onEditsChange}
          />
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          <div style={{ marginBottom: 6 }}>
            <EditableString
              route={R_PROFILE}
              stringKey="profileSysAccountIcon"
              label="系统 · 账号设置 · 图标"
              fallback="户"
              edits={edits}
              onEditsChange={onEditsChange}
              multiline={false}
              variant="icon"
            />{" "}
            <EditableString
              route={R_PROFILE}
              stringKey="profileSysAccountTitle"
              label="系统 · 账号设置 · 标题"
              fallback="账号设置"
              edits={edits}
              onEditsChange={onEditsChange}
            />
          </div>
          <div>
            <EditableString
              route={R_PROFILE}
              stringKey="profileSysLogoutIcon"
              label="系统 · 退出 · 图标"
              fallback="出"
              edits={edits}
              onEditsChange={onEditsChange}
              multiline={false}
              variant="icon"
            />{" "}
            <EditableString
              route={R_PROFILE}
              stringKey="profileSysLogoutTitle"
              label="系统 · 退出 · 标题"
              fallback="退出登录（演示）"
              edits={edits}
              onEditsChange={onEditsChange}
            />
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}
