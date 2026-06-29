import { Card, Input, Space, Typography } from "antd";
import type { PageEdit } from "../miniapp-page-types";
import { updateEditString, updateNavigationTitle } from "./updateEdits";

export function MiniappCurrentPageStringsPanel(props: {
  activeRoute: string;
  edits: PageEdit[];
  onEditsChange: (next: PageEdit[]) => void;
}) {
  const { activeRoute, edits, onEditsChange } = props;
  const page = edits.find((e) => e.route === activeRoute);
  const disabled = !page;

  return (
    <Card
      size="small"
      title={<span style={{ fontSize: 13 }}>当前页文案</span>}
      style={{ flex: "0 1 260px", width: "100%", maxWidth: 280, minWidth: 220, alignSelf: "flex-start" }}
      styles={{ body: { padding: "8px 10px" } }}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 6, fontSize: 11 }}>
        与左侧预览联动。
      </Typography.Paragraph>

      {disabled ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          当前路由不在配置中：{activeRoute}
        </Typography.Text>
      ) : (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4, fontSize: 11 }}>
              导航标题
            </Typography.Text>
            <Input
              size="small"
              value={page.navigationBarTitle}
              onChange={(e) => onEditsChange(updateNavigationTitle(edits, activeRoute, e.target.value))}
              placeholder="标题"
              allowClear
            />
          </div>

          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6, fontSize: 11 }}>
              文案条目 {page.stringRows.length}
            </Typography.Text>
            <div
              style={{
                maxHeight: "min(48vh, 380px)",
                overflow: "auto",
                paddingRight: 4,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {page.stringRows.map((row) => (
                <div key={row.key}>
                  <Typography.Text style={{ display: "block", marginBottom: 2, fontSize: 11 }}>
                    {row.hint}
                    <Typography.Text type="secondary" style={{ marginLeft: 4, fontSize: 10 }}>
                      {row.key}
                    </Typography.Text>
                  </Typography.Text>
                  <Input
                    size="small"
                    value={row.value}
                    onChange={(e) =>
                      onEditsChange(updateEditString(edits, activeRoute, row.key, e.target.value))
                    }
                    placeholder="空则默认"
                    allowClear
                  />
                </div>
              ))}
            </div>
          </div>
        </Space>
      )}
    </Card>
  );
}
