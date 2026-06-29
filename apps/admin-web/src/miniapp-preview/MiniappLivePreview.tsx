import { Segmented, Select, Space, Typography } from "antd";
import {
  buildGetString,
  navigationTitleForRoute,
  pageEnabled,
  type MiniappPageEditLite,
} from "./buildGetString";
import { MiniappPhoneShell } from "./MiniappPhoneShell";
import { VipCenterPreview, type VipPreviewMode } from "./VipCenterPreview";
import { MallPreview } from "./MallPreview";
import { ShareAppPreview } from "./ShareAppPreview";
import { ShopsPreview } from "./ShopsPreview";
import { ProfilePreview } from "./ProfilePreview";
import { GenericStringsPreview } from "./GenericStringsPreview";

const VIP_ROUTE = "pages/vip-center/vip-center";

function PreviewBody(props: { route: string; getString: (k: string, fb: string) => string; page: MiniappPageEditLite }) {
  const { route, getString: gs, page } = props;

  switch (route) {
    case "pages/mall/mall":
      return <MallPreview getString={gs} />;
    case "pages/share-app/share-app":
      return <ShareAppPreview getString={gs} />;
    case "pages/shops/shops":
      return <ShopsPreview getString={gs} />;
    case "pages/profile/profile":
      return <ProfilePreview getString={gs} />;
    default:
      return <GenericStringsPreview page={page} />;
  }
}

export function MiniappLivePreview(props: {
  edits: MiniappPageEditLite[];
  previewRoute: string;
  onPreviewRoute: (route: string) => void;
  vipMode: VipPreviewMode;
  onVipMode: (m: VipPreviewMode) => void;
}) {
  const { edits, previewRoute, onPreviewRoute, vipMode, onVipMode } = props;

  const page = edits.find((e) => e.route === previewRoute);
  const title = navigationTitleForRoute(edits, previewRoute);
  const enabled = pageEnabled(edits, previewRoute);
  const getString = buildGetString(edits, previewRoute);

  const routeOptions = edits.map((e) => ({
    value: e.route,
    label: e.navigationBarTitle?.trim() || "未命名页面",
  }));

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        手机预览
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
        改左边文字后这里会马上变；会员页可切换不同状态看效果。
      </Typography.Paragraph>

      <Space direction="vertical" style={{ width: "100%", marginBottom: 12 }} size="small">
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            预览页面
          </Typography.Text>
          <Select
            style={{ width: "100%", marginTop: 4 }}
            value={previewRoute}
            options={routeOptions}
            onChange={onPreviewRoute}
            showSearch
            optionFilterProp="label"
          />
        </div>

        {previewRoute === VIP_ROUTE && (
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              会员页状态
            </Typography.Text>
            <Segmented<VipPreviewMode>
              style={{ marginTop: 6, width: "100%" }}
              block
              value={vipMode}
              onChange={(v) => onVipMode(v)}
              options={[
                { label: "未登录", value: "needLogin" },
                { label: "未达标", value: "notGate" },
                { label: "超管", value: "super" },
                { label: "已开通", value: "vip" },
                { label: "异常", value: "loadErr" },
              ]}
            />
          </div>
        )}
      </Space>

      <MiniappPhoneShell title={title} disabled={!enabled}>
        {previewRoute === VIP_ROUTE ? (
          <VipCenterPreview getString={getString} mode={vipMode} />
        ) : page ? (
          <PreviewBody route={previewRoute} getString={getString} page={page} />
        ) : (
          <GenericStringsPreview
            page={{
              route: previewRoute,
              navigationBarTitle: title,
              enabled: true,
              stringRows: [],
            }}
          />
        )}
      </MiniappPhoneShell>
    </div>
  );
}
