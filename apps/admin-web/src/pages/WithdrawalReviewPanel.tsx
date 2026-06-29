import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type {
  AdminPartnerMerchantRow,
  AdminPartnerPrincipalPerfRow,
  AdminPartnerRewardLineRow,
  AdminSettledOrderRow,
  AdminWithdrawalReviewRow,
} from "../types/gatewayStore";
import {
  verifyPayoutAuditRef,
  relevantPartnerRewardLines,
  matchingMerchantsForWithdrawal,
  relevantSettledOrders,
  sumRewardLineYuan,
} from "../utils/withdrawalAudit";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";

type Props = {
  rows: AdminWithdrawalReviewRow[];
  onChange: (next: AdminWithdrawalReviewRow[]) => void;
  principalRows: AdminPartnerPrincipalPerfRow[];
  rewardLines: AdminPartnerRewardLineRow[];
  merchantRows: AdminPartnerMerchantRow[];
  settledOrders: AdminSettledOrderRow[] | undefined;
};

function statusTag(s: AdminWithdrawalReviewRow["status"]) {
  if (s === "pending") return <Tag color="gold">待审核</Tag>;
  if (s === "paid") return <Tag color="green">已打款</Tag>;
  return <Tag color="red">已驳回</Tag>;
}

function kindTag(k: AdminWithdrawalReviewRow["kind"]) {
  return k === "merchant" ? <Tag color="blue">商家</Tag> : <Tag color="purple">合作商</Tag>;
}

