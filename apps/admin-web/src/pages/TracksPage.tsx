import { App, Button, Card, Col, DatePicker, Empty, Row, Select, Slider, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import { useAdminGateway } from "../context/AdminGatewayContext";
import { gatewayFetch } from "../api/client";
import "../map/leafletIcon";

type TrackApiPoint = { lat: number; lng: number; speedKmh?: number; deviceTime?: string };

export type TracksPageProps = { embedded?: boolean };

export function TracksPage({ embedded = false }: TracksPageProps = {}) {
  const { message } = App.useApp();
  const { deviceRows } = useAdminGateway();
  const [device, setDevice] = useState(deviceRows[0]?.terminalPhone ?? "");
  const [queryDay, setQueryDay] = useState<Dayjs>(() => dayjs());
  const [apiPath, setApiPath] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (deviceRows.length && !deviceRows.some((d) => d.terminalPhone === device)) {
      setDevice(deviceRows[0]!.terminalPhone);
    }
  }, [deviceRows, device]);

  const [progress, setProgress] = useState(100);

  const fullPath = useMemo(() => apiPath ?? [], [apiPath]);
  const dataSourceLabel = apiPath && apiPath.length >= 2 ? "网关轨迹 JSONL" : "暂无轨迹数据";

  const path = useMemo(() => {
    if (!fullPath.length) return [];
    const n = Math.max(2, Math.ceil((fullPath.length * progress) / 100));
    return fullPath.slice(0, n);
  }, [fullPath, progress]);

  const center: [number, number] = path.length > 0 ? (path[path.length - 1] ?? fullPath[0]!) : [39.9, 116.4];

  const loadTracks = async () => {
    if (!device) {
      message.warning("请选择车辆");
      return;
    }
    const date = queryDay.format("YYYY-MM-DD");
    try {
      const r = await gatewayFetch<{ points?: TrackApiPoint[] }>(
        `/api/terminal/${encodeURIComponent(device)}/tracks?date=${encodeURIComponent(date)}`,
      );
      const pts = r.points ?? [];
      const mapped: [number, number][] = pts.map((x) => [x.lat, x.lng]);
      if (mapped.length < 2) {
        message.info("当日无轨迹数据");
        setApiPath([]);
        return;
      }
      setApiPath(mapped);
      message.success(`已加载 ${mapped.length} 个点`);
    } catch (e) {
      message.error(String(e));
      setApiPath(null);
    }
  };

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            轨迹回放
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            从网关 <Typography.Text code>GET /api/terminal/&#123;phone&#125;/tracks?date=YYYY-MM-DD</Typography.Text> 查询历史轨迹 JSONL 数据。
          </Typography.Paragraph>
        </>
      ) : null}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap align="center">
          <span>车辆</span>
          <Select
            style={{ minWidth: 220 }}
            value={device || undefined}
            onChange={(v) => {
              setDevice(v);
              setApiPath(null);
            }}
            options={deviceRows.map((d) => ({ label: `${d.plate} (${d.terminalPhone})`, value: d.terminalPhone }))}
          />
          <span>日期</span>
          <DatePicker value={queryDay} onChange={(d) => setQueryDay(d ?? dayjs())} />
          <Button type="primary" onClick={() => void loadTracks()}>
            从网关查询
          </Button>
        </Space>
        <div style={{ marginTop: 12 }}>
          <Typography.Text type="secondary">回放进度 · 当前数据源：{dataSourceLabel}</Typography.Text>
          <Slider min={0} max={100} value={progress} onChange={setProgress} disabled={fullPath.length === 0} />
        </div>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <div style={{ height: 480 }}>
            {fullPath.length > 0 ? (
              <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline pathOptions={{ color: "#0d9488", weight: 5 }} positions={path} />
              </MapContainer>
            ) : (
              <Empty
                description="暂无轨迹数据，请选择车辆和日期后点击「从网关查询」"
                style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}
              />
            )}
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="统计">
            <Typography.Paragraph>当前点串：{fullPath.length} 个</Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              轨迹文件目录：<Typography.Text code>data/tracks/&#123;终端号&#125;/</Typography.Text>
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}