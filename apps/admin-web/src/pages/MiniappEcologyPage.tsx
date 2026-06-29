import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";
import type {
  AdminMiniappEcology,
  AdminMiniappMerchantShopRow,
  AdminMiniappReferralEntry,
  AdminMiniappStaffBlob,
  StoreShape,
} from "../types/gatewayStore";

function cloneEcology(x: AdminMiniappEcology | undefined | null): AdminMiniappEcology {
  if (!x) return { partnerStaffByPhone: {}, merchantShops: [], accountRoles: {}, referralUplines: {} };
  return JSON.parse(JSON.stringify(x)) as AdminMiniappEcology;
}

function normPhone11(input: string): string {
  const d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length > 11) return d.slice(-11);
  return "";
}

type StaffRow = AdminMiniappStaffBlob & { phone: string };

export default function MiniappEcologyPage() {
  const { message } = App.useApp();
  const { store, saveStore, connected, error } = useAdminGateway();
  const [ecology, setEcology] = useState<AdminMiniappEcology>(() => cloneEcology(null));

  const [staffOpen, setStaffOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [shopEditing, setShopEditing] = useState<AdminMiniappMerchantShopRow | null>(null);

  const [staffForm] = Form.useForm<{ phone: string } & AdminMiniappStaffBlob>();
  const [shopForm] = Form.useForm<AdminMiniappMerchantShopRow>();
  const [roleForm] = Form.useForm<{ phone: string; partner: boolean; merchant: boolean }>();
  const [refForm] = Form.useForm<{ inviteePhone: string } & AdminMiniappReferralEntry>();

  useEffect(() => {
    setEcology(cloneEcology(store?.admin?.miniappEcology));
  }, [store?.admin?.miniappEcology]);

  const staffRows: StaffRow[] = useMemo(
    () =>
      Object.entries(ecology.partnerStaffByPhone).map(([phone, blob]) => ({
        phone,
        ...blob,
      })),
    [ecology.partnerStaffByPhone],
  );

  const roleRows = useMemo(
    () =>
      Object.entries(ecology.accountRoles).map(([phone, r]) => ({
        phone,
        partner: !!r.partner,
        merchant: !!r.merchant,
      })),
    [ecology.accountRoles],
  );

  const refRows = useMemo(
    () =>
      Object.entries(ecology.referralUplines).map(([inviteePhone, e]) => ({
        inviteePhone,
        ...e,
      })),
    [ecology.referralUplines],
  );

  async function persist() {
    if (!store) {
      message.error("无门店数据，请先连接网关");
      return;
    }
    try {
      const next: StoreShape = JSON.parse(JSON.stringify(store));
      if (!next.admin) next.admin = {};
      next.admin.miniappEcology = cloneEcology(ecology);
      await saveStore(next);
      message.success("已写入网关；演示小程序重新拉取 /api/miniapp-ui 后本地缓存会更新。");
    } catch (e) {
      message.error(String(e));
    }
  }

  const staffCols: ColumnsType<StaffRow> = [
    { title: "员工手机", dataIndex: "phone", width: 120 },
    { title: "体系主管", dataIndex: "rootPartnerPhone", width: 120 },
    { title: "层级", dataIndex: "tier", width: 72 },
    { title: "挂靠一级", dataIndex: "parentL1Phone", ellipsis: true },
    { title: "姓名", dataIndex: "displayName", ellipsis: true },
    { title: "分成%", dataIndex: "commissionPct", width: 72 },
    { title: "目标用户", dataIndex: "targetUserCount", width: 88 },
    {
      title: "操作",
      key: "op",
      width: 88,
      render: (_, rec) => (
        <Button
          type="link"
          size="small"
          danger
          onClick={() =>
            void doubleConfirmDelete({
              firstTitle: "删除该员工行？",
              onDelete: () => {
                setEcology((prev) => {
                  const map = { ...prev.partnerStaffByPhone };
                  delete map[rec.phone];
                  return { ...prev, partnerStaffByPhone: map };
                });
              },
            })
          }
        >
          删除
        </Button>
      ),
    },
  ];

  const shopCols: ColumnsType<AdminMiniappMerchantShopRow> = [
    { title: "门店 ID", dataIndex: "id", width: 120, ellipsis: true },
    { title: "店主手机", dataIndex: "ownerPhone", width: 120 },
    { title: "店名", dataIndex: "shopName", ellipsis: true },
    { title: "归属合作商", dataIndex: "partnerPhone", width: 120, render: (v) => v || "—" },
    {
      title: "上架",
      dataIndex: "published",
      width: 72,
      render: (published, rec) => (
        <Switch
          size="small"
          checked={published !== false}
          onChange={(c) =>
            setEcology((p) => ({
              ...p,
              merchantShops: p.merchantShops.map((x) => (x.id === rec.id ? { ...x, published: c } : x)),
            }))
          }
        />
      ),
    },
    {
      title: "操作",
      key: "op",
      width: 140,
      render: (_, rec) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => openShopEdit(rec)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() =>
              void doubleConfirmDelete({
                firstTitle: "删除该门店？",
                onDelete: () =>
                  setEcology((p) => ({
                    ...p,
                    merchantShops: p.merchantShops.filter((x) => x.id !== rec.id),
                  })),
              })
            }
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const roleCols: ColumnsType<(typeof roleRows)[number]> = [
    { title: "手机", dataIndex: "phone", width: 120 },
    {
      title: "合作商",
      dataIndex: "partner",
      width: 88,
      render: (v, rec) => (
        <Switch
          size="small"
          checked={!!v}
          onChange={(c) =>
            setEcology((p) => ({
              ...p,
              accountRoles: {
                ...p.accountRoles,
                [rec.phone]: { ...p.accountRoles[rec.phone], partner: c, merchant: !!p.accountRoles[rec.phone]?.merchant },
              },
            }))
          }
        />
      ),
    },
    {
      title: "商家",
      dataIndex: "merchant",
      width: 88,
      render: (v, rec) => (
        <Switch
          size="small"
          checked={!!v}
          onChange={(c) =>
            setEcology((p) => ({
              ...p,
              accountRoles: {
                ...p.accountRoles,
                [rec.phone]: { ...p.accountRoles[rec.phone], merchant: c, partner: !!p.accountRoles[rec.phone]?.partner },
              },
            }))
          }
        />
      ),
    },
    {
      title: "操作",
      key: "op",
      width: 88,
      render: (_, rec) => (
        <Button
          type="link"
          size="small"
          danger
          onClick={() =>
            void doubleConfirmDelete({
              firstTitle: "删除该角色行？",
              onDelete: () =>
                setEcology((p) => {
                  const roles = { ...p.accountRoles };
                  delete roles[rec.phone];
                  return { ...p, accountRoles: roles };
                }),
            })
          }
        >
          删除
        </Button>
      ),
    },
  ];

  const refCols: ColumnsType<(typeof refRows)[number]> = [
    { title: "被邀请人", dataIndex: "inviteePhone", width: 120 },
    { title: "邀请人", dataIndex: "inviterPhone", width: 120 },
    { title: "车牌", dataIndex: "plate", width: 120 },
    {
      title: "锁定",
      dataIndex: "locked",
      width: 72,
      render: (v, rec) => (
        <Switch
          size="small"
          checked={!!v}
          onChange={(c) =>
            setEcology((p) => ({
              ...p,
              referralUplines: {
                ...p.referralUplines,
                [rec.inviteePhone]: { ...p.referralUplines[rec.inviteePhone], locked: c },
              },
            }))
          }
        />
      ),
    },
    {
      title: "操作",
      key: "op",
      width: 88,
      render: (_, rec) => (
        <Button
          type="link"
          size="small"
          danger
          onClick={() =>
            void doubleConfirmDelete({
              firstTitle: "删除该邀请链？",
              onDelete: () =>
                setEcology((p) => {
                  const u = { ...p.referralUplines };
                  delete u[rec.inviteePhone];
                  return { ...p, referralUplines: u };
                }),
            })
          }
        >
          删除
        </Button>
      ),
    },
  ];

  function openStaffAdd() {
    staffForm.resetFields();
    staffForm.setFieldsValue({
      tier: "L1",
      parentL1Phone: "",
      displayName: "",
      commissionPct: 10,
      targetUserCount: 0,
      rootPartnerPhone: "",
    });
    setStaffOpen(true);
  }

  function submitStaff() {
    void staffForm.validateFields().then((v) => {
      const phone = normPhone11(v.phone);
      const root = normPhone11(v.rootPartnerPhone);
      if (phone.length !== 11 || root.length !== 11) {
        message.error("员工手机、体系主管须为 11 位手机号");
        return;
      }
      const tier = v.tier === "L1" ? "L1" : "L2";
      let parentL1Phone = normPhone11(v.parentL1Phone || "");
      if (tier === "L1") parentL1Phone = "";
      const blob: AdminMiniappStaffBlob = {
        rootPartnerPhone: root,
        tier,
        parentL1Phone: tier === "L2" ? parentL1Phone : "",
        displayName: (v.displayName || "员工").trim(),
        commissionPct: Math.min(100, Math.max(0, Math.round(Number(v.commissionPct) || 0))),
        targetUserCount: Math.max(0, Math.floor(Number(v.targetUserCount) || 0)),
        createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
      if (ecology.partnerStaffByPhone[phone]) {
        message.error("该手机号已在员工表中");
        return;
      }
      setEcology((p) => ({
        ...p,
        partnerStaffByPhone: { ...p.partnerStaffByPhone, [phone]: blob },
      }));
      setStaffOpen(false);
    });
  }

  function openShopCreate() {
    setShopEditing(null);
    shopForm.resetFields();
    shopForm.setFieldsValue({
      id: `shop_${Date.now()}`,
      published: true,
      lat: null,
      lng: null,
    } as Partial<AdminMiniappMerchantShopRow>);
    setShopOpen(true);
  }

  function openShopEdit(rec: AdminMiniappMerchantShopRow) {
    setShopEditing(rec);
    shopForm.setFieldsValue({ ...rec });
    setShopOpen(true);
  }

  function submitShop() {
    void shopForm.validateFields().then((raw) => {
      const id = String(raw.id ?? "").trim();
      const ownerPhone = normPhone11(String(raw.ownerPhone ?? ""));
      const shopName = String(raw.shopName ?? "").trim();
      if (!id || ownerPhone.length !== 11 || !shopName) {
        message.error("须填写门店 ID、店主 11 位手机、店名");
        return;
      }
      const row: AdminMiniappMerchantShopRow = {
        ...raw,
        id,
        ownerPhone,
        shopName,
        bossName: raw.bossName?.trim() || undefined,
        contactPhone: raw.contactPhone?.trim() || undefined,
        city: raw.city?.trim() || undefined,
        district: raw.district?.trim() || undefined,
        addressDetail: raw.addressDetail?.trim() || undefined,
        addressFull: raw.addressFull?.trim() || undefined,
        lat: raw.lat != null && Number.isFinite(Number(raw.lat)) ? Number(raw.lat) : null,
        lng: raw.lng != null && Number.isFinite(Number(raw.lng)) ? Number(raw.lng) : null,
        partnerPhone: raw.partnerPhone ? normPhone11(String(raw.partnerPhone)) : undefined,
        inviterStaffPhone: raw.inviterStaffPhone ? normPhone11(String(raw.inviterStaffPhone)) : undefined,
        bindLocked: raw.bindLocked === true,
        published: raw.published !== false,
      };
      if (row.partnerPhone && row.partnerPhone.length !== 11) delete row.partnerPhone;
      if (row.inviterStaffPhone && row.inviterStaffPhone.length !== 11) delete row.inviterStaffPhone;

      setEcology((p) => {
        const list = p.merchantShops.slice();
        const i = list.findIndex((x) => x.id === row.id);
        if (i >= 0) list[i] = row;
        else list.push(row);
        return { ...p, merchantShops: list };
      });
      setShopOpen(false);
      setShopEditing(null);
    });
  }

  function openRoleAdd() {
    roleForm.resetFields();
    roleForm.setFieldsValue({ phone: "", partner: false, merchant: false });
    setRoleOpen(true);
  }

  function submitRole() {
    void roleForm.validateFields().then((v) => {
      const phone = normPhone11(v.phone);
      if (phone.length !== 11) {
        message.error("须为 11 位手机号");
        return;
      }
      if (ecology.accountRoles[phone]) {
        message.error("该手机号已存在，请直接改表格开关");
        return;
      }
      setEcology((p) => ({
        ...p,
        accountRoles: {
          ...p.accountRoles,
          [phone]: { partner: !!v.partner, merchant: !!v.merchant },
        },
      }));
      setRoleOpen(false);
    });
  }

  function openRefAdd() {
    refForm.resetFields();
    refForm.setFieldsValue({
      inviteePhone: "",
      inviterPhone: "",
      plate: "",
      locked: true,
      at: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
    setRefOpen(true);
  }

  function submitRef() {
    void refForm.validateFields().then((v) => {
      const invitee = normPhone11(v.inviteePhone);
      const inviter = normPhone11(v.inviterPhone);
      if (invitee.length !== 11 || inviter.length !== 11) {
        message.error("被邀请人与邀请人均须为 11 位手机号");
        return;
      }
      if (ecology.referralUplines[invitee]) {
        message.error("该被邀请人已存在");
        return;
      }
      const entry: AdminMiniappReferralEntry = {
        inviterPhone: inviter,
        plate: String(v.plate || "").trim(),
        at: typeof v.at === "string" ? v.at : undefined,
        locked: v.locked !== false,
      };
      setEcology((p) => ({
        ...p,
        referralUplines: { ...p.referralUplines, [invitee]: entry },
      }));
      setRefOpen(false);
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        小程序后台数据
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: 720 }}>
        维护演示小程序中<strong>合作商员工</strong>、<strong>商家门店</strong>、<strong>账号角色</strong>与<strong>邀请链</strong>。保存后写入网关{" "}
        <Typography.Text code>admin.miniappEcology</Typography.Text>
        ，并由 <Typography.Text code>GET /api/miniapp-ui</Typography.Text> 下发；与「小程序门户权限」并行，互不影响。
      </Typography.Paragraph>
      {!connected && error ? <Typography.Text type="danger">未连接：{error}</Typography.Text> : null}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" onClick={() => void persist()}>
            保存到网关
          </Button>
          <Typography.Text type="secondary">
            网关状态：{connected ? "已连接" : "未连接"} · 员工 {staffRows.length} · 门店 {ecology.merchantShops.length} ·
            角色 {roleRows.length} · 邀请 {refRows.length}
          </Typography.Text>
        </Space>
      </Card>
      <Tabs
        items={[
          {
            key: "staff",
            label: "合作商员工",
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openStaffAdd}>
                    添加员工
                  </Button>
                </Space>
                <Table size="small" rowKey="phone" pagination={false} columns={staffCols} dataSource={staffRows} />
              </>
            ),
          },
          {
            key: "shops",
            label: "商家门店",
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openShopCreate}>
                    添加门店
                  </Button>
                </Space>
                <Table size="small" rowKey="id" pagination={false} columns={shopCols} dataSource={ecology.merchantShops} />
              </>
            ),
          },
          {
            key: "roles",
            label: "账号角色",
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openRoleAdd}>
                    添加账号
                  </Button>
                </Space>
                <Table size="small" rowKey="phone" pagination={false} columns={roleCols} dataSource={roleRows} />
              </>
            ),
          },
          {
            key: "ref",
            label: "邀请链",
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openRefAdd}>
                    添加邀请关系
                  </Button>
                </Space>
                <Table size="small" rowKey="inviteePhone" pagination={false} columns={refCols} dataSource={refRows} />
              </>
            ),
          },
        ]}
      />

      <Drawer title="添加员工" open={staffOpen} onClose={() => setStaffOpen(false)} width={420} extra={<Button onClick={submitStaff}>确定</Button>}>
        <Form form={staffForm} layout="vertical">
          <Form.Item name="phone" label="员工手机" rules={[{ required: true, message: "必填" }]}>
            <Input placeholder="11 位" />
          </Form.Item>
          <Form.Item name="rootPartnerPhone" label="体系主管（合作商根手机）" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tier" label="层级" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "L1", label: "一级员工 L1" },
                { value: "L2", label: "二级员工 L2" },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.tier !== b.tier}>
            {() =>
              staffForm.getFieldValue("tier") === "L2" ? (
                <Form.Item name="parentL1Phone" label="挂靠一级员工手机（可空则小程序侧按 ROOT 处理）">
                  <Input />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="displayName" label="显示名">
            <Input />
          </Form.Item>
          <Form.Item name="commissionPct" label="分成 %">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="targetUserCount" label="目标用户数（演示）">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={shopEditing ? "编辑门店" : "添加门店"}
        open={shopOpen}
        onClose={() => {
          setShopOpen(false);
          setShopEditing(null);
        }}
        width={480}
        extra={<Button onClick={submitShop}>保存</Button>}
      >
        <Form form={shopForm} layout="vertical">
          <Form.Item name="id" label="门店 ID" rules={[{ required: true }]}>
            <Input disabled={!!shopEditing} />
          </Form.Item>
          <Form.Item name="ownerPhone" label="店主手机" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="shopName" label="店名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bossName" label="老板称呼">
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input />
          </Form.Item>
          <Form.Item name="district" label="区县">
            <Input />
          </Form.Item>
          <Form.Item name="addressDetail" label="详细地址">
            <Input />
          </Form.Item>
          <Form.Item name="addressFull" label="完整地址">
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="lat" label="纬度">
              <InputNumber style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="lng" label="经度">
              <InputNumber style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="partnerPhone" label="归属合作商手机">
            <Input />
          </Form.Item>
          <Form.Item name="inviterStaffPhone" label="邀请人员工手机">
            <Input />
          </Form.Item>
          <Form.Item name="bindLocked" label="绑定锁定" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="published" label="上架" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer title="添加账号角色" open={roleOpen} onClose={() => setRoleOpen(false)} width={400} extra={<Button onClick={submitRole}>确定</Button>}>
        <Form form={roleForm} layout="vertical">
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="partner" label="合作商" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="merchant" label="商家" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer title="添加邀请" open={refOpen} onClose={() => setRefOpen(false)} width={400} extra={<Button onClick={submitRef}>确定</Button>}>
        <Form form={refForm} layout="vertical">
          <Form.Item name="inviteePhone" label="被邀请人手机" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="inviterPhone" label="邀请人手机" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="plate" label="车牌">
            <Input />
          </Form.Item>
          <Form.Item name="at" label="时间">
            <Input />
          </Form.Item>
          <Form.Item name="locked" label="锁定" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
