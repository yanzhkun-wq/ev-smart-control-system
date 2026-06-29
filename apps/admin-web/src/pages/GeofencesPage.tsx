import { App, Button, Card, Form, Input, InputNumber, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { MapContainer, Circle, Polygon, TileLayer } from "react-leaflet";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { AdminGeofenceRow, StoreShape } from "../types/gatewayStore";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";
import "../map/leafletIcon";

export type GeofencesPageProps = { embedded?: boolean };

export function GeofencesPage({ embedded = false }: GeofencesPageProps = {}) {
  const { message } = App.useApp();
  const { store, saveStore } = useAdminGateway();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGeofenceRow | null>(null);
  const [form] = Form.useForm();

  const geofences = store?.admin?.geofences ?? [];

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        ...editing,
        polygonJson: editing.polygon ? JSON.stringify(editing.polygon) : "",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        key: `g-${Date.now()}`,
        type: "圆形",
        alarm: "出区域",
        enabled: true,
        centerLat: 23.1291,
        centerLng: 113.2644,
        radiusM: 420,
        polygonJson: "",
      });
    }
  }, [editing, open, form]);

  const persist = async (list: AdminGeofenceRow[]) => {
    if (!store) return;
    const s: StoreShape = JSON.parse(JSON.stringify(store));
    s.admin = s.admin ?? {};
    s.admin.geofences = list;
    await saveStore(s);
  };

  const onFinish = async (v: Record<string, unknown>) => {
    let polygon: [number, number][] | undefined;
    const pj = String(v.polygonJson ?? "").trim();
    if (pj) {
      try {
        const parsed = JSON.parse(pj) as unknown;
        if (!Array.isArray(parsed)) throw new Error("须为坐标数组");
        polygon = parsed as [number, number][];
      } catch (e) {
        message.error(`多边形 JSON 无效：${String(e)}`);
        return;
      }
    }
    const row: AdminGeofenceRow = {
      key: String(v.key ?? ""),
      name: String(v.name ?? ""),
      type: v.type as AdminGeofenceRow["type"],
      bindPlates: String(v.bindPlates ?? ""),
      alarm: v.alarm as AdminGeofenceRow["alarm"],
      enabled: !!v.enabled,
      centerLat: v.centerLat !== undefined ? Number(v.centerLat) : undefined,
      centerLng: v.centerLng !== undefined ? Number(v.centerLng) : undefined,
      radiusM: v.radiusM !== undefined ? Number(v.radiusM) : undefined,
      polygon,
    };
    const list = [...geofences];
    const idx = list.findIndex((x) => x.key === row.key);
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    try {
      await persist(list);
      message.success("已保存");
      setOpen(false);
    } catch (e) {
      message.error(String(e));
    }
  };

  const remove = async (k: string) => {
    await persist(geofences.filter((x) => x.key !== k));
    message.success("已删除");
  };

  const center: [number, number] = [23.1291, 113.2644];
  const demoPoly: [number, number][] = [
    [23.131, 113.262],
    [23.131, 113.268],
    [23.126, 113.268],
    [23.126, 113.262],
  ];

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            电子围栏
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            围栏配置写入 <Typography.Text code>admin.geofences</Typography.Text>；圆形需中心与半径，多边形在「多边形 JSON」中填{" "}
            [[lat,lng],...]。
          </Typography.Paragraph>
        </>
      ) : null}

      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          新建围栏
        </Button>
      </Space>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px", minWidth: 320 }}>
          <Table
            rowKey="key"
            dataSource={geofences}
            pagination={false}
            columns={[
              { title: "名称", dataIndex: "name" },
              {
                title: "类型",
                dataIndex: "type",
                width: 88,
                render: (t: string) => <Tag>{t}</Tag>,
              },
              { title: "绑定车辆", dataIndex: "bindPlates", ellipsis: true },
              { title: "告警策略", dataIndex: "alarm", width: 100 },
              {
                title: "启用",
                dataIndex: "enabled",
                width: 72,
                render: (v: boolean) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
              },
              {
                title: "操作",
                key: "op",
                width: 160,
                render: (_, r) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() =>
                        void doubleConfirmDelete({
                          firstTitle: `删除围栏「${r.name}」？`,
                          firstContent: "删除后立即写入网关，绑定车辆的围栏策略将失效。",
                          onDelete: () => remove(r.key),
                        })
                      }
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </div>
        <Card size="small" title="地图预览（首条围栏几何）" style={{ flex: "1 1 420px", minWidth: 320 }}>
          <div style={{ height: 360 }}>
            <MapContainer center={center} zoom={14} scrollWheelZoom style={{ height: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {geofences.length === 0 && (
                <>
                  <Circle center={center} radius={420} pathOptions={{ color: "#0d9488", fillOpacity: 0.12 }} />
                  <Polygon positions={demoPoly} pathOptions={{ color: "#ea580c", fillOpacity: 0.1 }} />
                </>
              )}
              {geofences[0]?.type === "圆形" &&
                geofences[0].centerLat != null &&
                geofences[0].centerLng != null &&
                geofences[0].radiusM != null && (
                  <Circle
                    center={[geofences[0].centerLat, geofences[0].centerLng]}
                    radius={geofences[0].radiusM}
                    pathOptions={{ color: "#0d9488", fillOpacity: 0.12 }}
                  />
                )}
              {geofences[0]?.type === "多边形" && geofences[0].polygon && geofences[0].polygon.length > 2 && (
                <Polygon positions={geofences[0].polygon} pathOptions={{ color: "#ea580c", fillOpacity: 0.1 }} />
              )}
            </MapContainer>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
            预览优先取列表第一条；无数据时显示示例圆/多边形。
          </Typography.Paragraph>
        </Card>
      </div>

      {open && (
        <Card size="small" title={editing ? "编辑围栏" : "新建围栏"} style={{ marginTop: 16 }}>
          <Form form={form} layout="vertical" style={{ maxWidth: 560 }} onFinish={onFinish}>
            <Form.Item name="key" label="key" rules={[{ required: true }]}>
              <Input disabled={!!editing} />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "圆形", label: "圆形" },
                  { value: "多边形", label: "多边形" },
                ]}
              />
            </Form.Item>
            <Form.Item name="bindPlates" label="绑定车辆（文案）">
              <Input />
            </Form.Item>
            <Form.Item name="alarm" label="告警策略" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "进区域", label: "进区域" },
                  { value: "出区域", label: "出区域" },
                  { value: "进出", label: "进出" },
                ]}
              />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Typography.Text type="secondary">圆形参数</Typography.Text>
            <Space wrap>
              <Form.Item name="centerLat" label="纬度">
                <InputNumber step={0.0001} />
              </Form.Item>
              <Form.Item name="centerLng" label="经度">
                <InputNumber step={0.0001} />
              </Form.Item>
              <Form.Item name="radiusM" label="半径 m">
                <InputNumber min={1} />
              </Form.Item>
            </Space>
            <Form.Item name="polygonJson" label="多边形 JSON（[[lat,lng],...]）">
              <Input.TextArea rows={4} placeholder='例：[[23.131,113.262],[23.131,113.268]]' />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
