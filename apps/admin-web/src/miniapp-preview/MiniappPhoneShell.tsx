import type { CSSProperties, ReactNode } from "react";

const shell: CSSProperties = {
  width: 375,
  maxWidth: "100%",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 12px 48px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06)",
  background: "#fff",
  flexShrink: 0,
};

const statusBar: CSSProperties = {
  height: 20,
  background: "#fff",
  borderBottom: "1px solid #f1f5f9",
};

const nav: CSSProperties = {
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
};

const navTitle: CSSProperties = {
  fontSize: 17,
  fontWeight: 600,
  color: "#0f172a",
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const backChev: CSSProperties = {
  position: "absolute",
  left: 12,
  fontSize: 22,
  color: "#64748b",
  lineHeight: 1,
};

const body: CSSProperties = {
  maxHeight: "min(640px, 72vh)",
  overflow: "auto",
  WebkitOverflowScrolling: "touch",
};

export function MiniappPhoneShell(props: {
  title: string;
  children: ReactNode;
  /** 后台将页面置为禁用时，小程序会 Toast；预览同步提示 */
  disabled?: boolean;
}) {
  return (
    <div style={shell}>
      <div style={statusBar} />
      <div style={nav}>
        <span style={backChev} aria-hidden>
          ‹
        </span>
        <span style={navTitle}>{props.title}</span>
      </div>
      {props.disabled && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: 12,
            color: "#92400e",
            background: "#fffbeb",
            borderBottom: "1px solid #fde68a",
          }}
        >
          此页在后台已关闭；真机将提示无法进入。
        </div>
      )}
      <div style={body}>{props.children}</div>
    </div>
  );
}
