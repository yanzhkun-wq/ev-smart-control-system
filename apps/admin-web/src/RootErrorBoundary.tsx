import React, { type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null; info: string };

export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? "" });
    console.error("[admin-web]", error, info);
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
          <h1 style={{ fontSize: 18, marginTop: 0 }}>管理端加载出错</h1>
          <p style={{ color: "#666" }}>请把下面内容复制给技术人员；也可按 F12 查看 Console。</p>
          <pre
            style={{
              background: "#fff1f0",
              border: "1px solid #ffa39e",
              padding: 12,
              borderRadius: 8,
              overflow: "auto",
              fontSize: 13,
            }}
          >
            {e?.name}: {e?.message}
            {e?.stack ? `\n\n${e.stack}` : ""}
            {this.state.info ? `\n\n组件栈:${this.state.info}` : ""}
          </pre>
          <p style={{ color: "#666", fontSize: 13 }}>
            常见问题：不要用「 file:// 」直接打开未打包的源码目录，请在本目录执行{" "}
            <code style={{ background: "#f5f5f5", padding: "2px 6px" }}>npm run dev</code>{" "}
            或 <code style={{ background: "#f5f5f5", padding: "2px 6px" }}>npm run preview</code>。
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
