import {
  App,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CopyOutlined, PlusOutlined, ShoppingOutlined, UploadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import { readFileAsDataUrl, gatewayUploadMallImage } from "../api/client";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";
import type { AdminMallProductRow, StoreShape } from "../types/gatewayStore";
import styles from "./mallManagePage.module.css";

function uid() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const IMG_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect fill="#f5f5f5" width="160" height="160" rx="10"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bfbfbf" font-size="11" font-family="system-ui,sans-serif">无图</text></svg>`,
  );

/** 抽屉内表单：与小程序 mall-product-form 字段一致，另含编码/排序/上架与画册多行 URL */
type MallDrawerFormValues = Omit<AdminMallProductRow, "tags" | "gallery"> & {
  tagsStr: string;
  galleryText: string;
};

type StatusFilter = "all" | "on" | "off";

export default function MallManagePage() {
  const { message } = App.useApp();
  const { store, saveStore, connected, error } = useAdminGateway();
  const [rows, setRows] = useState<AdminMallProductRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMallProductRow | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pickTarget, setPickTarget] = useState<"main" | null>(null);
  const filePickRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm<MallDrawerFormValues>();

  const mainImageWatch = Form.useWatch("mainImage", form) as string | undefined;

  useEffect(() => {
    const list = store?.admin?.mallCatalog;
    setRows(Array.isArray(list) ? list.map((r) => ({ ...r, gallery: r.gallery?.slice(), tags: r.tags?.slice() })) : []);
  }, [store?.admin?.mallCatalog]);

  const stats = useMemo(() => {
    const total = rows.length;
    const onSale = rows.filter((r) => r.published !== false).length;
    return { total, onSale, offSale: total - onSale };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let list = rows.slice();
    if (statusFilter === "on") list = list.filter((r) => r.published !== false);
    if (statusFilter === "off") list = list.filter((r) => r.published === false);
    if (kw) {
      list = list.filter((r) => {
        const hitName = r.name?.toLowerCase().includes(kw);
        const hitId = r.id?.toLowerCase().includes(kw);
        const hitTags = (r.tags || []).some((t) => t.toLowerCase().includes(kw));
        const hitSub = r.subtitle?.toLowerCase().includes(kw);
        return hitName || hitId || hitTags || hitSub;
      });
    }
    list.sort((a, b) => {
      const sa = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 1e6;
      const sb = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 1e6;
      if (sa !== sb) return sa - sb;
      return (a.name || "").localeCompare(b.name || "", "zh-CN");
    });
    return list;
  }, [rows, keyword, statusFilter]);

  const columns: ColumnsType<AdminMallProductRow> = [
      {
        title: "商品",
        key: "product",
        width: 320,
        fixed: "left",
        render: (_, rec) => (
          <div className={styles.productCell}>
            <Image
              src={rec.mainImage?.trim() || undefined}
              alt=""
              width={48}
              height={48}
              className={styles.productThumb}
              preview
              fallback={IMG_FALLBACK}
            />
            <div className={styles.productMeta}>
              <div className={styles.productTitle} title={rec.name}>
                {rec.name || "（无标题）"}
              </div>
              <div className={styles.productSub} title={rec.subtitle || rec.id}>
                {rec.subtitle || `编码 ${rec.id}`}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "编码",
        dataIndex: "id",
        width: 140,
        ellipsis: true,
        render: (id: string) => <Typography.Text code>{id}</Typography.Text>,
      },
      {
        title: "售价",
        dataIndex: "price",
        width: 100,
        render: (v: number, rec) => (
          <span className={styles.priceCell}>
            ¥{Number(v).toFixed(2)}
            {rec.unit ? <Typography.Text type="secondary"> /{rec.unit}</Typography.Text> : null}
          </span>
        ),
      },
      {
        title: "标签",
        dataIndex: "tags",
        width: 200,
        ellipsis: true,
        render: (tags: string[] | undefined) =>
          (tags?.length ? tags : []).slice(0, 4).map((t) => (
            <Tag key={t} style={{ marginBottom: 2 }}>
              {t}
            </Tag>
          )),
      },
      {
        title: "排序",
        dataIndex: "sortOrder",
        width: 72,
        render: (v) => (v != null ? v : "—"),
      },
      {
        title: "状态",
        dataIndex: "published",
        width: 88,
        render: (published: boolean | undefined, rec) => (
          <Space direction="vertical" size={2}>
            <Badge status={published !== false ? "success" : "default"} text={published !== false ? "出售中" : "已下架"} />
            <Switch
              size="small"
              checked={published !== false}
              onChange={(checked) =>
                setRows((prev) => prev.map((x) => (x.id === rec.id ? { ...x, published: checked } : x)))
              }
            />
          </Space>
        ),
      },
      {
        title: "操作",
        key: "op",
        width: 200,
        fixed: "right",
        render: (_, rec) => (
          <Space size={0} wrap>
            <Button type="link" size="small" onClick={() => openEdit(rec)}>
              编辑
            </Button>
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyFrom(rec)}>
              复制
            </Button>
            <Button type="link" size="small" danger onClick={() => void removeRow(rec.id)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

  function openCreate() {
    setEditing(null);
    form.resetFields();
    const nextSort = (rows.reduce((m, x) => Math.max(m, Number(x.sortOrder) || 0), 0) || 0) + 10;
    form.setFieldsValue({
      id: uid(),
      name: "",
      subtitle: "",
      price: 0.01,
      unit: "件",
      desc: "",
      detail: "",
      mainImage: "",
      published: true,
      sortOrder: nextSort,
      tagsStr: "",
      galleryText: "",
    });
    setDrawerOpen(true);
  }

  function openEdit(rec: AdminMallProductRow) {
    setEditing(rec);
    const { tags, gallery, ...rest } = rec;
    form.setFieldsValue({
      ...rest,
      tagsStr: (tags || []).join(","),
      galleryText: (gallery || []).join("\n"),
    });
    setDrawerOpen(true);
  }

  function copyFrom(rec: AdminMallProductRow) {
    setEditing(null);
    form.resetFields();
    const nextSort = (rows.reduce((m, x) => Math.max(m, Number(x.sortOrder) || 0), 0) || 0) + 10;
    const { tags, gallery, ...rest } = rec;
    form.setFieldsValue({
      ...rest,
      id: uid(),
      name: `${rec.name || "商品"}（复制）`,
      sortOrder: nextSort,
      tagsStr: (tags || []).join(","),
      galleryText: (gallery || []).join("\n"),
    });
    setDrawerOpen(true);
    message.info("已带入副本内容，编码已重新生成，保存一次即可入库。");
  }

  async function removeRow(id: string) {
    await doubleConfirmDelete({
      firstTitle: "从商品库中删除该商品？",
      firstContent: "仅删除本条记录；若曾保存到网关，需再点「保存到网关」才会同步删除。",
      onDelete: async () => {
        setRows((prev) => prev.filter((x) => x.id !== id));
        message.success("已从本页列表移除，请保存到网关以同步设备。");
      },
    });
  }

  function applyDrawer() {
    form
      .validateFields()
      .then((v) => {
        const tags = String(v.tagsStr ?? "")
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const gallery = String(v.galleryText ?? "")
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        const row: AdminMallProductRow = {
          id: String(v.id).trim(),
          name: String(v.name).trim(),
          subtitle: v.subtitle?.trim() || undefined,
          price: Number(v.price),
          unit: v.unit?.trim() || undefined,
          desc: v.desc?.trim() || undefined,
          detail: v.detail?.trim() || undefined,
          mainImage: v.mainImage?.trim() || "",
          gallery,
          tags,
          published: v.published !== false,
          sortOrder: Number.isFinite(Number(v.sortOrder)) ? Number(v.sortOrder) : undefined,
        };
        if (!row.id || !row.name || !Number.isFinite(row.price) || row.price < 0) {
          message.error("请填写有效商品编码、标题与价格");
          return;
        }
        const dup = rows.some((x) => x.id === row.id && (!editing || editing.id !== row.id));
        if (dup) {
          message.error("商品编码已存在，请换一个唯一编码");
          return;
        }
        if (editing && editing.id !== row.id) {
          message.error("不允许修改商品编码。若需调整编码，请复制为新商品或删除后重建。");
          return;
        }
        if (editing) {
          setRows((prev) => prev.map((x) => (x.id === editing.id ? row : x)));
        } else {
          setRows((prev) => [...prev, row]);
        }
        setDrawerOpen(false);
        message.success("已保存到本页列表，请再点页顶「保存到网关」同步小程序。");
      })
      .catch(() => {});
  }

  async function onPickedImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || pickTarget === null) return;
    if (!connected) {
      message.error("请先连接设备网关，图片会上传到网关并发直链给小程序使用。");
      setPickTarget(null);
      return;
    }
    const hide = message.loading("正在上传到网关…", 0);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const url = await gatewayUploadMallImage(dataUrl);
      form.setFieldValue("mainImage", url);
      message.success("上传成功，链接已填入。保存商品后记得「保存到网关」。");
    } catch (err) {
      message.error(String(err));
    } finally {
      hide();
      setPickTarget(null);
    }
  }

  function triggerPickMain() {
    setPickTarget("main");
    queueMicrotask(() => filePickRef.current?.click());
  }

  async function persist() {
    if (!store) {
      message.error("无本地门店数据，请先连接网关");
      return;
    }
    try {
      const next: StoreShape = JSON.parse(JSON.stringify(store));
      if (!next.admin) next.admin = {};
      next.admin.mallCatalog = rows.map((r) => ({
        ...r,
        gallery: r.gallery ? [...r.gallery] : [],
        tags: r.tags ? [...r.tags] : [],
      }));
      await saveStore(next);
      message.success("商品库已保存；小程序拉取「智控商城」数据后前台可见。");
    } catch (e) {
      message.error(String(e));
    }
  }

  const mainTrim = mainImageWatch?.trim();
  const hasMainPreview = !!mainTrim && /^https?:\/\//i.test(mainTrim);


  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <Typography.Title level={4} className={styles.pageTitle}>
            <ShoppingOutlined style={{ marginRight: 8 }} />
            智控商城 · 商品发布
          </Typography.Title>
          <p className={styles.subLine}>
            编辑表单与演示小程序「商城 → 编辑商品」字段对齐；数据写入{" "}
            <Typography.Text code>admin.mallCatalog</Typography.Text>
            ，保存后需「保存到网关」小程序才更新。
          </p>
        </div>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            发布商品
          </Button>
          <Button type="primary" ghost onClick={() => void persist()} disabled={!connected}>
            保存到网关
          </Button>
        </Space>
      </div>

      {!connected && error ? (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={`未连接网关：${error}`} />
      ) : null}

      <div className={styles.statRow}>
        <div className={styles.statItem}>
          <Statistic title="商品总数" value={stats.total} />
        </div>
        <div className={styles.statItem}>
          <Statistic title="出售中" value={stats.onSale} valueStyle={{ color: "#3f8600" }} />
        </div>
        <div className={styles.statItem}>
          <Statistic title="已下架" value={stats.offSale} valueStyle={{ color: "rgba(0,0,0,0.45)" }} />
        </div>
      </div>

      <Card size="small">
        <div className={styles.filterBar}>
          <Input.Search
            allowClear
            placeholder="搜标题、编码、标签、副标题"
            style={{ width: 300 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select<StatusFilter>
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { value: "all", label: "全部状态" },
              { value: "on", label: "仅出售中" },
              { value: "off", label: "仅已下架" },
            ]}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            当前展示 {filteredRows.length} / {rows.length} 条
          </Typography.Text>
        </div>

        <Table<AdminMallProductRow>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
          scroll={{ x: 1080 }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无商品，点击「发布商品」开始录入" />
            ),
          }}
        />
      </Card>

      <Drawer
        title={
          <Space size={6} className={styles.drawerTitle}>
            <span>{editing ? "编辑商品" : "发布新商品"}</span>
            {editing ? <Tag color="blue">{editing.id}</Tag> : <Tag>新建</Tag>}
          </Space>
        }
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        classNames={{ body: styles.drawerBody }}
        footer={
          <div className={styles.drawerFooter}>
            <Button size="small" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="primary" size="small" onClick={() => void applyDrawer()}>
              保存
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional" preserve={false} size="small">
          <input
            ref={filePickRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: "none" }}
            onChange={onPickedImageFile}
          />
          <div className={styles.mallFormLikeMini}>
            <Typography.Paragraph type="secondary" className={styles.mallFormIntro}>
              字段与小程序「商品编辑」一致；主图可本机上传到网关。改完后点下栏「保存」，再到页顶「保存到网关」同步设备。
            </Typography.Paragraph>

            <div className={styles.mallFormCard}>
              <div className={styles.mallFormLab}>主图</div>
              <div className={styles.mallImgRow}>
                {hasMainPreview ? (
                  <Image
                    src={mainTrim}
                    alt=""
                    className={styles.mallMainImgTap}
                    fallback={IMG_FALLBACK}
                    preview={{ mask: "大图" }}
                  />
                ) : (
                  <button type="button" className={styles.mallMainImgAdd} onClick={() => triggerPickMain()}>
                    + 本机上传
                  </button>
                )}
              </div>
              <Typography.Text type="secondary" className={styles.mallImgTip}>
                建议 1:1 或 4:3；也可直接在下方粘贴 http(s) 地址（演示小程序存本地，此处存网关 /uploads）。
              </Typography.Text>
              <Form.Item
                name="mainImage"
                label="图片地址"
                style={{ marginBottom: 0 }}
                extra={connected ? undefined : "未连接网关时仅可粘贴外链。"}
              >
                <Input
                  allowClear
                  placeholder="http://网关/uploads/… 或外链"
                  addonAfter={
                    <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => triggerPickMain()}>
                      上传
                    </Button>
                  }
                />
              </Form.Item>
            </div>

            <div className={styles.mallFormCard}>
              <div className={styles.mallFormLab}>后台</div>
              <Form.Item
                name="id"
                label="商品编码"
                rules={[{ required: true, message: "请填写编码" }]}
                extra="创建后不可改。"
              >
                <Input disabled={!!editing} placeholder="如 GW-808-V28" allowClear />
              </Form.Item>
              <Row gutter={[10, 0]}>
                <Col span={12}>
                  <Form.Item name="sortOrder" label="排序" extra="越小越靠前">
                    <InputNumber min={0} step={1} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="published" label="上下架" valuePropName="checked">
                    <Switch checkedChildren="出售中" unCheckedChildren="已下架" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.mallFormCard}>
              <div className={styles.mallFormLab}>商品信息</div>
              <Form.Item name="name" label="商品名称" rules={[{ required: true, message: "请填写名称" }]}>
                <Input placeholder="标题，30 字内为佳" maxLength={80} showCount />
              </Form.Item>
              <Form.Item name="subtitle" label="卖点副标题">
                <Input placeholder="一句话卖点" maxLength={120} showCount />
              </Form.Item>
              <Row gutter={[10, 0]}>
                <Col span={12}>
                  <Form.Item name="price" label="价格（元）" rules={[{ required: true, message: "请填写价格" }]}>
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} precision={2} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unit" label="单位">
                    <Input placeholder="件 / 台" allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="tagsStr" label="标签" extra="英文或中文逗号分隔，与小程序一致">
                <Input placeholder="官方,热销" allowClear />
              </Form.Item>
            </div>

            <div className={styles.mallFormCard}>
              <Form.Item
                name="galleryText"
                label="画册（可选）"
                extra="每行一个图片 URL，自上而下为展示顺序。"
              >
                <Input.TextArea rows={3} placeholder={"https://…\nhttps://…"} />
              </Form.Item>
            </div>

            <div className={styles.mallFormCard}>
              <Form.Item name="desc" label="列表短描述">
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="商城列表卡片摘要" />
              </Form.Item>
            </div>

            <div className={styles.mallFormCard}>
              <Form.Item name="detail" label="详情页图文（支持换行）">
                <Input.TextArea rows={10} maxLength={8000} showCount placeholder="规格、清单、安装与售后说明等" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
