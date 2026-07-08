import { Badge, Button, Card, Col, Empty, Input, List, Row, Space, Statistic, Tag, Typography } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useMemo, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import "../map/leafletIcon";

export type MonitorPageProps = { embedded?: boolean };

export function MonitorPage({ embedded = false }: MonitorPageProps = {}) {
  const { deviceRows, loading, refresh } = useAdminGateway();
  const [search, setSearch] = useState("");
  const [filterOnline, setFilterOnline] = useState<string | null>(null); // "all" | "online" | "offline"

  const filtered = useMemo(() => {
    let list = deviceRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.plate?.toLowerCase().includes(q) || d.terminalId?.toLowerCase().includes(q));
    }
    if (filterOnline === "online") list = list.filter((d) => d.online);
    else if (filterOnline === "offline") list = list.filter((d) => !d.online);
    return list;
  }, [deviceRows, search, filterOnline]);

  const center = useMemo((): [number, number] | null => {
    const on = deviceRows.filter((d) => d.online && d.lat !== 0 && d.lng !== 0);
    if (on.length) {
      const s = on.reduce((a, d) => ({ lat: a.lat + d.lat, lng: a.lng + d.lng }), { lat: 0, lng: 0 });
      return [s.lat / on.length, s.lng / on.length];
    }
    return null;
  }, [deviceRows]);

  const stats = useMemo(() => {
    const total = deviceRows.length;
    const online = deviceRows.filter((d) => d.online).length;
    const armed = deviceRows.filter((d) => d.armed).length;
    const lowBattery = deviceRows.filter((d) => d.batteryPct !== undefined && d.batteryPct < 20).length;
    return { total, online, armed, lowBattery, offline: total - online };
  }, [deviceRows]);

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            实时监控
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            车辆列表与坐标来自绑定 + 最后位置；在线状态来自网关会话。
          </Typography.Paragraph>
        </>
      ) : null}

      {/* 统计栏 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="总终端" value={stats.total} suffix={`在线 ${stats.online}`} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="在线"
              value={stats.online}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: stats.online ? "#10b981" : "#6b7280", fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="设防" value={stats.armed} suffix={stats.armed ? "🔒" : ""} valueStyle={{ color: "#f59e0b", fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="低电量"
              value={stats.lowBattery}
              valueStyle={{ color: stats.lowBattery ? "#ef4444" : "#6b7280", fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={7}>
          {/* 搜索 + 过滤 + 刷新 */}
          <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
            <Input
              size="small"
              placeholder="搜索车牌或终端号"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
              allowClear
            />
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()} />
          </div>
          <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
            <Button size="small" type={filterOnline === null ? "primary" : "default"} onClick={() => setFilterOnline(null)}>全部</Button>
            <Button size="small" type={filterOnline === "online" ? "primary" : "default"} onClick={() => setFilterOnline("online")}>在线</Button>
            <Button size="small" type={filterOnline === "offline" ? "primary" : "default"} onClick={() => setFilterOnline("offline")}>离线</Button>
          </div>

          <Card size="small" styles={{ body: { padding: 0, maxHeight: 440, overflow: "auto" } }}>
            {filtered.length ? (
              <List
                dataSource={filtered}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space size={6}>
                          <span>{d.plate}</span>
                          {d.online ? <Badge status="success" text="在线" /> : <Badge status="default" text="离线" />}
                          {d.armed ? <Tag color="orange" style={{ fontSize: 11 }}>设防</Tag> : null}
                          {d.batteryPct !== undefined && d.batteryPct < 20 ? <Tag color="red" style={{ fontSize: 11 }}>低电</Tag> : null}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            终端 {d.terminalId}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {d.locateMode} · CSQ {d.csq} · 卫星 {d.sat} · 电量 {d.batteryPct}%
                          </Typography.Text>
                          {d.speedKmh !== undefined ? (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              速度 {d.speedKmh} km/h · {!d.mainPowerOk ? <span style={{ color: "#ef4444" }}>主电异常</span> : "主电正常"}
                            </Typography.Text>
                          ) : null}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={deviceRows.length ? "无匹配车辆" : "暂无设备"} style={{ padding: 40 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <div style={{ height: 520, width: "100%", borderRadius: 8, overflow: "hidden" }}>
            {center ? (
              <MapContainer center={center} zoom={deviceRows.length ? 10 : 8} scrollWheelZoom style={{ height: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {deviceRows
                  .filter((d) => d.online && d.lat !== 0 && d.lng !== 0)
                  .map((d) => (
                    <Marker key={d.key} position={[d.lat, d.lng]}>
                      <Popup>
                        <div style={{ minWidth: 140 }}>
                          <strong style={{ fontSize: 15 }}>{d.plate}</strong>
                          <Tag color={d.online ? "green" : "default"} style={{ marginLeft: 6 }}>{d.online ? "在线" : "离线"}</Tag>
                          <br />
                          <Space direction="vertical" size={2} style={{ marginTop: 6 }}>
                            <span>📟 终端 {d.terminalId}</span>
                            <span>📍 {d.locateMode}</span>
                            <span>⚡ 速度 {d.speedKmh} km/h</span>
                            <span>🔋 电量 {d.batteryPct}% · CSQ {d.csq} · 卫星 {d.sat}</span>
                            <span>🔒 {d.armed ? "已设防" : "未设防"} · {d.mainPowerOk ? "主电正常" : "⚠️ 主电异常"}</span>
                          </Space>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Empty description="暂无车辆位置数据" />
              </div>
            )}
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
            离线车辆若显示位置，表示库中有最后上报的坐标。
          </Typography.Paragraph>
        </Col>
      </Row>
    </div>
  );
}
