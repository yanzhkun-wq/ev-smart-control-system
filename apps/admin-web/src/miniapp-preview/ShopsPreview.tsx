export function ShopsPreview(props: { getString: (key: string, fallback: string) => string }) {
  const { getString: gs } = props;
  const title = gs("shopsTitle", "合作商家");

  return (
    <div style={{ padding: "12px 16px", fontFamily: "'PingFang SC', sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
        {title}
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 0",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              background: "#f1f5f9",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "#94a3b8",
            }}
          >
            🏪
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              {gs(`shopName_${i}`, `商家${i}`)}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              {gs(`shopAddr_${i}`, `地址${i}`)}
            </div>
            <div style={{ fontSize: 13, color: "#10b981", marginTop: 2 }}>
              {gs(`shopStatus_${i}`, "营业中")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
