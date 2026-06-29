import { App, Button, Card, Form, Input, Modal, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { AdminMerchantApplyRow, AdminMerchantApplyStatus } from "../types/gatewayStore";

type Props = {
  rows: AdminMerchantApplyRow[];
  onChange: (next: AdminMerchantApplyRow[]) => void;
};

function statusTag(s: AdminMerchantApplyStatus) {
  if (s === "pending_partner") return <Tag color="gold">待合作商</Tag>;
  if (s === "pending_platform") return <Tag color="blue">待平台终审</Tag>;
  if (s === "approved") return <Tag color="green">已通过</Tag>;
  if (s === "partner_rejected") return <Tag color="red">合作商驳回</Tag>;
  return <Tag color="red">平台驳回</Tag>;
}

export function MerchantApplyReviewPanel({ rows, onChange }: Props) {
  const { message } = App.useApp();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kw, setKw] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [active, setActive] = useState<AdminMerchantApplyRow | null>(null);
  const [approveForm] = Form.useForm<{ platformReviewer: string }>();
  const [rejectForm] = Form.useForm<{ platformRejectReason: string; platformReviewer: string }>();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const q = kw.trim().toLowerCase();
      if (q) {
        const d = r.shopDraft ?? {};
        const blob = [
          r.id,
          r.merchantPhone,
          r.partnerRootPhone,
          r.inviterStaffPhone,
          d.shopName ?? "",
          d.addressFull ?? "",
          d.bossName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, kw]);

  const applyPlatform = (
    r: AdminMerchantApplyRow,
    approved: boolean,
    extras: Partial<AdminMerchantApplyRow>,
  ) => {
    const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
    const next = rows.map((x) =>
      x.id === r.id
        ? {
            ...x,
            ...extras,
            status: approved ? ("approved" as const) : ("platform_rejected" as const),
            platformReviewedAt: now,
          }
        : x,
    );
    onChange(next);
  };

  const openApprove = (r: AdminMerchantApplyRow) => {
    setActive(r);
    approveForm.setFieldsValue({ platformReviewer: "平台运营" });
    setApproveOpen(true);
  };

  const openReject = (r: AdminMerchantApplyRow) => {
    setActive(r);
    rejectForm.setFieldsValue({ platformRejectReason: "", platformReviewer: "平台运营" });
    setRejectOpen(true);
  };

  return (
    <Card
      size="small"
      title="商户入驻审核"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          合作商在小程序通过后进入「待平台终审」；保存到网关后车主端同步即可开通商家身份。
        </Typography.Text>
      }
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">状态</Typography.Text>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: 120 }}
        >
          <option value="all">全部</option>
          <option value="pending_partner">待合作商</option>
          <option value="pending_platform">待平台终审</option>
          <option value="approved">已通过</option>
          <option value="partner_rejected">合作商驳回</option>
          <option value="platform_rejected">平台驳回</option>
        </select>
        <Input
          placeholder="搜索门店/手机/体系"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
      </Space>

      <Table<AdminMerchantApplyRow>
        size="small"
        rowKey="id"
        pagination={{ pageSize: 8 }}
        dataSource={filtered}
        columns={[
          {
            title: "状态",
            width: 118,
            render: (_, r) => statusTag(r.status),
          },
          {
            title: "门店",
            render: (_, r) => r.shopDraft?.shopName || "—",
          },
          {
            title: "店主手机",
            width: 118,
            dataIndex: "merchantPhone",
          },
          {
            title: "合作商主管",
            width: 118,
            dataIndex: "partnerRootPhone",
          },
          {
            title: "邀请员工",
            width: 118,
            dataIndex: "inviterStaffPhone",
          },
          {
            title: "提交时间",
            width: 156,
            dataIndex: "createdAt",
          },
          {
            title: "操作",
            width: 200,
            render: (_, r) =>
              r.status === "pending_platform" ? (
                <Space>
                  <Button type="primary" size="small" onClick={() => openApprove(r)}>
                    平台通过
                  </Button>
                  <Button danger size="small" onClick={() => openReject(r)}>
                    驳回
                  </Button>
                </Space>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
        ]}
      />

      <Modal
        title="平台终审通过"
        open={approveOpen}
        onCancel={() => setApproveOpen(false)}
        onOk={async () => {
          const v = await approveForm.validateFields();
          if (!active) return;
          applyPlatform(active, true, { platformReviewer: v.platformReviewer.trim() });
          setApproveOpen(false);
          message.success("已标记为通过（请同步保存到网关）");
        }}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          确认后小程序端拉取网关状态将自动为店主开通商家身份并写入门店档案。
        </Typography.Paragraph>
        <Form form={approveForm} layout="vertical">
          <Form.Item name="platformReviewer" label="终审人 / 备注名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="平台驳回"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={async () => {
          const v = await rejectForm.validateFields();
          if (!active) return;
          applyPlatform(active, false, {
            platformReviewer: v.platformReviewer.trim(),
            platformRejectReason: v.platformRejectReason.trim(),
          });
          setRejectOpen(false);
          message.success("已驳回（请同步保存到网关）");
        }}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="platformReviewer" label="操作人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="platformRejectReason" label="驳回原因" rules={[{ required: true, message: "请填写原因" }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
