import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MiniappPagesPage } from "./pages/MiniappPagesPage";
import MallManagePage from "./pages/MallManagePage";
import { VehicleRiskPage } from "./pages/VehicleRiskPage";

const routeFallback = (
  <div style={{ padding: 24, textAlign: "center", color: "#595959" }}>正在加载页面（含地图资源）…</div>
);

export default function App() {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="vehicle-risk" element={<VehicleRiskPage />} />
          <Route path="vehicle" element={<Navigate to="/vehicle-risk?hub=monitor" replace />} />
          <Route path="monitor" element={<Navigate to="/vehicle-risk?hub=monitor" replace />} />
          <Route path="devices" element={<Navigate to="/vehicle-risk?hub=devices" replace />} />
          <Route path="tracks" element={<Navigate to="/vehicle-risk?hub=tracks" replace />} />
          <Route path="alerts" element={<Navigate to="/vehicle-risk?hub=alerts" replace />} />
          <Route path="geofences" element={<Navigate to="/vehicle-risk?hub=geofences" replace />} />
          <Route path="fleet" element={<Navigate to="/vehicle-risk?hub=fleet" replace />} />
          <Route path="remote" element={<Navigate to="/vehicle-risk?hub=remote" replace />} />
          <Route path="hardware" element={<MallManagePage />} />
          <Route path="mall-manage" element={<Navigate to="/hardware" replace />} />
          <Route path="miniapp-pages" element={<MiniappPagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
