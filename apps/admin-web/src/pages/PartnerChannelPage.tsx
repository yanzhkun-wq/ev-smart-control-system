import {
  App,
  Button,
  Col,
  Collapse,
  Input,
  InputNumber,
  Row,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { defaultPartnerChannelData } from "../constants/partnerChannelDefaults";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type {
  AdminChannelEndUserRow,
  AdminPartnerChannelStore,
  AdminPartnerMerchantRow,
  AdminPartnerPrincipalPerfRow,
  AdminPartnerRewardLineRow,
  AdminPartnerStaffPerfRow,
  StoreShape,
} from "../types/gatewayStore";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";
import {
  PartnerChannelDetailModal,
  type ChannelDetailMode,
} from "./PartnerChannelDetailModal";
import { PartnerChannelQueryPanel } from "./PartnerChannelQueryPanel";
import styles from "./partnerChannelPage.module.css";

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function fmtYuan(n: unknown): string {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : "—";
}

function dashText(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

type ChannelDetailOpen =
  | { mode: "principal"; record: AdminPartnerPrincipalPerfRow }
  | { mode: "staff"; record: AdminPartnerStaffPerfRow }
  | { mode: "merchant"; record: AdminPartnerMerchantRow }
  | { mode: "user"; record: AdminChannelEndUserRow }
  | { mode: "reward"; record: AdminPartnerRewardLineRow };

function cloneChannel(c: AdminPartnerChannelStore): AdminPartnerChannelStore {
  return JSON.parse(JSON.stringify(c)) as AdminPartnerChannelStore;
}

function normalizeChannel(c: AdminPartnerChannelStore): AdminPartnerChannelStore {
  const n = cloneChannel(c);
  if (!Array.isArray(n.merchants)) n.merchants = [];
  if (!Array.isArray(n.endUsers)) n.endUsers = [];
  return n;
}

export function PartnerChannelPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { store, saveStore, connected } = useAdminGateway();

  const fromStore = store?.admin?.partnerChannel;
  const [draft, setDraft] = useState<AdminPartnerChannelStore>(() =>
    normalizeChannel(fromStore ?? defaultPartnerChannelData()),
  );

  useEffect(() => {
    setDraft(normalizeChannel(fromStore ?? defaultPartnerChannelData()));
  }, [fromStore]);

  const overview = draft.overview;

  const save = async () => {
    if (!store) {
      message.warning("请先连接网关后再保存。");
      navigate("/settings");
      return;
    }
    try {
      const next: StoreShape = JSON.parse(JSON.stringify(store));
      next.admin = next.admin ?? {};
      next.admin.partnerChannel = draft;
      await saveStore(next);
      message.success("渠道与业绩数据已写入网关。");
    } catch (e) {
      message.error(String(e));
    }
  };

  const rootPhones = useMemo(
    () => Array.from(new Set(draft.principals.map((p) => p.principalPhone).filter(Boolean))),
    [draft.principals],
  );

  const rootPhoneOptionsLabeled = useMemo(
    () =>
      draft.principals.map((p) => ({
        label: `${p.principalName || "—"}（${p.principalPhone}）`,
        value: p.principalPhone,
      })),
    [draft.principals],
  );

  const rootPhoneDisplay = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of draft.principals) {
      if (!p.principalPhone) continue;
      m.set(
        p.principalPhone,
        p.principalName ? `${p.principalName} · ${p.principalPhone}` : p.principalPhone,
      );
    }
    return m;
  }, [draft.principals]);

  const [channelDetail, setChannelDetail] = useState<ChannelDetailOpen | null>(null);

  const applyChannelDetail = (
    mode: ChannelDetailMode,
    next:
      | AdminPartnerPrincipalPerfRow
      | AdminPartnerStaffPerfRow
      | AdminPartnerMerchantRow
      | AdminChannelEndUserRow
      | AdminPartnerRewardLineRow,
  ) => {
    setDraft((d) => {
      if (mode === "principal") {
        const n = next as AdminPartnerPrincipalPerfRow;
        return { ...d, principals: d.principals.map((x) => (x.key === n.key ? n : x)) };
      }
      if (mode === "staff") {
        const n = next as AdminPartnerStaffPerfRow;
        return { ...d, staffDetails: d.staffDetails.map((x) => (x.key === n.key ? n : x)) };
      }
      if (mode === "merchant") {
        const n = next as AdminPartnerMerchantRow;
        return {
          ...d,
          merchants: (d.merchants ?? []).map((x) => (x.key === n.key ? n : x)),
        };
      }
      if (mode === "reward") {
        const n = next as AdminPartnerRewardLineRow;
        return {
          ...d,
          rewardLines: d.rewardLines.map((x) => (x.key === n.key ? n : x)),
        };
      }
      const n = next as AdminChannelEndUserRow;
      return {
        ...d,
        endUsers: (d.endUsers ?? []).map((x) => (x.key === n.key ? n : x)),
      };
    });
  };

  const [ledgerSection, setLedgerSection] = useState<
    "principals" | "staff" | "merchants" | "end_users" | "ledger_lines"
  >("principals");

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageTop}>
        <Typography.Title level={5} style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
          平台 · 渠道与业绩
        </Typography.Title>
        <Space wrap size={4}>
          <Button
            size="small"
            onClick={() => {
              setDraft(normalizeChannel(fromStore ?? defaultPartnerChannelData()));
              message.info("已恢复为当前拉取的数据");
            }}
          >
            撤销未保存
          </Button>
          <Button type="primary" size="small" onClick={() => void save()} disabled={!connected}>
            保存到网关
          </Button>
        </Space>
      </div>
      <p className={styles.toolbarNote}>
        演示 <Typography.Text code>admin.partnerChannel</Typography.Text>
        ：台账列表为只读浏览，点「编辑」在弹窗维护；正式环境由业务系统回写。
        {!connected ? <Typography.Text type="warning"> 未连接网关无法保存。</Typography.Text> : null}
      </p>

      <Collapse
        bordered={false}
        className={styles.overviewCollapse}
        defaultActiveKey={[]}
        size="small"
        style={{ marginBottom: 6, background: "transparent" }}
        items={[
          {
            key: "overview",
            label: (
              <Typography.Text strong style={{ fontSize: 12 }}>
                平台概览（统计周期、汇总数字，默认折叠）
              </Typography.Text>
            ),
            children: (
              <>
                <Row gutter={[8, 8]}>
          <Col xs={12} sm={8} md={4}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              统计周期文案
            </Typography.Text>
            <Input
              size="small"
              value={overview.periodLabel}
              onChange={(e) =>
                setDraft((d) => ({ ...d, overview: { ...d.overview, periodLabel: e.target.value } }))
              }
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              合作商主管（家）
            </Typography.Text>
            <InputNumber
              size="small"
              style={{ width: "100%" }}
              min={0}
              value={overview.totalPartners}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  overview: { ...d.overview, totalPartners: Number(v) || 0 },
                }))
              }
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              体系员工（人）
            </Typography.Text>
            <InputNumber
              size="small"
              style={{ width: "100%" }}
              min={0}
              value={overview.totalStaff}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  overview: { ...d.overview, totalStaff: Number(v) || 0 },
                }))
              }
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              流水合计（元）
            </Typography.Text>
            <InputNumber
              size="small"
              style={{ width: "100%" }}
              min={0}
              step={0.01}
              value={overview.platformGrossYuan}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  overview: { ...d.overview, platformGrossYuan: Number(v) || 0 },
                }))
              }
            />
          </Col>
          <Col xs={12} sm={8} md={8}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              数据更新时间
            </Typography.Text>
            <Input
              size="small"
              value={overview.updatedAt ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, overview: { ...d.overview, updatedAt: e.target.value } }))
              }
            />
          </Col>
        </Row>
                <Input.TextArea
                  size="small"
                  style={{ marginTop: 8 }}
                  rows={1}
                  placeholder="备注（内部说明，可选）"
                  value={overview.remark ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, overview: { ...d.overview, remark: e.target.value } }))
                  }
                />
              </>
            ),
          },
        ]}
      />

      <Tabs
        className={styles.mainTabs}
        size="small"
        defaultActiveKey="query"
        items={[
          {
            key: "query",
            label: "业绩查询",
            children: <PartnerChannelQueryPanel channel={draft} />,
          },
          {
            key: "ledger",
            label: "台账维护",
            children: (
              <div className={styles.ledgerHost}>
                <Segmented
                  className={styles.ledgerSegmented}
                  size="small"
                  value={ledgerSection}
                  onChange={(v) =>
                    setLedgerSection(v as "principals" | "staff" | "merchants" | "end_users" | "ledger_lines")
                  }
                  options={[
                    { label: "主管", value: "principals" },
                    { label: "员工", value: "staff" },
                    { label: "商家", value: "merchants" },
                    { label: "用户", value: "end_users" },
                    { label: "流水", value: "ledger_lines" },
                  ]}
                />
                <Tabs
                  className={styles.ledgerTabsNoBar}
                  activeKey={ledgerSection}
                  onChange={(k) =>
                    setLedgerSection(k as "principals" | "staff" | "merchants" | "end_users" | "ledger_lines")
                  }
                  size="small"
                  items={[
                  {
                    key: "principals",
                    label: "主管",
                    children: (
                      <>
                        <div className={styles.ledgerToolbar}>
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => {
                            const key = uid("pp");
                            const newRow: AdminPartnerPrincipalPerfRow = {
                              key,
                              principalPhone: "",
                              principalName: "",
                              staffCount: 0,
                              periodGrossYuan: 0,
                              principalRetainYuan: 0,
                              teamLineRewardYuan: 0,
                              newUsers: 0,
                              newMerchants: 0,
                              settleCount: 0,
                              tierLabel: "V1",
                              backupPhone: "",
                              adminNote: "",
                            };
                            setDraft((d) => ({ ...d, principals: [...d.principals, newRow] }));
                            setChannelDetail({ mode: "principal", record: newRow });
                          }}
                        >
                          新增一行
                        </Button>
                        </div>
                <Table<AdminPartnerPrincipalPerfRow>
                  className={`${styles.tableWrap} ${styles.tableLedger}`}
                  tableLayout="fixed"
                  size="small"
                  pagination={false}
                  scroll={{ x: 706 }}
                  rowKey="key"
                  dataSource={draft.principals}
                  columns={[
                    {
                      title: "主管手机",
                      dataIndex: "principalPhone",
                      width: 106,
                      ellipsis: true,
                    },
                    {
                      title: "名称",
                      dataIndex: "principalName",
                      width: 90,
                      ellipsis: true,
                    },
                    {
                      title: "档位",
                      dataIndex: "tierLabel",
                      width: 50,
                      render: (t: string | undefined) =>
                        t ? <Tag color="blue">{t}</Tag> : "—",
                    },
                    { title: "员工", dataIndex: "staffCount", width: 38, align: "right" },
                    {
                      title: "毛利",
                      dataIndex: "periodGrossYuan",
                      width: 62,
                      align: "right",
                      render: (v: number) => fmtYuan(v),
                    },
                    {
                      title: "留存",
                      dataIndex: "principalRetainYuan",
                      width: 62,
                      align: "right",
                      render: (v: number) => fmtYuan(v),
                    },
                    {
                      title: "团队线",
                      dataIndex: "teamLineRewardYuan",
                      width: 62,
                      align: "right",
                      render: (v: number) => fmtYuan(v),
                    },
                    { title: "新客", dataIndex: "newUsers", width: 38, align: "right" },
                    { title: "新店", dataIndex: "newMerchants", width: 38, align: "right" },
                    { title: "结算", dataIndex: "settleCount", width: 38, align: "right" },
                    {
                      title: "",
                      key: "prof",
                      width: 46,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setChannelDetail({ mode: "principal", record: { ...row } })}
                        >
                          编辑
                        </Button>
                      ),
                    },
                    {
                      title: "",
                      width: 38,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            void doubleConfirmDelete({
                              firstTitle: "删除该条主管台账？",
                              firstContent: `将删除：${row.principalName || row.principalPhone || row.key}。未点「保存到网关」前可用页顶撤销恢复。`,
                              onDelete: () =>
                                setDraft((d) => ({
                                  ...d,
                                  principals: d.principals.filter((x) => x.key !== row.key),
                                })),
                            })
                          }
                        >
                          删
                        </Button>
                      ),
                    },
                  ]}
                />
                      </>
                    ),
                  },
                  {
                    key: "staff",
                    label: "员工",
                    children: (
                      <>
                        <div className={styles.ledgerToolbar}>
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => {
                            const key = uid("st");
                            const newRow: AdminPartnerStaffPerfRow = {
                              key,
                              rootPartnerPhone: rootPhones[0] ?? "",
                              rootPartnerName: "",
                              staffPhone: "",
                              staffName: "",
                              tier: "L1",
                              commissionPct: 0,
                              targetUserCount: 0,
                              periodRewardYuan: 0,
                              inviteUsers: 0,
                              inviteMerchants: 0,
                              parentL1Hint: "",
                              workStatus: "在职",
                              backupPhone: "",
                              email: "",
                              adminNote: "",
                            };
                            setDraft((d) => ({ ...d, staffDetails: [...d.staffDetails, newRow] }));
                            setChannelDetail({ mode: "staff", record: newRow });
                          }}
                        >
                          新增员工行
                        </Button>
                        </div>
                <Table<AdminPartnerStaffPerfRow>
                  className={`${styles.tableWrap} ${styles.tableLedger}`}
                  tableLayout="fixed"
                  size="small"
                  pagination={{ pageSize: 12 }}
                  scroll={{ x: 902 }}
                  rowKey="key"
                  dataSource={draft.staffDetails}
                  columns={[
                    {
                      title: "主管手机",
                      dataIndex: "rootPartnerPhone",
                      width: 104,
                      ellipsis: true,
                    },
                    {
                      title: "体系",
                      dataIndex: "rootPartnerName",
                      width: 100,
                      ellipsis: true,
                    },
                    {
                      title: "员工手机",
                      dataIndex: "staffPhone",
                      width: 108,
                      ellipsis: true,
                    },
                    {
                      title: "姓名",
                      dataIndex: "staffName",
                      width: 92,
                      ellipsis: true,
                    },
                    {
                      title: "层级",
                      dataIndex: "tier",
                      width: 58,
                      render: (t: string | undefined) =>
                        t === "L1" ? (
                          <Tag color="blue">一级</Tag>
                        ) : t === "L2" ? (
                          <Tag>二级</Tag>
                        ) : (
                          dashText(t)
                        ),
                    },
                    {
                      title: "分佣%",
                      dataIndex: "commissionPct",
                      width: 52,
                      align: "right",
                      render: (v: number) => `${Number(v) || 0}`,
                    },
                    {
                      title: "区间业绩",
                      dataIndex: "periodRewardYuan",
                      width: 72,
                      align: "right",
                      render: (v: number) => fmtYuan(v),
                    },
                    {
                      title: "邀用户",
                      dataIndex: "inviteUsers",
                      width: 52,
                      align: "right",
                    },
                    {
                      title: "邀门店",
                      dataIndex: "inviteMerchants",
                      width: 52,
                      align: "right",
                    },
                    {
                      title: "挂靠说明",
                      dataIndex: "parentL1Hint",
                      width: 128,
                      ellipsis: true,
                    },
                    {
                      title: "",
                      key: "stf",
                      width: 46,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setChannelDetail({ mode: "staff", record: { ...row } })}
                        >
                          编辑
                        </Button>
                      ),
                    },
                    {
                      title: "",
                      width: 38,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            void doubleConfirmDelete({
                              firstTitle: "删除该条员工台账？",
                              firstContent: `将删除：${row.staffName || row.staffPhone || row.key}。未保存前可页顶撤销。`,
                              onDelete: () =>
                                setDraft((d) => ({
                                  ...d,
                                  staffDetails: d.staffDetails.filter((x) => x.key !== row.key),
                                })),
                            })
                          }
                        >
                          删
                        </Button>
                      ),
                    },
                  ]}
                />
                      </>
                    ),
                  },
                  {
                    key: "merchants",
                    label: "商家",
                    children: (
                      <>
                        <div className={styles.ledgerToolbar}>
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => {
                            const key = uid("m");
                            const newRow: AdminPartnerMerchantRow = {
                              key,
                              rootPartnerPhone: rootPhones[0] ?? "",
                              rootPartnerName: "",
                              merchantName: "",
                              shopPhone: "",
                              address: "",
                              inviterStaffPhone: "",
                              inviterStaffName: "",
                              status: "合作中",
                              bindAt: "",
                              periodOrderYuan: 0,
                              remark: "",
                              bossName: "",
                              city: "",
                              adminNote: "",
                            };
                            setDraft((d) => ({
                              ...d,
                              merchants: [...(d.merchants ?? []), newRow],
                            }));
                            setChannelDetail({ mode: "merchant", record: newRow });
                          }}
                        >
                          新增商家行
                        </Button>
                        </div>
                <Table<AdminPartnerMerchantRow>
                  className={`${styles.tableWrap} ${styles.tableLedger}`}
                  tableLayout="fixed"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1100 }}
                  rowKey="key"
                  dataSource={draft.merchants ?? []}
                  columns={[
                    {
                      title: "主管手机",
                      dataIndex: "rootPartnerPhone",
                      width: 92,
                      ellipsis: true,
                    },
                    {
                      title: "体系",
                      dataIndex: "rootPartnerName",
                      width: 82,
                      ellipsis: true,
                    },
                    {
                      title: "门店",
                      dataIndex: "merchantName",
                      width: 96,
                      ellipsis: true,
                    },
                    {
                      title: "店主",
                      dataIndex: "bossName",
                      width: 58,
                      ellipsis: true,
                      render: (v: string | undefined) => dashText(v),
                    },
                    {
                      title: "城市",
                      dataIndex: "city",
                      width: 58,
                      ellipsis: true,
                      render: (v: string | undefined) => dashText(v),
                    },
                    {
                      title: "电话",
                      dataIndex: "shopPhone",
                      width: 96,
                      ellipsis: true,
                    },
                    {
                      title: "地址",
                      dataIndex: "address",
                      width: 90,
                      ellipsis: true,
                    },
                    {
                      title: "邀请员工",
                      dataIndex: "inviterStaffName",
                      width: 68,
                      ellipsis: true,
                    },
                    {
                      title: "员工手机",
                      dataIndex: "inviterStaffPhone",
                      width: 96,
                      ellipsis: true,
                    },
                    {
                      title: "状态",
                      dataIndex: "status",
                      width: 58,
                      render: (s: string | undefined) =>
                        s ? <Tag color={s === "合作中" ? "green" : "default"}>{s}</Tag> : "—",
                    },
                    {
                      title: "建档",
                      dataIndex: "bindAt",
                      width: 78,
                      ellipsis: true,
                    },
                    {
                      title: "区间订单",
                      dataIndex: "periodOrderYuan",
                      width: 62,
                      align: "right",
                      render: (v: number) => fmtYuan(v),
                    },
                    {
                      title: "备注",
                      dataIndex: "remark",
                      width: 76,
                      ellipsis: true,
                      render: (v: string | undefined) => dashText(v),
                    },
                    {
                      title: "",
                      key: "march",
                      width: 46,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setChannelDetail({ mode: "merchant", record: { ...row } })}
                        >
                          编辑
                        </Button>
                      ),
                    },
                    {
                      title: "",
                      width: 38,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            void doubleConfirmDelete({
                              firstTitle: "删除该条商家/网点？",
                              firstContent: `将删除：${row.merchantName || row.key}。未保存前可页顶撤销。`,
                              onDelete: () =>
                                setDraft((d) => ({
                                  ...d,
                                  merchants: (d.merchants ?? []).filter((x) => x.key !== row.key),
                                })),
                            })
                          }
                        >
                          删
                        </Button>
                      ),
                    },
                  ]}
                />
                      </>
                    ),
                  },
                  {
                    key: "end_users",
                    label: "用户",
                    children: (
                      <>
                        <div className={styles.ledgerToolbar}>
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => {
                            const key = uid("eu");
                            const newRow: AdminChannelEndUserRow = {
                              key,
                              userPhone: "",
                              displayName: "",
                              inviterPhone: "",
                              inviterName: "",
                              rootPartnerPhone: rootPhones[0] ?? "",
                              vipTierLabel: "",
                              registeredAt: "",
                              remark: "",
                            };
                            setDraft((d) => ({
                              ...d,
                              endUsers: [...(d.endUsers ?? []), newRow],
                            }));
                            setChannelDetail({ mode: "user", record: newRow });
                          }}
                        >
                          新增终端用户
                        </Button>
                        </div>
                        <Table<AdminChannelEndUserRow>
                          className={`${styles.tableWrap} ${styles.tableLedger}`}
                          tableLayout="fixed"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          scroll={{ x: 650 }}
                          rowKey="key"
                          dataSource={draft.endUsers ?? []}
                          columns={[
                            {
                              title: "手机",
                              dataIndex: "userPhone",
                              width: 102,
                              ellipsis: true,
                            },
                            {
                              title: "显示名",
                              dataIndex: "displayName",
                              width: 86,
                              ellipsis: true,
                              render: (v: string | undefined) => dashText(v),
                            },
                            {
                              title: "归属主管",
                              dataIndex: "rootPartnerPhone",
                              width: 126,
                              ellipsis: true,
                              render: (v: string | undefined) =>
                                (v && rootPhoneDisplay.get(v)) || dashText(v),
                            },
                            {
                              title: "邀请人",
                              dataIndex: "inviterName",
                              width: 80,
                              ellipsis: true,
                              render: (v: string | undefined, row) =>
                                dashText(v || row.inviterPhone),
                            },
                            {
                              title: "VIP",
                              dataIndex: "vipTierLabel",
                              width: 86,
                              ellipsis: true,
                              render: (v: string | undefined) =>
                                v ? <Tag color="gold">{v}</Tag> : "—",
                            },
                            {
                              title: "建档",
                              dataIndex: "registeredAt",
                              width: 86,
                              ellipsis: true,
                              render: (v: string | undefined) => dashText(v),
                            },
                            {
                              title: "",
                              key: "eud",
                              width: 46,
                              fixed: "right",
                              render: (_, row) => (
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => setChannelDetail({ mode: "user", record: { ...row } })}
                                >
                                  编辑
                                </Button>
                              ),
                            },
                            {
                              title: "",
                              width: 38,
                              fixed: "right",
                              render: (_, row) => (
                                <Button
                                  type="link"
                                  danger
                                  size="small"
                                  onClick={() =>
                                    void doubleConfirmDelete({
                                      firstTitle: "删除该终端用户台账？",
                                      firstContent: `将删除：${row.displayName || row.userPhone || row.key}`,
                                      onDelete: () =>
                                        setDraft((d) => ({
                                          ...d,
                                          endUsers: (d.endUsers ?? []).filter((x) => x.key !== row.key),
                                        })),
                                    })
                                  }
                                >
                                  删
                                </Button>
                              ),
                            },
                          ]}
                        />
                      </>
                    ),
                  },
                  {
                    key: "ledger_lines",
                    label: "流水",
                    children: (
                      <>
                        <div className={styles.ledgerToolbar}>
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => {
                            const key = uid("rw");
                            const newRow: AdminPartnerRewardLineRow = {
                              key,
                              time: new Date().toISOString().replace("T", " ").slice(0, 19),
                              rootPartnerPhone: rootPhones[0] ?? "",
                              kind: "",
                              amountYuan: 0,
                              inviterStaffPhone: "",
                              inviterStaffName: "",
                              remark: "",
                            };
                            setDraft((d) => ({
                              ...d,
                              rewardLines: [newRow, ...d.rewardLines],
                            }));
                            setChannelDetail({ mode: "reward", record: newRow });
                          }}
                        >
                          新增流水
                        </Button>
                        </div>
                <Table<AdminPartnerRewardLineRow>
                  className={`${styles.tableWrap} ${styles.tableLedger}`}
                  tableLayout="fixed"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 832 }}
                  rowKey="key"
                  dataSource={draft.rewardLines}
                  columns={[
                    {
                      title: "时间",
                      dataIndex: "time",
                      width: 148,
                      ellipsis: true,
                    },
                    {
                      title: "主管",
                      dataIndex: "rootPartnerPhone",
                      width: 124,
                      ellipsis: true,
                      render: (v: string) => (v && rootPhoneDisplay.get(v)) || dashText(v),
                    },
                    {
                      title: "类型",
                      dataIndex: "kind",
                      width: 112,
                      ellipsis: true,
                    },
                    {
                      title: "金额",
                      dataIndex: "amountYuan",
                      width: 72,
                      align: "right",
                      render: (v: number) => fmtYuan(v),
                    },
                    {
                      title: "归因手机",
                      dataIndex: "inviterStaffPhone",
                      width: 106,
                      ellipsis: true,
                      render: (v: string | undefined) => dashText(v),
                    },
                    {
                      title: "归因员工",
                      dataIndex: "inviterStaffName",
                      width: 82,
                      ellipsis: true,
                      render: (v: string | undefined) => dashText(v),
                    },
                    {
                      title: "备注",
                      dataIndex: "remark",
                      width: 104,
                      ellipsis: true,
                      render: (v: string | undefined) => dashText(v),
                    },
                    {
                      title: "",
                      key: "rw_edit",
                      width: 46,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setChannelDetail({ mode: "reward", record: { ...row } })}
                        >
                          编辑
                        </Button>
                      ),
                    },
                    {
                      title: "",
                      width: 38,
                      fixed: "right",
                      render: (_, row) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            void doubleConfirmDelete({
                              firstTitle: "删除该条渠道流水？",
                              firstContent: `将删除流水 ${row.key}（${row.kind || "—"}）。未保存前可页顶撤销。`,
                              onDelete: () =>
                                setDraft((d) => ({
                                  ...d,
                                  rewardLines: d.rewardLines.filter((x) => x.key !== row.key),
                                })),
                            })
                          }
                        >
                          删
                        </Button>
                      ),
                    },
                  ]}
                />
                      </>
                    ),
                  },
                ]}
              />
              </div>
            ),
          },
        ]}
      />

      <PartnerChannelDetailModal
        open={!!channelDetail}
        mode={channelDetail?.mode ?? null}
        record={channelDetail?.record ?? null}
        rootPhoneOptions={rootPhoneOptionsLabeled}
        onClose={() => setChannelDetail(null)}
        onSave={(mode, next) => applyChannelDetail(mode, next)}
      />
    </div>
  );
}
