import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import { gatewayFetch } from "../api/client";
import type { DevicePresentation, LastPosition, StoreShape } from "../types/gatewayStore";
import type { UiDeviceRow } from "../utils/deviceRows";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";

export type DevicesPageProps = { embedded?: boolean };

export function DevicesPage({ embedded = false }: DevicesPageProps = {}) {
  const { message } = App.useApp();
  const { deviceRows, store, saveStore, refresh } = useAdminGateway();
  const [open, setOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"detail" | "pres" | "pos" | "add">("detail");
  const [current, setCurrent] = useState<UiDeviceRow | null>(null);
  const [presForm] = Form.useForm();
  const [posForm] = Form.useForm();
  const [addForm] = Form.useForm();

  const openDetail = (r: UiDeviceRow) => {
    setCurrent(r);
    setDrawerMode("detail");
    setOpen(true);
  };

  const openPres = (r: UiDeviceRow) => {
    setCurrent(r);
    setDrawerMode("pres");
    const pres = store?.admin?.devicePresentations?.[r.terminalPhone] ?? {};
    presForm.setFieldsValue({
      armed: pres.armed ?? r.armed,
      acc: pres.acc ?? r.acc,
      mainPowerOk: pres.mainPowerOk ?? r.mainPowerOk,
      csq: pres.csq ?? r.csq,
      sat: pres.sat ?? r.sat,
      batteryPct: pres.batteryPct ?? r.batteryPct,
      locateMode: pres.locateMode ?? r.locateMode,
    });
    setOpen(true);
  };

  const openPos = (r: UiDeviceRow) => {
    setCurrent(r);
    setDrawerMode("pos");
    const lp = store?.lastPositions?.[r.terminalPhone];
    posForm.setFieldsValue({
      latDeg: lp?.latDeg ?? r.lat,
      lngDeg: lp?.lngDeg ?? r.lng,
      speedKmh: lp?.speedKmh ?? r.speedKmh,
      alarm: lp?.alarm ?? 0,
      status: lp?.status ?? 0,
      deviceTime: lp?.deviceTime ?? "",
    });
    setOpen(true);
  };

  const savePresentation = async () => {
    if (!store || !current) return;
    const v = await presForm.validateFields();
    const next: StoreShape = JSON.parse(JSON.stringify(store));
    next.admin = next.admin ?? {};
    next.admin.devicePresentations = { ...next.admin.devicePresentations };
    const dp: DevicePresentation = {
      armed: !!v.armed,
      acc: !!v.acc,
      mainPowerOk: !!v.mainPowerOk,
      csq: Number(v.csq) || 0,
      sat: Number(v.sat) || 0,
      batteryPct: Number(v.batteryPct) || 0,
      locateMode: String(v.locateMode ?? ""),
    };
    next.admin.devicePresentations[current.terminalPhone] = dp;
    try {
      await saveStore(next);
      message.success("展示字段已保存");
      setOpen(false);
    } catch (e) {
      message.error(String(e));
    }
  };

  const savePositionOverride = async () => {
    if (!store || !current) return;
    const v = await posForm.validateFields();
    const next: StoreShape = JSON.parse(JSON.stringify(store));
    const lp: LastPosition = {
      terminalPhone: current.terminalPhone,
      latDeg: Number(v.latDeg),
      lngDeg: Number(v.lngDeg),
      speedKmh: Number(v.speedKmh) || 0,
      alarm: Number(v.alarm) || 0,
      status: Number(v.status) || 0,
      receivedAt: new Date().toISOString(),
    };
    if (v.deviceTime) lp.deviceTime = String(v.deviceTime);
    next.lastPositions = { ...next.lastPositions, [current.terminalPhone]: lp };
    try {
      await saveStore(next);
      message.success("最后位置已写入（含手工覆盖）");
      setOpen(false);
    } catch (e) {
      message.error(String(e));
    }
  };

  const addBind = async () => {
    const v = await addForm.validateFields();
    try {
      await gatewayFetch("/api/bind", {
        method: "POST",
        body: JSON.stringify({
          terminalPhone: v.terminalPhone,
          plate: v.plate,
          note: v.note || undefined,
        }),
      });
      message.success("已添加绑定");
      addForm.resetFields();
      await refresh();
      setOpen(false);
    } catch (e) {
      message.error(String(e));
    }
  };

  const removeBind = async (phone: string) => {
    try {
      await gatewayFetch(`/api/bind/${encodeURIComponent(phone)}`, { method: "DELETE" });
      message.success("已删除绑定");
      await refresh();
    } catch (e) {
      message.error(String(e));
    }
  };

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            设备与车辆
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            绑定关系走网关 HTTP；列表展示字段可在「编辑展示」中落盘。最后位置可被设备上报覆盖，也可在此手工改库。
          </Typography.Paragraph>
        </>
      ) : null}

      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setCurrent(null);
            setDrawerMode("add");
            addForm.resetFields();
            setOpen(true);
          }}
        >
          新增绑定
        </Button>
      </Space>

      <Table
        rowKey="key"
        dataSource={deviceRows}
        pagination={false}
        columns={[
          { title: "车牌", dataIndex: "plate" },
          { title: "终端号", dataIndex: "terminalId", width: 130 },
          {
            title: "在线",
            dataIndex: "online",
            width: 88,
            render: (v: boolean) => (v ? <Tag color="green">在线</Tag> : <Tag>离线</Tag>),
          },
          {
            title: "设防",
            dataIndex: "armed",
            width: 72,
            render: (v: boolean) => (v ? <Tag color="orange">是</Tag> : <Tag>否</Tag>),
          },
          {
            title: "ACC",
            dataIndex: "acc",
            width: 72,
            render: (v: boolean) => (v ? <Tag color="blue">开</Tag> : <Tag>关</Tag>),
          },
          {
            title: "主电",
            dataIndex: "mainPowerOk",
            width: 88,
            render: (v: boolean) => (v ? <Tag color="green">正常</Tag> : <Tag color="red">断开</Tag>),
          },
          { title: "定位模式", dataIndex: "locateMode", width: 120 },
          { title: "最近通信", dataIndex: "lastSeen", width: 170 },
          {
            title: "操作",
            key: "op",
            width: 280,
            render: (_, r) => (
              <Space size="small" wrap>
                <Button type="link" size="small" onClick={() => openDetail(r)}>
                  详情
                </Button>
                <Button type="link" size="small" onClick={() => openPres(r)}>
                  编辑展示
                </Button>
                <Button type="link" size="small" onClick={() => openPos(r)}>
                  编辑位置
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() =>
                    void doubleConfirmDelete({
                      firstTitle: `删除车辆绑定？`,
                      firstContent: `终端 ${r.terminalPhone} · 车牌 ${r.plate}。将调用网关 DELETE /api/bind，解除绑定关系。`,
                      onDelete: () => removeBind(r.terminalPhone),
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

      <Drawer
        width={520}
        title={
          drawerMode === "add"
            ? "新增绑定"
            : drawerMode === "pres"
              ? `编辑展示 · ${current?.plate}`
              : drawerMode === "pos"
                ? `编辑最后位置 · ${current?.plate}`
                : current
                  ? `${current.plate} · 终端详情`
                  : "详情"
        }
        open={open}
        onClose={() => setOpen(false)}
        extra={
          drawerMode === "pres" ? (
            <Button type="primary" onClick={() => void savePresentation()}>
              保存展示字段
            </Button>
          ) : drawerMode === "pos" ? (
            <Button type="primary" onClick={() => void savePositionOverride()}>
              保存位置
            </Button>
          ) : drawerMode === "add" ? (
            <Button type="primary" onClick={() => void addBind()}>
              提交
            </Button>
          ) : null
        }
      >
        {drawerMode === "add" && (
          <Form form={addForm} layout="vertical">
            <Form.Item
              label="终端号（11 位）"
              name="terminalPhone"
              rules={[{ required: true, message: "必填" }]}
            >
              <Input placeholder="13800138000" />
            </Form.Item>
            <Form.Item label="车牌" name="plate" rules={[{ required: true, message: "必填" }]}>
              <Input placeholder="京A12345" />
            </Form.Item>
            <Form.Item label="备注" name="note">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        )}
        {drawerMode === "pres" && current && (
          <Form form={presForm} layout="vertical">
            <Form.Item label="设防" name="armed" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="ACC" name="acc" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="主电正常" name="mainPowerOk" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="CSQ" name="csq">
              <InputNumber min={0} max={31} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="卫星数" name="sat">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="内置电池%" name="batteryPct">
              <InputNumber min={0} max={100} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="定位模式文案" name="locateMode">
              <Input />
            </Form.Item>
          </Form>
        )}
        {drawerMode === "pos" && current && (
          <Form form={posForm} layout="vertical">
            <Form.Item label="纬度 °" name="latDeg" rules={[{ required: true }]}>
              <InputNumber step={0.000001} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="经度 °" name="lngDeg" rules={[{ required: true }]}>
              <InputNumber step={0.000001} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="速度 km/h" name="speedKmh">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="alarm（原始 uint）" name="alarm">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="status（原始 uint）" name="status">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="设备时间（可选 ISO）" name="deviceTime">
              <Input placeholder="2026-05-01T12:00:00" />
            </Form.Item>
          </Form>
        )}
        {drawerMode === "detail" && current && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="终端号">{current.terminalId}</Descriptions.Item>
              <Descriptions.Item label="最后时间">{current.lastSeen}</Descriptions.Item>
              <Descriptions.Item label="经纬度">
                {current.lat.toFixed(6)}, {current.lng.toFixed(6)}
              </Descriptions.Item>
              <Descriptions.Item label="速度">{current.speedKmh} km/h</Descriptions.Item>
              <Descriptions.Item label="CSQ / 卫星">
                {current.csq} / {current.sat}
              </Descriptions.Item>
              <Descriptions.Item label="内置电池%">{current.batteryPct}</Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph style={{ marginTop: 16 }} type="secondary">
              完整 TLV 解析在网关扩展后可追加展示；此处为管理端可编辑字段 + 最后位置摘要。
            </Typography.Paragraph>
          </>
        )}
      </Drawer>
    </div>
  );
}
