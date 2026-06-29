import { DatePicker, Descriptions, Input, Select, Tabs, Table, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type {
  AdminChannelEndUserRow,
  AdminPartnerChannelStore,
  AdminPartnerMerchantRow,
  AdminPartnerPrincipalPerfRow,
  AdminPartnerRewardLineRow,
  AdminPartnerStaffPerfRow,
} from "../types/gatewayStore";
import { inDateRange, matchKeyword, norm, parsePartnerChannelTime } from "../utils/partnerChannelQuery";
import styles from "./partnerChannelPage.module.css";

type Props = { channel: AdminPartnerChannelStore };

const pg = {
  pageSize: 8,
  showSizeChanger: true,
  pageSizeOptions: [8, 12, 20] as number[],
  simple: true,
  size: "small" as const,
};

export function PartnerChannelQueryPanel({ channel }: Props) {
  const merchants = channel.merchants ?? [];
  const endUsers = channel.endUsers ?? [];
  const [partnerPhone, setPartnerPhone] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const partnerOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: "全部体系", value: "" }];
    for (const p of channel.principals) {
      opts.push({
        label: `${p.principalName}（${p.principalPhone}）`,
        value: p.principalPhone,
      });
    }
    return opts;
  }, [channel.principals]);

  const rangeStrict = useMemo((): [Dayjs, Dayjs] | null => {
    const a = range?.[0];
    const b = range?.[1];
    if (!a || !b) return null;
    return [a, b];
  }, [range]);

  const fk = keyword.trim();

  const linesFiltered = useMemo(() => {
    return channel.rewardLines.filter((r) => {
      if (partnerPhone && norm(r.rootPartnerPhone) !== norm(partnerPhone)) return false;
      const ts = parsePartnerChannelTime(r.time);
      if (!inDateRange(ts, rangeStrict)) return false;
      const blob = [
        r.kind,
        r.remark ?? "",
        r.rootPartnerPhone,
        r.inviterStaffPhone ?? "",
        r.inviterStaffName ?? "",
      ].join(" ");
      return matchKeyword(blob, fk);
    });
  }, [channel.rewardLines, partnerPhone, rangeStrict, fk]);

  const principalsFiltered = useMemo(() => {
    return channel.principals.filter((p) => {
      if (partnerPhone && norm(p.principalPhone) !== norm(partnerPhone)) return false;
      const blob = [p.principalName, p.principalPhone, p.tierLabel ?? "", p.adminNote ?? ""].join(" ");
      return matchKeyword(blob, fk);
    });
  }, [channel.principals, partnerPhone, fk]);

  const staffFiltered = useMemo(() => {
    return channel.staffDetails.filter((s) => {
      if (partnerPhone && norm(s.rootPartnerPhone) !== norm(partnerPhone)) return false;
      const blob = [
        s.rootPartnerName,
        s.rootPartnerPhone,
        s.staffName,
        s.staffPhone,
        s.parentL1Hint ?? "",
      ].join(" ");
      return matchKeyword(blob, fk);
    });
  }, [channel.staffDetails, partnerPhone, fk]);

  const merchantsFiltered = useMemo(() => {
    return merchants.filter((m) => {
      if (partnerPhone && norm(m.rootPartnerPhone) !== norm(partnerPhone)) return false;
      if (rangeStrict && m.bindAt) {
        const bd = dayjs(m.bindAt, "YYYY-MM-DD", true);
        if (bd.isValid() && !inDateRange(bd, rangeStrict)) return false;
      }
      const blob = [
        m.merchantName,
        m.shopPhone ?? "",
        m.address ?? "",
        m.inviterStaffName ?? "",
        m.inviterStaffPhone ?? "",
        m.status ?? "",
        m.remark ?? "",
      ].join(" ");
      return matchKeyword(blob, fk);
    });
  }, [merchants, partnerPhone, rangeStrict, fk]);

  const endUsersFiltered = useMemo(() => {
    return endUsers.filter((u) => {
      if (partnerPhone && norm(u.rootPartnerPhone) !== norm(partnerPhone)) return false;
      if (rangeStrict && u.registeredAt) {
        const bd = dayjs(u.registeredAt, "YYYY-MM-DD", true);
        if (bd.isValid() && !inDateRange(bd, rangeStrict)) return false;
      }
      const blob = [
        u.userPhone,
        u.displayName ?? "",
        u.inviterName ?? "",
        u.inviterPhone ?? "",
        u.rootPartnerPhone ?? "",
        u.vipTierLabel ?? "",
        u.remark ?? "",
      ].join(" ");
      return matchKeyword(blob, fk);
    });
  }, [endUsers, partnerPhone, rangeStrict, fk]);

  const onePrincipal: AdminPartnerPrincipalPerfRow | undefined = partnerPhone
    ? channel.principals.find((p) => norm(p.principalPhone) === norm(partnerPhone))
    : undefined;

  const lineSum = useMemo(
    () => linesFiltered.reduce((s, r) => s + (Number(r.amountYuan) || 0), 0),
    [linesFiltered],
  );

  const filterBar = (
    <div className={styles.filterBar}>
      <div className={styles.filterField}>
        <span className={styles.labelMini}>体系</span>
        <Select
          showSearch
          optionFilterProp="label"
          size="small"
          style={{ width: "100%" }}
          options={partnerOptions}
          value={partnerPhone}
          onChange={(v) => setPartnerPhone(String(v ?? ""))}
        />
      </div>
      <div className={styles.filterFieldWide}>
        <span className={styles.labelMini}>流水时间（空=不限）</span>
        <DatePicker.RangePicker
          size="small"
          style={{ width: "100%" }}
          value={range}
          onChange={(v) => setRange(v)}
          presets={[
            { label: "今日", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
            { label: "近7天", value: [dayjs().add(-6, "day").startOf("day"), dayjs().endOf("day")] },
            { label: "近30天", value: [dayjs().add(-29, "day").startOf("day"), dayjs().endOf("day")] },
            { label: "本月", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
          ]}
        />
      </div>
      <div className={styles.filterField}>
        <span className={styles.labelMini}>关键词</span>
        <Input
          allowClear
          size="small"
          placeholder="姓名/手机/备注"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className={styles.filterMeta}>
        流水 <Typography.Text strong>{linesFiltered.length}</Typography.Text> 条 · 合计{" "}
        <Typography.Text strong>{lineSum.toFixed(2)}</Typography.Text> 元
        <span style={{ marginLeft: 12, color: "rgba(0,0,0,0.25)" }}>|</span>
        <span style={{ marginLeft: 12 }}>
          员工 {staffFiltered.length} · 网点 {merchantsFiltered.length} · 用户 {endUsersFiltered.length}
          {partnerPhone ? "" : ` · 主管 ${principalsFiltered.length}`}
        </span>
      </div>
    </div>
  );

  const staffTable = (
    <Table<AdminPartnerStaffPerfRow>
      className={styles.tableWrap}
      size="small"
      rowKey="key"
      pagination={pg}
      dataSource={staffFiltered}
      scroll={{ x: 960 }}
      columns={[
        { title: "手机", dataIndex: "staffPhone", width: 110 },
        { title: "姓名", dataIndex: "staffName", width: 88 },
        {
          title: "级",
          dataIndex: "tier",
          width: 52,
          render: (t: string) => (t === "L1" ? <Tag color="blue">L1</Tag> : <Tag color="cyan">L2</Tag>),
        },
        { title: "%", dataIndex: "commissionPct", width: 44 },
        { title: "业绩", dataIndex: "periodRewardYuan", width: 80 },
        { title: "邀客", dataIndex: "inviteUsers", width: 52 },
        { title: "邀店", dataIndex: "inviteMerchants", width: 52 },
        { title: "挂靠", dataIndex: "parentL1Hint", ellipsis: true },
      ]}
    />
  );

  const merchantTable = (
    <Table<AdminPartnerMerchantRow>
      className={styles.tableWrap}
      size="small"
      rowKey="key"
      pagination={pg}
      dataSource={merchantsFiltered}
      scroll={{ x: 1000 }}
      columns={[
        { title: "门店", dataIndex: "merchantName", width: 136 },
        { title: "店主", dataIndex: "bossName", width: 72, render: (t: string) => t || "—" },
        { title: "电话", dataIndex: "shopPhone", width: 104 },
        { title: "城市", dataIndex: "city", width: 72, render: (t: string) => t || "—" },
        { title: "地址", dataIndex: "address", ellipsis: true },
        { title: "邀请人", dataIndex: "inviterStaffName", width: 76 },
        { title: "状态", dataIndex: "status", width: 64 },
        { title: "建档", dataIndex: "bindAt", width: 88 },
        { title: "订单(演示)", dataIndex: "periodOrderYuan", width: 92 },
      ]}
    />
  );

  const rewardTable = (extraRootCol: boolean) => (
    <Table<AdminPartnerRewardLineRow>
      className={styles.tableWrap}
      size="small"
      rowKey="key"
      pagination={{ ...pg, pageSize: 8 }}
      dataSource={linesFiltered}
      scroll={{ x: extraRootCol ? 1000 : 920 }}
      columns={[
        { title: "时间", dataIndex: "time", width: 148 },
        ...(extraRootCol
          ? [{ title: "体系", dataIndex: "rootPartnerPhone", width: 108 } as const]
          : []),
        { title: "类型", dataIndex: "kind", width: 108 },
        {
          title: "金额",
          dataIndex: "amountYuan",
          width: 72,
          align: "right" as const,
          render: (v: number) => (typeof v === "number" ? v.toFixed(2) : String(v)),
        },
        { title: "员工", dataIndex: "inviterStaffName", width: 80 },
        ...(extraRootCol ? [] : [{ title: "员工手机", dataIndex: "inviterStaffPhone", width: 108 } as const]),
        { title: "备注", dataIndex: "remark", ellipsis: true },
      ]}
    />
  );

  const userTable = (
    <Table<AdminChannelEndUserRow>
      className={styles.tableWrap}
      size="small"
      rowKey="key"
      pagination={pg}
      dataSource={endUsersFiltered}
      scroll={{ x: 920 }}
      columns={[
        { title: "手机", dataIndex: "userPhone", width: 112 },
        { title: "显示名", dataIndex: "displayName", width: 96, ellipsis: true },
        { title: "归属主管", dataIndex: "rootPartnerPhone", width: 118 },
        { title: "邀请人", dataIndex: "inviterName", width: 88 },
        { title: "VIP", dataIndex: "vipTierLabel", width: 92 },
        { title: "建档", dataIndex: "registeredAt", width: 96 },
      ]}
    />
  );

  const principalTable = (
    <Table<AdminPartnerPrincipalPerfRow>
      className={styles.tableWrap}
      size="small"
      rowKey="key"
      pagination={pg}
      dataSource={principalsFiltered}
      scroll={{ x: 760 }}
      columns={[
        { title: "主管手机", dataIndex: "principalPhone", width: 118 },
        { title: "名称", dataIndex: "principalName", width: 128 },
        { title: "档位", dataIndex: "tierLabel", width: 56, render: (t: string) => t || "—" },
        { title: "员工", dataIndex: "staffCount", width: 48 },
        { title: "毛利", dataIndex: "periodGrossYuan", width: 76 },
        { title: "团队线", dataIndex: "teamLineRewardYuan", width: 76 },
        {
          title: "",
          width: 64,
          render: (_, row) => (
            <Typography.Link onClick={() => setPartnerPhone(row.principalPhone)}>查看</Typography.Link>
          ),
        },
      ]}
    />
  );

  return (
    <div>
      {filterBar}

      {partnerPhone ? (
        <>
          {onePrincipal ? (
            <Descriptions
              className={styles.summaryStrip}
              size="small"
              column={{ xs: 2, sm: 3, md: 4, lg: 6, xl: 8 }}
              styles={{ label: { fontSize: 11, paddingBottom: 0 }, content: { fontSize: 12, paddingBottom: 2 } }}
            >
              <Descriptions.Item label="主管">{onePrincipal.principalName}</Descriptions.Item>
              <Descriptions.Item label="手机">{onePrincipal.principalPhone}</Descriptions.Item>
              <Descriptions.Item label="档位">{onePrincipal.tierLabel ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="员工">{onePrincipal.staffCount}</Descriptions.Item>
              <Descriptions.Item label="毛利(元)">{onePrincipal.periodGrossYuan}</Descriptions.Item>
              <Descriptions.Item label="留存(元)">{onePrincipal.principalRetainYuan}</Descriptions.Item>
              <Descriptions.Item label="团队线(元)">{onePrincipal.teamLineRewardYuan}</Descriptions.Item>
              <Descriptions.Item label="新客">{onePrincipal.newUsers}</Descriptions.Item>
              <Descriptions.Item label="新店">{onePrincipal.newMerchants}</Descriptions.Item>
              <Descriptions.Item label="结算">{onePrincipal.settleCount}</Descriptions.Item>
              {onePrincipal.backupPhone ? (
                <Descriptions.Item label="备用电话">{onePrincipal.backupPhone}</Descriptions.Item>
              ) : null}
              {onePrincipal.adminNote ? (
                <Descriptions.Item label="内部备注" span={2}>
                  {onePrincipal.adminNote}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          ) : (
            <div className={styles.summaryStrip}>
              <Typography.Text type="warning">台账无此主管，请到「台账维护」核对手机号。</Typography.Text>
            </div>
          )}

          <Tabs
            size="small"
            className={styles.queryInnerTabs}
            defaultActiveKey="staff"
            items={[
              { key: "staff", label: "员工", children: staffTable },
              { key: "merchants", label: "网点", children: merchantTable },
              { key: "users", label: "用户", children: userTable },
              { key: "lines", label: "流水", children: rewardTable(false) },
            ]}
          />
        </>
      ) : (
        <Tabs
          size="small"
          className={styles.queryInnerTabs}
          defaultActiveKey="principals"
          items={[
            { key: "principals", label: "主管总览", children: principalTable },
            { key: "users_all", label: "终端用户", children: userTable },
            {
              key: "allLines",
              label: "全平台流水",
              children: rewardTable(true),
            },
          ]}
        />
      )}
    </div>
  );
}
