import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import { AdminGatewayProvider } from "./context/AdminGatewayContext";
import { RootErrorBoundary } from "./RootErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<p style='padding:16px'>找不到 #root 节点，请检查 index.html</p>";
} else {
  console.info("[admin-web] bootstrap");
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: "#0d9488",
              borderRadiusLG: 10,
            },
          }}
        >
          <AntApp>
            <HashRouter>
              <AdminGatewayProvider>
                <App />
              </AdminGatewayProvider>
            </HashRouter>
          </AntApp>
        </ConfigProvider>
      </RootErrorBoundary>
    </React.StrictMode>,
  );
}