export function WithdrawalReviewPanel({
  rows,
  onChange,
  principalRows,
  rewardLines,
  merchantRows,
  settledOrders,
}: Props) {
  const { message } = App.useApp();
  const settledOrderCount = (settledOrders ?? []).filter((o) => o.status === "settled").length;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [kw, setKw] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [active, setActive] = useState<AdminWithdrawalReviewRow | null>(null);
  const [approveForm] = Form.useForm<{
    paidAt: string;
    transferChannel: string;
    transferRefNo: string;
    operatorNote: string;
    lastOperator: string;
    auditRef: string;
    auditAck: boolean;
  }>();
  const [rejectForm] = Form.useForm<{ rejectReason: string; operatorNote: string; lastOperator: string }>();

  const principalNameByPhone = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of principalRows) {
      const ph = String(p.principalPhone ?? "").replace(/\D/g, "");
      if (ph) m.set(ph, p.principalName);
    }
    return m;
  }, [principalRows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      const q = kw.trim().toLowerCase();
      if (q) {
        const blob = [
          r.id,
          r.applicantPhone,
          r.applicantName ?? "",
          r.partnerRootPhone ?? "",
          r.partnerRootName ?? "",
          r.payoutSummary ?? "",
          r.transferRefNo ?? "",
          r.applicantRoleHint ?? "",
          r.payoutAuditRef ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, kindFilter, kw]);

  const openApprove = (r: AdminWithdrawalReviewRow) => {
    setActive(r);
    const defChannel =
      r.payoutChannel === "wechat_wallet"
        ? "微信商家转账 / 零钱"
        : r.payoutChannel === "alipay"
          ? "支付宝转账"
          : "对公转账 / 网银";
    approveForm.setFieldsValue({
      paidAt: r.paidAt || dayjs().format("YYYY-MM-DD"),
      transferChannel: r.transferChannel || defChannel,
      transferRefNo: r.transferRefNo || "",
      operatorNote: "",
      lastOperator: "",
      auditRef: "",
      auditAck: false,
    });
    setApproveOpen(true);
  };

  const openReject = (r: AdminWithdrawalReviewRow) => {
    setActive(r);
    rejectForm.setFieldsValue({ rejectReason: "", operatorNote: "", lastOperator: "" });
    setRejectOpen(true);
  };

  const submitApprove = async () => {
    const v = await approveForm.validateFields();
    if (!active) return;
    if (!v.auditAck) {
      message.error("请先勾选「已核对台账与收款账户」。");
      return;
    }
    const verdict = verifyPayoutAuditRef(v.auditRef, active, rewardLines, merchantRows, settledOrders);
    if (!verdict.ok) {
      message.error(verdict.reason);
      return;
    }
    const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
    onChange(
      rows.map((x) =>
        x.id === active.id
          ? {
              ...x,
              status: "paid" as const,
              resolvedAt: now,
              paidAt: v.paidAt.trim(),
              transferChannel: v.transferChannel.trim(),
              transferRefNo: v.transferRefNo.trim(),
              payoutAuditRef: v.auditRef.trim(),
              operatorNote: v.operatorNote?.trim() || undefined,
              lastOperator: v.lastOperator?.trim() || undefined,
              rejectReason: undefined,
            }
          : x,
      ),
    );
    message.success("已登记为已打款（请同步保存到网关）");
    setApproveOpen(false);
    setActive(null);
  };

  const submitReject = async () => {
    const v = await rejectForm.validateFields();
    if (!active) return;
    const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
    onChange(
      rows.map((x) =>
        x.id === active.id
          ? {
              ...x,
              status: "rejected" as const,
              resolvedAt: now,
              rejectReason: v.rejectReason.trim(),
              operatorNote: v.operatorNote?.trim() || undefined,
              lastOperator: v.lastOperator?.trim() || undefined,
            }
          : x,
      ),
    );
    message.success("已驳回（请同步保存到网关）");
    setRejectOpen(false);
    setActive(null);
  };

  const removePending = (id: string) => {
    void doubleConfirmDelete({
      firstTitle: "删除这条待审提现记录？",
      firstContent: "仅从本台账移除，不修改小程序本地提现单。正式环境请在业务库操作。",
      secondTitle: "再次确认删除",
      secondContent: "请再次确认：误删后需重新录入或从网关重新拉取，是否继续？",
      onDelete: () => onChange(rows.filter((x) => x.id !== id)),
    });
  };

  const auditModalExtras = useMemo(() => {
    if (!active) {
      return {
        lines: [] as AdminPartnerRewardLineRow[],
        merchants: [] as AdminPartnerMerchantRow[],
        orders: [] as AdminSettledOrderRow[],
      };
    }
    const orders = relevantSettledOrders(active, settledOrders);
    if (active.kind === "partner") {
      return {
        lines: relevantPartnerRewardLines(active, rewardLines),
        merchants: [] as AdminPartnerMerchantRow[],
        orders,
      };
    }
    return {
      lines: [] as AdminPartnerRewardLineRow[],
      merchants: matchingMerchantsForWithdrawal(active, merchantRows),
      orders,
    };
  }, [active, rewardLines, merchantRows, settledOrders]);

  return (
    <Card
      size="small"
      title="提现审核与打款登记"
      styles={{ body: { paddingTop: 10 } }}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
        <strong>打款前必须核对真实订单</strong>：请在「平台·渠道与业绩」维护的<strong>已结算订单（settledOrders）</strong>中查找订单号；
        提交的核验字段须与台账中某笔 <Typography.Text code>orderId</Typography.Text> 一致，且该订单收益归属须与申请人一致。
        {settledOrderCount > 0 ? (
          <> 当前网关已配置 {settledOrderCount} 笔已结算订单，将<strong>强制按订单号</strong>校验。</>
        ) : (
          <> 当前未拉取到订单台账时将仅能匹配渠道流水/门店，建议由订单或结算服务写入 <Typography.Text code>admin.partnerChannel.settledOrders</Typography.Text>。</>
        )}
      </Typography.Paragraph>

      <Space wrap style={{ marginBottom: 10 }} size="small">
        <Select
          size="small"
          style={{ width: 120 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "全部状态", value: "all" },
            { label: "待审核", value: "pending" },
            { label: "已打款", value: "paid" },
            { label: "已驳回", value: "rejected" },
          ]}
        />
        <Select
          size="small"
          style={{ width: 120 }}
          value={kindFilter}
          onChange={setKindFilter}
          options={[
            { label: "全部类型", value: "all" },
            { label: "合作商", value: "partner" },
            { label: "商家", value: "merchant" },
          ]}
        />
        <Input
          size="small"
          allowClear
          placeholder="搜索手机、姓名、单号、流水号…"
          style={{ width: 260 }}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
      </Space>

      <Table<AdminWithdrawalReviewRow>
        size="small"
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: true }}
        dataSource={filtered}
        scroll={{ x: 1320 }}
        expandable={{
          expandedRowRender: (r) => (
            <Descriptions bordered size="small" column={2} style={{ margin: 0 }}>
              <Descriptions.Item label="申请人手机" span={1}>
                {r.applicantPhone}
              </Descriptions.Item>
              <Descriptions.Item label="体系主管手机" span={1}>
                {r.partnerRootPhone ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="收款信息" span={2}>
                {r.payoutSummary || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="申请侧快照·累计应得" span={1}>
                {r.walletAuditSnapshot
                  ? `¥${Number(r.walletAuditSnapshot.accruedLifetimeYuan).toFixed(2)}`
                  : "—（无快照，纯后台写入？请警惕）"}
              </Descriptions.Item>
              <Descriptions.Item label="申请侧快照·当时可提现" span={1}>
                {r.walletAuditSnapshot
                  ? `¥${Number(r.walletAuditSnapshot.availableYuanAtApply).toFixed(2)}`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="付款通道(申请侧)" span={1}>
                {r.payPipeline || r.payoutChannel || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="处理时间" span={1}>
                {r.resolvedAt || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="打款日期" span={1}>
                {r.paidAt || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="打款方式(实操)" span={1}>
                {r.transferChannel || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="银行流水/商户单号" span={1}>
                {r.transferRefNo || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="订单/核对凭证" span={1}>
                {r.payoutAuditRef || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="驳回原因" span={1}>
                {r.rejectReason || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="平台备注" span={1}>
                {r.operatorNote || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="操作人" span={1}>
                {r.lastOperator || "—"}
              </Descriptions.Item>
            </Descriptions>
          ),
        }}
        columns={[
          { title: "申请时间", dataIndex: "createdAt", width: 148, ellipsis: true },
          {
            title: "类型",
            dataIndex: "kind",
            width: 72,
            render: (k: AdminWithdrawalReviewRow["kind"]) => kindTag(k),
          },
          {
            title: "身份/归属",
            key: "role_root",
            width: 200,
            ellipsis: true,
            render: (_, r) => (
              <div>
                <Typography.Text style={{ fontSize: 12 }}>{r.applicantRoleHint || "—"}</Typography.Text>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 11 }}>
                  体系：
                  {(r.partnerRootName ||
                    (r.partnerRootPhone
                      ? principalNameByPhone.get(String(r.partnerRootPhone).replace(/\D/g, "")) ||
                        r.partnerRootPhone
                      : "—")) ?? "—"}
                </Typography.Paragraph>
              </div>
            ),
          },
          {
            title: "申请人",
            key: "applicant",
            width: 140,
            ellipsis: true,
            render: (_, r) => (
              <div>
                <Typography.Text style={{ fontSize: 12 }}>{r.applicantName || "—"}</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                  {r.applicantPhone}
                </Typography.Text>
              </div>
            ),
          },
          {
            title: "金额(元)",
            dataIndex: "amountYuan",
            width: 88,
            render: (v: number) => (typeof v === "number" ? v.toFixed(2) : "—"),
          },
          {
            title: "核对",
            key: "audit_hint",
            width: 100,
            render: (_, r) => {
              if (r.status !== "pending") return <Tag style={{ margin: 0 }}>—</Tag>;
              if (!r.walletAuditSnapshot) return <Tag color="red">缺快照</Tag>;
              const myOrders = relevantSettledOrders(r, settledOrders);
              if (settledOrderCount > 0) {
                return myOrders.length > 0 ? <Tag color="green">可对订单</Tag> : <Tag color="orange">无归属订单</Tag>;
              }
              const lines = relevantPartnerRewardLines(r, rewardLines);
              const ms = r.kind === "merchant" ? matchingMerchantsForWithdrawal(r, merchantRows) : [];
              const ok = r.kind === "partner" ? lines.length > 0 : ms.length > 0;
              return ok ? <Tag color="blue">可对账</Tag> : <Tag color="orange">无匹配行</Tag>;
            },
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 80,
            render: (s: AdminWithdrawalReviewRow["status"]) => statusTag(s),
          },
          {
            title: "操作",
            key: "ops",
            width: 168,
            fixed: "right" as const,
            render: (_, r) =>
              r.status === "pending" ? (
                <Space size={4} wrap>
                  <Button type="link" size="small" onClick={() => openApprove(r)}>
                    确认打款
                  </Button>
                  <Button type="link" size="small" danger onClick={() => openReject(r)}>
                    驳回
                  </Button>
                  <Button type="link" size="small" danger onClick={() => removePending(r.id)}>
                    删
                  </Button>
                </Space>
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {r.status === "paid" ? "已结" : "已拒"}
                </Typography.Text>
              ),
          },
        ]}
      />

      <Modal
        title="确认打款（需完成对账）"
        open={approveOpen}
        onCancel={() => setApproveOpen(false)}
        onOk={() => void submitApprove()}
        destroyOnClose
        width={640}
      >
        {active ? (
          <>
            <Typography.Paragraph style={{ fontSize: 13, marginBottom: 10 }}>
              {kindTag(active.kind)} {active.applicantName} {active.applicantPhone} ·{" "}
              <strong>¥{Number(active.amountYuan).toFixed(2)}</strong>
            </Typography.Paragraph>
            {!active.walletAuditSnapshot ? (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 10 }}
                message="该条无申请侧钱包快照"
                description="多为仅在后端台账手工插入。请务必在「平台·渠道与业绩」或订单系统中找到原始依据后再操作，否则存在被盗刷风险。"
              />
            ) : (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 10 }}
                message="申请侧快照（小程序写入时的口径）"
                description={
                  <span>
                    累计应得 ¥{Number(active.walletAuditSnapshot.accruedLifetimeYuan).toFixed(2)} · 当时可提现 ¥
                    {Number(active.walletAuditSnapshot.availableYuanAtApply).toFixed(2)}
                    {active.walletAuditSnapshot.pendingOutYuanAtApply != null
                      ? ` · 当时处理中 ¥${Number(active.walletAuditSnapshot.pendingOutYuanAtApply).toFixed(2)}`
                      : ""}
                  </span>
                }
              />
            )}
            {settledOrderCount > 0 && active && auditModalExtras.orders.length === 0 ? (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 10 }}
                message="未找到与申请人匹配的已结算订单"
                description="网关已有订单台账，但无归属本申请人的结算单。请补订单或驳回，勿强行打款。"
              />
            ) : null}
            {auditModalExtras.orders.length > 0 ? (
              <>
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 8 }}
                  message="请从下列订单中复制 orderId 填入下方核验框"
                  description="须为「已结算」且与当前申请人收益归属一致；单号须完全一致（仅忽略大小写）。"
                />
                <Table<AdminSettledOrderRow>
                  size="small"
                  style={{ marginTop: 4, marginBottom: 10 }}
                  rowKey="orderId"
                  pagination={false}
                  scroll={{ x: 720 }}
                  dataSource={auditModalExtras.orders}
                  columns={[
                    { title: "订单号", dataIndex: "orderId", width: 200, ellipsis: true },
                    { title: "类型", dataIndex: "kind", width: 120, ellipsis: true },
                    { title: "结算时间", dataIndex: "settledAt", width: 148, ellipsis: true },
                    {
                      title: "金额/补贴",
                      key: "amt",
                      width: 96,
                      render: (_, o) =>
                        o.subsidyYuan != null
                          ? `补¥${Number(o.subsidyYuan).toFixed(0)}`
                          : o.amountYuan != null
                            ? `¥${Number(o.amountYuan).toFixed(0)}`
                            : "—",
                    },
                    { title: "备注", dataIndex: "remark", ellipsis: true },
                  ]}
                />
              </>
            ) : null}
            {active.kind === "partner" && auditModalExtras.lines.length > 0 ? (
              <>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  本体系可归集渠道流水（金额合计 ¥{sumRewardLineYuan(auditModalExtras.lines).toFixed(2)}，为流水显示口径非个人实发拆分）：
                </Typography.Text>
                <Table<AdminPartnerRewardLineRow>
                  size="small"
                  style={{ marginTop: 6, marginBottom: 10 }}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 640 }}
                  dataSource={auditModalExtras.lines.slice(0, 12)}
                  columns={[
                    { title: "key", dataIndex: "key", width: 72 },
                    { title: "时间", dataIndex: "time", width: 136, ellipsis: true },
                    { title: "类型", dataIndex: "kind", width: 120, ellipsis: true },
                    { title: "金额", dataIndex: "amountYuan", width: 72, render: (n: number) => Number(n).toFixed(2) },
                    { title: "归因手机", dataIndex: "inviterStaffPhone", width: 100, ellipsis: true },
                    { title: "订单号", dataIndex: "orderId", width: 140, ellipsis: true },
                    { title: "备注", dataIndex: "remark", ellipsis: true },
                  ]}
                />
              </>
            ) : null}
            {active.kind === "merchant" && auditModalExtras.merchants.length > 0 ? (
              <>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  匹配到的门店档案（请与补贴/订单核对）：
                </Typography.Text>
                <Table<AdminPartnerMerchantRow>
                  size="small"
                  style={{ marginTop: 6, marginBottom: 10 }}
                  rowKey="key"
                  pagination={false}
                  dataSource={auditModalExtras.merchants}
                  columns={[
                    { title: "key", dataIndex: "key", width: 56 },
                    { title: "店名", dataIndex: "merchantName", ellipsis: true },
                    { title: "电话", dataIndex: "shopPhone", width: 104 },
                    { title: "演示订单额", dataIndex: "periodOrderYuan", width: 96, render: (n: number) => Number(n).toFixed(0) },
                  ]}
                />
              </>
            ) : null}
            {active.kind === "merchant" && auditModalExtras.merchants.length === 0 ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 10 }}
                message="未在网关门店表中匹配到该申请人电话/店名"
                description="请先在「平台·渠道与业绩」补全门店档案，或驳回该申请。"
              />
            ) : null}
          </>
        ) : null}
        <Form form={approveForm} layout="vertical" size="small">
          <Form.Item
            name="auditRef"
            label={settledOrderCount > 0 ? "订单号（已结算，必填）" : "订单号 / 核对凭证（必填）"}
            rules={[
              { required: true, message: "请填写订单号或核对凭证" },
              { min: 3, message: "至少 3 个字符" },
            ]}
            extra={
              settledOrderCount > 0
                ? "须与上方某条已结算订单的 orderId 一致。若填错或伪造，系统会拦截打款。"
                : "已配置订单台账后将强制校订单号；当前未配置时可匹配渠道流水 key / 门店 key 等。"
            }
          >
            <Input placeholder={settledOrderCount > 0 ? "例如：EV-ORD-20260501-HD001" : "订单号 或 rw6 / m5 等"} />
          </Form.Item>
          <Form.Item
            name="auditAck"
            valuePropName="checked"
            rules={[
              {
                validator: (_, v) =>
                  v ? Promise.resolve() : Promise.reject(new Error("请勾选后再打款")),
              },
            ]}
          >
            <Checkbox>
              本人已核对<strong>真实订单/台账</strong>与收款账户一致，本笔打款对应业务已结算且归属无误
            </Checkbox>
          </Form.Item>
          <Form.Item name="paidAt" label="实际打款日期" rules={[{ required: true, message: "请填写打款日期" }]}>
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="transferChannel"
            label="打款方式（实操）"
            rules={[{ required: true, message: "请填写打款方式" }]}
          >
            <Input placeholder="对公转账 / 微信商家转账 / 支付宝 …" />
          </Form.Item>
          <Form.Item
            name="transferRefNo"
            label="银行流水号 / 商户单号"
            rules={[{ required: true, message: "请填写流水号或单号备查" }]}
          >
            <Input placeholder="备查凭证号" />
          </Form.Item>
          <Form.Item name="lastOperator" label="操作人（财务/姓名）">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="operatorNote" label="备注（内部）">
            <Input.TextArea rows={2} placeholder="如：核对账户名一致、手续费承担方等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="驳回提现"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() => void submitReject()}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" size="small">
          <Form.Item name="rejectReason" label="驳回原因" rules={[{ required: true, message: "请填写原因" }]}>
            <Input.TextArea rows={3} placeholder="向申请人说明原因（将记在台账）" />
          </Form.Item>
          <Form.Item name="lastOperator" label="操作人">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="operatorNote" label="内部备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
