import { Typography } from "antd";
import { MINIAPP_STRING_PRESETS } from "../../constants/miniappStringPresets";
import type { PageEdit } from "../../miniapp-page-types";
import { EditableString } from "../EditableString";

export function FallbackVisual(props: {
  route: string;
  edits: PageEdit[];
  onEditsChange: (e: PageEdit[]) => void;
}) {
  const { route, edits, onEditsChange } = props;
  const presets = MINIAPP_STRING_PRESETS[route] ?? [];

  return (
    <div style={{ padding: 14, minHeight: 400, background: "#eef2f6" }}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        界面与小程序一致。以下为该页可从后台改的文字，点文字即可编辑。
      </Typography.Paragraph>
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 16,
          border: "1px solid #e5e7eb",
          minHeight: 200,
        }}
      >
        {presets.length === 0 ? (
          <Typography.Text type="secondary">当前页面暂无预留文案位，真机上以程序为准。</Typography.Text>
        ) : (
          presets.map((p) => (
            <div key={p.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                <EditableString
                  route={route}
                  stringKey={p.key}
                  label={p.label}
                  fallback=""
                  edits={edits}
                  onEditsChange={onEditsChange}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
