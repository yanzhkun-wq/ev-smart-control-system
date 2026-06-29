import { Badge, Card, Col, Empty, List, Row, Space, Tag, Typography } from "antd";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useMemo } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import "../map/leafletIcon";

export type MonitorPageProps = { embedded?: boolean };

export function MonitorPage({ embedded = false }: MonitorPageProps = {}) {
  const { deviceRows } = useAdminGateway();

  const center = useMemo((): [number, number] | null => {
    const on = deviceRows.filter((d) => d.online && d.lat !== 0 && d.lng !== 0);
    if (on.length) {
      const s = on.reduce((a, d) => ({ lat: a.lat + d.lat, lng: a.lng + d.lng }), { lat: 0, lng: 0 });
      return [s.lat / on.length, s.lng / on.length];
    }
    return null;
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

      <Row gutter={16}>
        <Col xs={24} lg={7}>
          <Card size="small" title="终端列表" styles={{ body: { padding: 0, maxHeight: 520, overflow: "auto" } }}>
            {deviceRows.length ? (
              <List
                dataSource={deviceRows}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space size={6}>
                          <span>{d.plate}</span>
                          {d.online ? <Badge status="success" text="在线" /> : <Badge status="default" text="离线" />}
                          {d.armed ? <Tag color="orange">设防</Tag> : <Tag>撤防</Tag>}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            终端号 {d.terminalId}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {d.locateMode} · CSQ {d.csq} · 卫星 {d.sat} · 电量 {d.batteryPct}%
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无绑定设备，请在「设备绑定」中配置" style={{ padding: 40 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <div style={{ height: 520, width: "100%" }}>
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
                        <strong>{d.plate}</strong>
                        <br />
                        速度 {d.speedKmh} km/h
                        <br />
                      {d.online ? "在线" : "离线"} · {d.armed ? "设防" : "撤防"} · {d.mainPowerOk ? "主电正常" : "主电异常"}
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
            ) : (
              <Empty description="暂无车辆位置数据" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }} />
            )}
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
            离线车辆若仍显示在图上，表示库中有最后位置或默认坐标。
          </Typography.Paragraph>
        </Col>
      </Row>
    </div>
  );
}
