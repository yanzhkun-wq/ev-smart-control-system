import { Select, Space, Typography } from "antd";
import {
  buildGetString,
  navigationTitleForRoute,
  pageEnabled,
  type MiniappPageEditLite,
} from "./buildGetString";
import { MiniappPhoneShell } from "./MiniappPhoneShell";
import { ShopsPreview } from "./ShopsPreview";
import { ProfilePreview } from "./ProfilePreview";
import { GenericStringsPreview } from "./GenericStringsPreview";

function PreviewBody(props: { route: string; getString: (k: string, fb: string) => string; page: MiniappPageEditLite }) {
  const { route, getString: gs, page } = props;

  switch (route) {
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
}) {
  const { edits, previewRoute, onPreviewRoute } = props;

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
        改左边文字后这里会马上变。
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
      </Space>

      <MiniappPhoneShell title={title} disabled={!enabled}>
        {page ? (
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
