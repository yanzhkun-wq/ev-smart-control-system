import { Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import { useEffect } from "react";
import type {
  AdminChannelEndUserRow,
  AdminPartnerMerchantRow,
  AdminPartnerPrincipalPerfRow,
  AdminPartnerRewardLineRow,
  AdminPartnerStaffPerfRow,
} from "../types/gatewayStore";
import styles from "./partnerChannelDetailModal.module.css";

const PARTNER_TIER_OPTS = ["V1", "V2", "V3", "V4", "V5"].map((v) => ({ label: v, value: v }));

export type ChannelDetailMode = "principal" | "staff" | "merchant" | "user" | "reward";

type RecordUnion =
  | AdminPartnerPrincipalPerfRow
  | AdminPartnerStaffPerfRow
  | AdminPartnerMerchantRow
  | AdminChannelEndUserRow
  | AdminPartnerRewardLineRow;

type Props = {
  open: boolean;
  mode: ChannelDetailMode | null;
  record: RecordUnion | null;
  rootPhoneOptions: { label: string; value: string }[];
  onClose: () => void;
  onSave: (mode: ChannelDetailMode, next: RecordUnion) => void;
};

export function PartnerChannelDetailModal({ open, mode, record, rootPhoneOptions, onClose, onSave }: Props) {
  const [form] = Form.useForm<Record<string, unknown>>();

  useEffect(() => {
    if (!open || !record || !mode) return;
    form.setFieldsValue({ ...record });
  }, [open, record, mode, form]);

  const title =
    mode === "principal"
      ? "主管档案"
      : mode === "staff"
        ? "员工档案"
        : mode === "merchant"
          ? "商家档案"
          : mode === "user"
            ? "用户档案"
            : mode === "reward"
              ? "流水明细"
              : "档案";

  const submit = async () => {
    if (!mode || !record) return;
    const v = await form.validateFields();
    if (mode === "principal") {
      const cur = record as AdminPartnerPrincipalPerfRow;
      const next: AdminPartnerPrincipalPerfRow = {
        ...cur,
        principalPhone: String(v.principalPhone ?? "").trim(),
        principalName: String(v.principalName ?? "").trim(),
        tierLabel: v.tierLabel != null && String(v.tierLabel).trim() ? String(v.tierLabel).trim() : undefined,
        backupPhone: v.backupPhone != null ? String(v.backupPhone).trim() : undefined,
        adminNote: v.adminNote != null ? String(v.adminNote).trim() : undefined,
        staffCount: Number(v.staffCount) || 0,
        periodGrossYuan: Number(v.periodGrossYuan) || 0,
        principalRetainYuan: Number(v.principalRetainYuan) || 0,
        teamLineRewardYuan: Number(v.teamLineRewardYuan) || 0,
        newUsers: Number(v.newUsers) || 0,
        newMerchants: Number(v.newMerchants) || 0,
        settleCount: Number(v.settleCount) || 0,
      };
      onSave("principal", next);
    } else if (mode === "staff") {
      const cur = record as AdminPartnerStaffPerfRow;
      const next: AdminPartnerStaffPerfRow = {
        ...cur,
        rootPartnerPhone: String(v.rootPartnerPhone ?? "").trim(),
        rootPartnerName: String(v.rootPartnerName ?? "").trim(),
        staffPhone: String(v.staffPhone ?? "").trim(),
        staffName: String(v.staffName ?? "").trim(),
        tier: (v.tier === "L2" ? "L2" : "L1") as "L1" | "L2",
        commissionPct: Number(v.commissionPct) || 0,
        targetUserCount: Number(v.targetUserCount) || 0,
        periodRewardYuan: Number(v.periodRewardYuan) || 0,
        inviteUsers: Number(v.inviteUsers) || 0,
        inviteMerchants: Number(v.inviteMerchants) || 0,
        parentL1Hint: v.parentL1Hint != null ? String(v.parentL1Hint).trim() : undefined,
        backupPhone: v.backupPhone != null ? String(v.backupPhone).trim() : undefined,
        email: v.email != null ? String(v.email).trim() : undefined,
        workStatus: v.workStatus != null ? String(v.workStatus).trim() : undefined,
        adminNote: v.adminNote != null ? String(v.adminNote).trim() : undefined,
      };
      onSave("staff", next);
    } else if (mode === "merchant") {
      const cur = record as AdminPartnerMerchantRow;
      const next: AdminPartnerMerchantRow = {
        ...cur,
        rootPartnerPhone: String(v.rootPartnerPhone ?? "").trim(),
        rootPartnerName: v.rootPartnerName != null ? String(v.rootPartnerName).trim() : undefined,
        merchantName: String(v.merchantName ?? "").trim(),
        shopPhone: v.shopPhone != null ? String(v.shopPhone).trim() : undefined,
        address: v.address != null ? String(v.address).trim() : undefined,
        bossName: v.bossName != null ? String(v.bossName).trim() : undefined,
        city: v.city != null ? String(v.city).trim() : undefined,
        inviterStaffPhone: v.inviterStaffPhone != null ? String(v.inviterStaffPhone).trim() : undefined,
        inviterStaffName: v.inviterStaffName != null ? String(v.inviterStaffName).trim() : undefined,
        status: v.status != null ? String(v.status).trim() : undefined,
        bindAt: v.bindAt != null ? String(v.bindAt).trim() : undefined,
        periodOrderYuan: Number(v.periodOrderYuan) || 0,
        remark: v.remark != null ? String(v.remark).trim() : undefined,
        adminNote: v.adminNote != null ? String(v.adminNote).trim() : undefined,
      };
      onSave("merchant", next);
    } else if (mode === "user") {
      const cur = record as AdminChannelEndUserRow;
      const next: AdminChannelEndUserRow = {
        ...cur,
        userPhone: String(v.userPhone ?? "").replace(/\D/g, "").slice(0, 11),
        displayName: v.displayName != null ? String(v.displayName).trim() : undefined,
        inviterPhone: v.inviterPhone != null ? String(v.inviterPhone).replace(/\D/g, "").slice(0, 11) : undefined,
        inviterName: v.inviterName != null ? String(v.inviterName).trim() : undefined,
        rootPartnerPhone:
          v.rootPartnerPhone != null && String(v.rootPartnerPhone).trim()
            ? String(v.rootPartnerPhone).replace(/\D/g, "").slice(0, 11)
            : undefined,
        vipTierLabel: v.vipTierLabel != null ? String(v.vipTierLabel).trim() : undefined,
        registeredAt: v.registeredAt != null ? String(v.registeredAt).trim() : undefined,
        remark: v.remark != null ? String(v.remark).trim() : undefined,
      };
      if (next.userPhone.length !== 11) {
        form.setFields([{ name: "userPhone", errors: ["须为 11 位手机号"] }]);
        return;
      }
      onSave("user", next);
    } else if (mode === "reward") {
      const cur = record as AdminPartnerRewardLineRow;
      const next: AdminPartnerRewardLineRow = {
        ...cur,
        time: String(v.time ?? "").trim(),
        rootPartnerPhone: String(v.rootPartnerPhone ?? "").trim(),
        kind: String(v.kind ?? "").trim(),
        amountYuan: Number(v.amountYuan) || 0,
        inviterStaffPhone: v.inviterStaffPhone != null ? String(v.inviterStaffPhone).trim() : undefined,
        inviterStaffName: v.inviterStaffName != null ? String(v.inviterStaffName).trim() : undefined,
        remark: v.remark != null ? String(v.remark).trim() : undefined,
      };
      onSave("reward", next);
    }
    onClose();
  };

  const principalForm = record && mode === "principal" && (
    <>
      <p className={styles.hint}>主管展示名、档位、业绩数字与「业绩查询」列表一致。</p>
      <Row gutter={[12, 0]}>
        <Col xs={24} md={12}>
          <Form.Item name="principalPhone" label="主管手机" rules={[{ required: true }]}>
            <Input size="small" placeholder="11 位" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="principalName" label="名称" rules={[{ required: true }]}>
            <Input size="small" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="tierLabel" label="档位">
            <Select size="small" allowClear options={PARTNER_TIER_OPTS} placeholder="V1~V5" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="backupPhone" label="备用电话">
            <Input size="small" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="staffCount" label="员工数">
            <InputNumber size="small" min={0} className="w100" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="periodGrossYuan" label="区间毛利">
            <InputNumber size="small" min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="principalRetainYuan" label="主管留存">
            <InputNumber size="small" min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="teamLineRewardYuan" label="团队线">
            <InputNumber size="small" min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="newUsers" label="新用户">
            <InputNumber size="small" min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="newMerchants" label="新门店">
            <InputNumber size="small" min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="settleCount" label="结算笔数">
            <InputNumber size="small" min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="adminNote" label="内部备注">
            <Input.TextArea size="small" rows={2} placeholder="不对 C 端展示" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  const staffForm = record && mode === "staff" && (
    <Row gutter={[12, 0]}>
      <Col xs={24} md={12}>
        <Form.Item name="rootPartnerPhone" label="所属主管手机" rules={[{ required: true }]}>
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="rootPartnerName" label="体系名称">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="staffPhone" label="员工手机" rules={[{ required: true }]}>
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="staffName" label="姓名" rules={[{ required: true }]}>
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="tier" label="层级">
          <Select
            size="small"
            options={[
              { label: "一级 L1", value: "L1" },
              { label: "二级 L2", value: "L2" },
            ]}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="parentL1Hint" label="挂靠说明">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="commissionPct" label="分佣%">
          <InputNumber size="small" min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="targetUserCount" label="目标用户">
          <InputNumber size="small" min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="periodRewardYuan" label="区间业绩">
          <InputNumber size="small" min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="inviteUsers" label="邀用户">
          <InputNumber size="small" min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="inviteMerchants" label="邀门店">
          <InputNumber size="small" min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="workStatus" label="在职">
          <Select
            size="small"
            allowClear
            options={[
              { label: "在职", value: "在职" },
              { label: "停用", value: "停用" },
            ]}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="backupPhone" label="备用电话">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="email" label="邮箱">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="adminNote" label="内部备注">
          <Input.TextArea size="small" rows={2} />
        </Form.Item>
      </Col>
    </Row>
  );

  const merchantForm = record && mode === "merchant" && (
    <Row gutter={[12, 0]}>
      <Col xs={24} md={12}>
        <Form.Item name="rootPartnerPhone" label="主管手机" rules={[{ required: true }]}>
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="rootPartnerName" label="体系名称">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="merchantName" label="门店名称" rules={[{ required: true }]}>
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="bossName" label="店主">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="shopPhone" label="门店电话">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="city" label="城市">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="address" label="地址">
          <Input.TextArea size="small" rows={2} />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="inviterStaffPhone" label="邀请员工手机">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="inviterStaffName" label="邀请员工">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="status" label="状态">
          <Input size="small" placeholder="合作中" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="bindAt" label="建档">
          <Input size="small" placeholder="YYYY-MM-DD" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="periodOrderYuan" label="区间订单">
          <InputNumber size="small" min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="remark" label="备注">
          <Input.TextArea size="small" rows={2} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="adminNote" label="内部备注">
          <Input.TextArea size="small" rows={2} />
        </Form.Item>
      </Col>
    </Row>
  );

  const userForm = record && mode === "user" && (
    <Row gutter={[12, 0]}>
      <Col xs={24} md={12}>
        <Form.Item name="userPhone" label="用户手机" rules={[{ required: true }]}>
          <Input size="small" placeholder="11 位" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="displayName" label="显示名">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="rootPartnerPhone" label="归属主管">
          <Select size="small" allowClear showSearch optionFilterProp="label" options={rootPhoneOptions} />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="inviterPhone" label="邀请人手机">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="inviterName" label="邀请人">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="vipTierLabel" label="VIP">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="registeredAt" label="建档日期">
          <Input size="small" placeholder="YYYY-MM-DD" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="remark" label="备注">
          <Input.TextArea size="small" rows={2} />
        </Form.Item>
      </Col>
    </Row>
  );

  const rewardForm = record && mode === "reward" && (
    <Row gutter={[12, 0]}>
      <Col xs={24} md={14}>
        <Form.Item name="time" label="时间" rules={[{ required: true }]}>
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={10}>
        <Form.Item name="amountYuan" label="金额(元)" rules={[{ required: true }]}>
          <InputNumber size="small" min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="rootPartnerPhone" label="归属主管手机" rules={[{ required: true }]}>
          <Select size="small" showSearch allowClear options={rootPhoneOptions} optionFilterProp="label" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="kind" label="类型" rules={[{ required: true }]}>
          <Input size="small" placeholder="计提 / 补贴 / 其他" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="inviterStaffPhone" label="归因员工手机">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item name="inviterStaffName" label="归因员工">
          <Input size="small" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="remark" label="备注">
          <Input.TextArea size="small" rows={2} />
        </Form.Item>
      </Col>
    </Row>
  );

  return (
    <Modal
      title={title}
      open={open && !!record && !!mode}
      onCancel={onClose}
      onOk={() => void submit()}
      width={640}
      centered
      destroyOnClose
      okText="保存"
      cancelText="取消"
      styles={{ body: { padding: "12px 16px 8px" } }}
    >
      <div className={styles.body}>
        <Form form={form} layout="vertical" size="small" preserve={false} className={styles.form}>
          {principalForm}
          {staffForm}
          {merchantForm}
          {userForm}
          {rewardForm}
        </Form>
      </div>
    </Modal>
  );
}
