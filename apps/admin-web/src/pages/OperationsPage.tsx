import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import {
  DEFAULT_DISTRIBUTION,
  DEFAULT_VIP_BENEFITS,
  normalizeDistributionInput,
  notifyOperationsDraftSaved,
  OPS_DRAFT_LS_KEY,
  readOperationsDraft,
  writeOperationsDraft,
  type OperationsDraft,
} from "../constants/operationsDefaults";
import { defaultWithdrawalReviewSeed } from "../constants/withdrawalReviewDefaults";
import {
  catalogEntryById,
  catalogSelectOptions,
  normalizeVipBenefitsAgainstCatalog,
} from "../constants/vipDeviceFeatureCatalog";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";
import { WithdrawalReviewPanel } from "./WithdrawalReviewPanel";
import { MerchantApplyReviewPanel } from "./MerchantApplyReviewPanel";
import type {
  AdminBranding,
  AdminCommerceConfig,
  AdminMerchantApplyRow,
  AdminWithdrawalReviewRow,
  StoreShape,
  VipBenefitRow,
} from "../types/gatewayStore";

function uid() {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function OperationsPage() {
  const { message } = App.useApp();
  const { store, saveStore, connected, error } = useAdminGateway();

  const [brandForm] = Form.useForm<AdminBranding>();
  const [vipForm] = Form.useForm<AdminCommerceConfig["vip"]>();
  const [distForm] = Form.useForm<AdminCommerceConfig["distribution"]>();

  const admin = store?.admin;
  const [benefits, setBenefits] = useState<VipBenefitRow[]>(() =>
    normalizeVipBenefitsAgainstCatalog(DEFAULT_VIP_BENEFITS),
  );
  const [pickId, setPickId] = useState<string | undefined>(undefined);
  const [withdrawalRows, setWithdrawalRows] = useState<AdminWithdrawalReviewRow[]>(() =>
    defaultWithdrawalReviewSeed(),
  );
  const [merchantApplyRows, setMerchantApplyRows] = useState<AdminMerchantApplyRow[]>([]);

  const distPct = Form.useWatch("walkInMerchantSubsidyPct", distForm);
  const distBase = Form.useWatch("walkInMerchantSubsidyBaseYuan", distForm);
  const walkInPreviewYuan = useMemo(() => {
    const p = Number(distPct);
    const b = Number(distBase);
    if (!Number.isFinite(p) || !Number.isFinite(b)) return null;
    return Math.round(b * (p / 100) * 100) / 100;
  }, [distPct, distBase]);

  const addOptions = useMemo(
    () => catalogSelectOptions(new Set(benefits.map((b) => b.key))),
    [benefits],
  );

  useEffect(() => {
    if (!store) {
      const draft = readOperationsDraft();
      if (draft?.branding && draft.vip && draft.distribution) {
        brandForm.setFieldsValue(draft.branding);
        vipForm.setFieldsValue({
          payYearYuan: draft.vip.payYearYuan,
          inviteOrderRebateRate: draft.vip.inviteOrderRebateRate,
          joinThresh1Y: draft.vip.joinThresh1Y,
          joinThresh3Y: draft.vip.joinThresh3Y,
          joinCountPerFreeDevice: draft.vip.joinCountPerFreeDevice,
        });
        setBenefits(normalizeVipBenefitsAgainstCatalog(draft.vip.benefits ?? DEFAULT_VIP_BENEFITS));
        distForm.setFieldsValue(normalizeDistributionInput(draft.distribution));
        if (draft.withdrawalReviewQueue && draft.withdrawalReviewQueue.length > 0) {
          setWithdrawalRows(draft.withdrawalReviewQueue.map((r) => ({ ...r })));
        } else {
          setWithdrawalRows(defaultWithdrawalReviewSeed());
        }
        setMerchantApplyRows(
          draft.merchantApplyReviewQueue && draft.merchantApplyReviewQueue.length > 0
            ? draft.merchantApplyReviewQueue.map((r) => ({ ...r }))
            : [],
        );
        return;
      }
      brandForm.setFieldsValue({ title: "电动车智控", subtitle: "WZ808 · 管理端" });
      vipForm.setFieldsValue({
        payYearYuan: 36.5,
        inviteOrderRebateRate: 0.2,
        joinThresh1Y: 8,
        joinThresh3Y: 10,
        joinCountPerFreeDevice: 5,
      });
      setBenefits(normalizeVipBenefitsAgainstCatalog(DEFAULT_VIP_BENEFITS));
      distForm.setFieldsValue({ ...DEFAULT_DISTRIBUTION });
      setWithdrawalRows(defaultWithdrawalReviewSeed());
      setMerchantApplyRows([]);
      return;
    }

    const b = admin?.branding;
    brandForm.setFieldsValue({
      title: b?.title ?? "电动车智控",
      subtitle: b?.subtitle ?? "WZ808 · 管理端",
    });
    const c = admin?.commerce;
    if (c?.vip) {
      vipForm.setFieldsValue({
        payYearYuan: c.vip.payYearYuan,
        inviteOrderRebateRate: c.vip.inviteOrderRebateRate,
        joinThresh1Y: c.vip.joinThresh1Y,
        joinThresh3Y: c.vip.joinThresh3Y,
        joinCountPerFreeDevice: c.vip.joinCountPerFreeDevice,
      });
      setBenefits(
        normalizeVipBenefitsAgainstCatalog(c.vip.benefits?.length ? c.vip.benefits : DEFAULT_VIP_BENEFITS),
      );
    } else {
      vipForm.setFieldsValue({
        payYearYuan: 36.5,
        inviteOrderRebateRate: 0.2,
        joinThresh1Y: 8,
        joinThresh3Y: 10,
        joinCountPerFreeDevice: 5,
      });
      setBenefits(normalizeVipBenefitsAgainstCatalog(DEFAULT_VIP_BENEFITS));
    }
    if (c?.distribution) {
      distForm.setFieldsValue(normalizeDistributionInput(c.distribution));
    } else {
      distForm.setFieldsValue({ ...DEFAULT_DISTRIBUTION });
    }
    const wq = admin?.withdrawalReviewQueue;
    if (Array.isArray(wq)) {
      setWithdrawalRows(wq.map((r) => ({ ...r })));
    } else {
      setWithdrawalRows(defaultWithdrawalReviewSeed());
    }
    const ma = admin?.merchantApplyReviewQueue;
    setMerchantApplyRows(Array.isArray(ma) ? ma.map((r) => ({ ...r })) : []);
  }, [store, admin, brandForm, vipForm, distForm]);

  const addFromCatalog = () => {
    if (!pickId) {
      message.warning("请先从列表中选择一项能力");
      return;
    }
    const c = catalogEntryById(pickId);
    if (!c) return;
    if (benefits.some((b) => b.key === c.id)) {
      message.info("该项已在列表中");
      return;
    }
    setBenefits((prev) => [...prev, { key: c.id, title: c.title, detail: c.detail }]);
    setPickId(undefined);
  };

  const saveAll = async () => {
    try {
      const branding = await brandForm.validateFields();
      const vipNums = await vipForm.validateFields();
      const dist = await distForm.validateFields();
      const merged = normalizeVipBenefitsAgainstCatalog(benefits);
      const benefitsNorm = merged.map((b) => ({
        key: b.key || uid(),
        title: b.title?.trim() || b.key,
        detail: b.detail ?? "",
      }));

      if (!connected || !store) {
        const draft: OperationsDraft = {
          branding,
          vip: {
            payYearYuan: Number(vipNums.payYearYuan),
            inviteOrderRebateRate: Number(vipNums.inviteOrderRebateRate),
            joinThresh1Y: Number(vipNums.joinThresh1Y),
            joinThresh3Y: Number(vipNums.joinThresh3Y),
            joinCountPerFreeDevice: Number(vipNums.joinCountPerFreeDevice),
            benefits: benefitsNorm,
          },
          distribution: normalizeDistributionInput({
            ...dist,
            partnerMerchantRevenueSharePct: Number(dist.partnerMerchantRevenueSharePct),
            partnerInviteReferralRatePct: Number(dist.partnerInviteReferralRatePct),
            partnerMinWithdrawYuan: Number(dist.partnerMinWithdrawYuan),
            merchantMinWithdrawYuan: Number(dist.merchantMinWithdrawYuan),
            walkInMerchantSubsidyPct: Number(dist.walkInMerchantSubsidyPct),
            walkInMerchantSubsidyBaseYuan: Number(dist.walkInMerchantSubsidyBaseYuan),
            demoPartnerAgencyFeeYuan: Number(dist.demoPartnerAgencyFeeYuan),
            remark: dist.remark,
          }),
          withdrawalReviewQueue: withdrawalRows.map((r) => ({ ...r })),
          merchantApplyReviewQueue: merchantApplyRows.map((r) => ({ ...r })),
        };
        writeOperationsDraft(draft);
        notifyOperationsDraftSaved();
        message.success(
          "已保存到本浏览器。请启动设备网关并在「系统设置」填对地址后再打开本页，点「同步到网关」写入服务器。",
        );
        return;
      }

      const next: StoreShape = JSON.parse(JSON.stringify(store));
      if (!next.admin) next.admin = {};
      const prevC = next.admin.commerce;
      next.admin.branding = branding;
      next.admin.commerce = {
        vip: {
          payYearYuan: Number(vipNums.payYearYuan),
          inviteOrderRebateRate: Number(vipNums.inviteOrderRebateRate),
          joinThresh1Y: Number(vipNums.joinThresh1Y),
          joinThresh3Y: Number(vipNums.joinThresh3Y),
          joinCountPerFreeDevice: Number(vipNums.joinCountPerFreeDevice),
          benefits: benefitsNorm,
        },
        distribution: normalizeDistributionInput({
          ...dist,
          partnerMerchantRevenueSharePct: Number(dist.partnerMerchantRevenueSharePct),
          partnerInviteReferralRatePct: Number(dist.partnerInviteReferralRatePct),
          partnerMinWithdrawYuan: Number(dist.partnerMinWithdrawYuan),
          merchantMinWithdrawYuan: Number(dist.merchantMinWithdrawYuan),
          walkInMerchantSubsidyPct: Number(dist.walkInMerchantSubsidyPct),
          walkInMerchantSubsidyBaseYuan: Number(dist.walkInMerchantSubsidyBaseYuan),
          demoPartnerAgencyFeeYuan: Number(dist.demoPartnerAgencyFeeYuan),
          remark: dist.remark ?? prevC?.distribution?.remark,
        }),
      };
      next.admin.withdrawalReviewQueue = withdrawalRows.map((r) => ({ ...r }));
      next.admin.merchantApplyReviewQueue = merchantApplyRows.map((r) => ({ ...r }));
      await saveStore(next);
      localStorage.removeItem(OPS_DRAFT_LS_KEY);
      message.success("已保存到网关（含 VIP、分佣、提现与商户入驻审核台账）。刷新页面后生效。");
    } catch (e) {
      message.error(String(e));
    }
  };

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
        运营与分销
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
        品牌、VIP、分佣、<strong>商户入驻</strong>与<strong>提现审核</strong>在此维护；落库含{" "}
        <Typography.Text code>commerce</Typography.Text>、
        <Typography.Text code>admin.merchantApplyReviewQueue</Typography.Text>、
        <Typography.Text code>admin.withdrawalReviewQueue</Typography.Text>。
        未连接网关时先存本机草稿；小程序需对接 <Typography.Text code>GET /api/store</Typography.Text> 后才会跟随后台数字。
      </Typography.Paragraph>
      {!connected && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="当前未连接设备网关"
          description={
            <span>
              请先在本机启动 <Typography.Text code>services/device-gateway</Typography.Text>（默认 HTTP{" "}
              <Typography.Text code>7612</Typography.Text>），再到「系统设置」确认网关地址。
              {error ? ` 最近一次错误：${error.slice(0, 200)}` : ""}
            </span>
          }
        />
      )}

      <Tabs
        size="small"
        defaultActiveKey="dist"
        items={[
          {
            key: "dist",
            label: "分佣与上门补贴",
            children: (
              <Card size="small" styles={{ body: { paddingTop: 12 } }}>
                <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
                  上门单补贴按「结算基数 × 补贴比例」计算，比例字段为百分比（如 15 表示 15%，不是 1500）。默认基数 800 元、15%
                  时，每单补贴 120 元，与旧版定额配置效果一致。
                </Typography.Paragraph>
                <Form form={distForm} layout="vertical" size="small">
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="partnerMerchantRevenueSharePct" label="合作商计提（商家收款 %）">
                        <InputNumber min={0} max={100} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="partnerInviteReferralRatePct" label="邀请合作商 · 代理费分成（%）">
                        <InputNumber min={0} max={100} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="demoPartnerAgencyFeeYuan" label="演示 · 合作商开通代理费（元）">
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="partnerMinWithdrawYuan" label="合作商提现下限（元）">
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="merchantMinWithdrawYuan" label="商家提现下限（元）">
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        name="walkInMerchantSubsidyPct"
                        label="上门单 · 平台补贴商家（%）"
                        tooltip="占结算基数的百分比，例如填 15 表示 15%"
                      >
                        <InputNumber min={0} max={100} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        name="walkInMerchantSubsidyBaseYuan"
                        label="上门单 · 补贴结算基数（元/单）"
                        tooltip="演示期无订单实付录入时用此基数；上线可对齐单笔成交价"
                      >
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                        每单补贴预览：
                        {walkInPreviewYuan != null
                          ? ` 基数 × 比例 = ¥${walkInPreviewYuan.toFixed(2)} / 单`
                          : " 请填写基数与比例"}
                      </Typography.Text>
                    </Col>
                  </Row>
                  <Form.Item name="remark" label="备注（内部）">
                    <Input.TextArea rows={1} placeholder="可选" />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: "merchantApply",
            label: "商户入驻审核",
            children: (
              <MerchantApplyReviewPanel rows={merchantApplyRows} onChange={setMerchantApplyRows} />
            ),
          },
          {
            key: "withdraw",
            label: "提现审核",
            children: (
              <WithdrawalReviewPanel
                rows={withdrawalRows}
                onChange={setWithdrawalRows}
                principalRows={admin?.partnerChannel?.principals ?? []}
                rewardLines={admin?.partnerChannel?.rewardLines ?? []}
                merchantRows={admin?.partnerChannel?.merchants ?? []}
                settledOrders={admin?.partnerChannel?.settledOrders}
              />
            ),
          },
          {
            key: "vip",
            label: "VIP 规则与权益",
            children: (
              <Card size="small" styles={{ body: { paddingTop: 12 } }}>
                <Form form={vipForm} layout="vertical" size="small">
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="payYearYuan" label="年费（元）">
                        <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="inviteOrderRebateRate" label="好友订单回馈金比例（0~1）">
                        <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="joinThresh1Y" label="邀请满几人 · 1 年 VIP">
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="joinThresh3Y" label="邀请满几人 · 3 年 VIP">
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="joinCountPerFreeDevice" label="每邀请几人 · 主机免单名额 +1">
                        <InputNumber min={1} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
                <Typography.Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  VIP 对外说明（从能力目录勾选）
                </Typography.Text>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
                  与 808 / 硬件能力说明对齐；历史自定义条目标「非目录」可删。
                </Typography.Paragraph>
                <Space wrap style={{ marginBottom: 8 }} className="vip-benefit-picker">
                  <Select
                    showSearch
                    allowClear
                    placeholder="选择能力条目…"
                    style={{ minWidth: 240, maxWidth: 400 }}
                    options={addOptions}
                    value={pickId}
                    onChange={(v) => setPickId(v)}
                    optionFilterProp="label"
                    size="small"
                  />
                  <Button type="primary" size="small" onClick={addFromCatalog} disabled={!pickId}>
                    加入列表
                  </Button>
                </Space>
                <Table<VipBenefitRow>
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.key}
                  dataSource={benefits}
                  columns={[
                    {
                      title: "功能名称",
                      dataIndex: "title",
                      width: "22%",
                      render: (_, r) => (
                        <Space size={6} wrap>
                          {!catalogEntryById(r.key) ? <Tag color="orange">非目录</Tag> : null}
                          <Typography.Text style={{ fontSize: 12 }}>{r.title}</Typography.Text>
                        </Space>
                      ),
                    },
                    {
                      title: "对外说明",
                      dataIndex: "detail",
                      render: (_, r) => (
                        <Typography.Paragraph style={{ marginBottom: 0, fontSize: 12 }} type="secondary">
                          {r.detail}
                        </Typography.Paragraph>
                      ),
                    },
                    {
                      title: "key",
                      dataIndex: "key",
                      width: 140,
                      responsive: ["lg"],
                      render: (k: string) => (
                        <Typography.Text code style={{ fontSize: 11 }}>
                          {k}
                        </Typography.Text>
                      ),
                    },
                    {
                      title: "",
                      width: 56,
                      render: (_, r) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            void doubleConfirmDelete({
                              firstTitle: `删除权益「${r.title}」？`,
                              firstContent: "删除后需保存到网关才会持久化；未保存前可刷新或撤销本页未提交修改。",
                              onDelete: () => setBenefits((p) => p.filter((x) => x.key !== r.key)),
                            })
                          }
                        >
                          删除
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: "brand",
            label: "侧栏品牌",
            children: (
              <Card size="small" styles={{ body: { paddingTop: 12 } }}>
                <Form form={brandForm} layout="vertical" size="small">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="title" label="主标题" rules={[{ required: true }]}>
                        <Input placeholder="例如：电动车智控" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="subtitle" label="副标题">
                        <Input placeholder="例如：WZ808 · 管理端" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            ),
          },
        ]}
      />

      <Button type="primary" style={{ marginTop: 14 }} onClick={() => void saveAll()}>
        {connected && store ? "保存并同步到网关" : "保存到本浏览器（未连网关）"}
      </Button>
    </div>
  );
}
