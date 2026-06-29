import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { EditOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Image,
  Input,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";
import { getHomeLayoutBlocksForRender, normalizeMiniappHomeLayout } from "../utils/normalizeMiniappHomeLayout";
import type {
  MiniappAdBlock,
  MiniappCarouselItem,
  MiniappHomeBlock,
  MiniappHomeLayout,
} from "../types/gatewayStore";

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function isSystemOnlyBlock(b: MiniappHomeBlock): boolean {
  return b.type === "welcome_tip" || b.type === "hero" || b.type === "vehicle_status";
}

function blockTitle(b: MiniappHomeBlock): string {
  switch (b.type) {
    case "welcome_tip":
      return "提示条（文案在「预览与文案」里改 welcomeTip）";
    case "hero":
      return "车辆卡片（锁车 / 车牌区）";
    case "vehicle_status":
      return "车辆状态（地图与围栏摘要）";
    case "carousel":
      return `轮播图（${b.items.length} 张）`;
    case "ad":
      return `广告位 · ${b.title || "未命名"}`;
    default: {
      const _exhaust: never = b;
      return _exhaust;
    }
  }
}

/** 阻断拖拽传感器吞掉内部点击/输入（dnd-kit + 嵌套控件常见问题） */
function StopDragBubble(props: { children: ReactNode }) {
  return (
    <div
      role="presentation"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ flex: 1, minWidth: 0 }}
    >
      {props.children}
    </div>
  );
}

function SortableRow(props: { id: string; disabled: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
    disabled: props.disabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
    zIndex: isDragging ? 2 : 0,
    position: "relative" as const,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "10px 8px",
          marginBottom: 8,
          border: "1px solid var(--ant-color-border-secondary, #f0f0f0)",
          borderRadius: 8,
          background: "var(--ant-color-bg-container, #fff)",
        }}
      >
        <Button
          type="text"
          size="small"
          disabled={props.disabled}
          aria-label="拖动排序"
          title="按住拖动排序"
          icon={<HolderOutlined />}
          style={{ cursor: props.disabled ? "not-allowed" : "grab", marginTop: 2, flexShrink: 0 }}
          {...attributes}
          {...listeners}
        />
        <StopDragBubble>{props.children}</StopDragBubble>
      </div>
    </div>
  );
}

export function HomeLayoutBlocksEditor(props: {
  value: MiniappHomeLayout;
  onChange: (next: MiniappHomeLayout) => void;
  disabled?: boolean;
}) {
  const { message } = App.useApp();
  const { value, onChange, disabled } = props;
  const blocks = getHomeLayoutBlocksForRender(value);
  const [adDrawerId, setAdDrawerId] = useState<string | null>(null);

  const setBlocks = (next: MiniappHomeBlock[]) => {
    onChange(normalizeMiniappHomeLayout({ ...value, blocks: next }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 120, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setBlocks(arrayMove(blocks, oldIndex, newIndex));
  };

  const patchBlock = (id: string, patch: Partial<MiniappHomeBlock>) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== id) return b;
        return { ...b, ...patch } as MiniappHomeBlock;
      }),
    );
  };

  const patchCarousel = (blockId: string, itemId: string, patch: Partial<MiniappCarouselItem>) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId || b.type !== "carousel") return b;
        return {
          ...b,
          items: b.items.map((c) => (c.id === itemId ? { ...c, ...patch } : c)),
        };
      }),
    );
  };

  const addCarouselSlide = (blockId: string) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId || b.type !== "carousel") return b;
        return {
          ...b,
          items: [
            ...b.items,
            {
              id: newId("c"),
              imageUrl: "https://picsum.photos/seed/newslide/750/320",
              title: "新幻灯片",
              link: "",
            },
          ],
        };
      }),
    );
  };

  const removeCarouselSlide = async (blockId: string, itemId: string) => {
    const b = blocks.find((x) => x.id === blockId);
    const row = b && b.type === "carousel" ? b.items.find((c) => c.id === itemId) : undefined;
    const ok = await doubleConfirmDelete({
      firstTitle: "删除该张轮播图？",
      firstContent: row ? `「${row.title || row.imageUrl}」` : undefined,
      onDelete: () => {
        setBlocks(
          blocks.map((block) => {
            if (block.id !== blockId || block.type !== "carousel") return block;
            return { ...block, items: block.items.filter((c) => c.id !== itemId) };
          }),
        );
        message.success("已删除（仍未保存到网关）");
      },
    });
    if (!ok) return;
  };

  const patchAd = (blockId: string, patch: Partial<MiniappAdBlock>) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId || b.type !== "ad") return b;
        return { ...b, ...patch };
      }),
    );
  };

  const addCarouselBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: newId("blk_car"),
        type: "carousel",
        items: [
          {
            id: newId("c"),
            imageUrl: "https://picsum.photos/seed/newcar/750/320",
            title: "新轮播",
            link: "",
          },
        ],
      },
    ]);
  };

  const addAdBlock = () => {
    const id = newId("blk_ad");
    setBlocks([
      ...blocks,
      {
        id,
        type: "ad",
        imageUrl: "https://picsum.photos/seed/newad/700/120",
        title: "新广告",
        link: "",
        variant: "card",
      },
    ]);
    setAdDrawerId(id);
    message.info("已添加广告位，请在抽屉中完善素材与跳转。");
  };

  const removeBlock = async (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || isSystemOnlyBlock(b)) return;
    const ok = await doubleConfirmDelete({
      firstTitle: "移除该板块？",
      firstContent: `将移除「${blockTitle(b)}」。`,
      onDelete: () => {
        setBlocks(blocks.filter((x) => x.id !== id));
        if (adDrawerId === id) setAdDrawerId(null);
        message.success("已移除（仍未保存到网关）");
      },
    });
    if (!ok) return;
  };

  const adEditing =
    adDrawerId != null
      ? blocks.find((x): x is MiniappHomeBlock & { type: "ad" } => x.id === adDrawerId && x.type === "ad")
      : undefined;

  return (
    <div style={{ width: "100%" }}>
      {disabled ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
          当前策略禁止修改首页布局。
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 11 }}>
          <strong>仅按住左侧 ⋮⋮ 拖动</strong> 排序（约 0.1 秒起拖，避免误触）。广告位点「编辑」在侧栏专业表单中配置，左侧手机预览实时同步。
        </Typography.Paragraph>
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Button size="small" type="primary" ghost icon={<PlusOutlined />} disabled={disabled} onClick={addCarouselBlock}>
          添加轮播模块
        </Button>
        <Button size="small" type="primary" ghost icon={<PlusOutlined />} disabled={disabled} onClick={addAdBlock}>
          添加广告位
        </Button>
      </Space>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={disabled ? () => {} : onDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((b) => (
            <SortableRow key={b.id} id={b.id} disabled={!!disabled}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Space wrap align="center">
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    {blockTitle(b)}
                  </Typography.Text>
                  {isSystemOnlyBlock(b) ? <Tag color="blue">系统</Tag> : <Tag color="cyan">运营</Tag>}
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    显示
                  </Typography.Text>
                  <Switch
                    size="small"
                    checked={!b.hidden}
                    disabled={disabled}
                    onChange={(on) => patchBlock(b.id, { hidden: !on })}
                  />
                  {!isSystemOnlyBlock(b) ? (
                    <Button size="small" type="link" danger disabled={disabled} onClick={() => void removeBlock(b.id)}>
                      移除模块
                    </Button>
                  ) : null}
                </Space>

                {b.type === "carousel" ? (
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <Button size="small" disabled={disabled} onClick={() => addCarouselSlide(b.id)}>
                      本模块加一张图
                    </Button>
                    {b.items.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          padding: 8,
                          background: "var(--ant-color-fill-alter, #fafafa)",
                          borderRadius: 6,
                        }}
                      >
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                          幻灯片 {idx + 1}
                        </Typography.Text>
                        <Input
                          size="small"
                          style={{ marginTop: 6 }}
                          value={item.imageUrl}
                          disabled={disabled}
                          placeholder="图片 URL"
                          onChange={(e) => patchCarousel(b.id, item.id, { imageUrl: e.target.value })}
                        />
                        <Input
                          size="small"
                          style={{ marginTop: 6 }}
                          value={item.title ?? ""}
                          disabled={disabled}
                          placeholder="标题"
                          onChange={(e) => patchCarousel(b.id, item.id, { title: e.target.value })}
                        />
                        <Input
                          size="small"
                          style={{ marginTop: 6 }}
                          value={item.link ?? ""}
                          disabled={disabled}
                          placeholder="跳转"
                          onChange={(e) => patchCarousel(b.id, item.id, { link: e.target.value })}
                        />
                        <Button
                          size="small"
                          type="link"
                          danger
                          disabled={disabled}
                          onClick={() => void removeCarouselSlide(b.id, item.id)}
                        >
                          删此张
                        </Button>
                      </div>
                    ))}
                  </Space>
                ) : null}

                {b.type === "ad" ? (
                  <Card
                    size="small"
                    styles={{ body: { padding: 12 } }}
                    style={{ background: "var(--ant-color-fill-alter, #fafafa)" }}
                  >
                    <Space align="start" size={12} wrap>
                      <div
                        style={{
          width: 80,
          height: 80,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
          background: "#f0f0f0",
          border: "1px solid var(--ant-color-border-secondary)",
        }}
                      >
                        {b.imageUrl ? (
                          <Image
                            src={b.imageUrl}
                            alt=""
                            width={80}
                            height={80}
                            style={{ objectFit: "cover", display: "block" }}
                            preview={{ mask: "预览大图" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              color: "#999",
                              padding: 4,
                              textAlign: "center",
                            }}
                          >
                            无图
                          </div>
                        )}
                      </div>
                      <Space direction="vertical" size={4} style={{ minWidth: 0, flex: 1 }}>
                        <Typography.Text strong ellipsis>
                          {b.title?.trim() || "未填写标题"}
                        </Typography.Text>
                        <Typography.Paragraph
                          type="secondary"
                          ellipsis={{ rows: 2 }}
                          style={{ marginBottom: 0, fontSize: 12 }}
                        >
                          {b.link?.trim() || "未设置跳转链接"}
                        </Typography.Paragraph>
                        <Space size={4}>
                          <Tag color={b.variant === "banner" ? "geekblue" : "green"}>
                            {b.variant === "banner" ? "横幅" : "卡片"}
                          </Tag>
                        </Space>
                        <Button
                          type="primary"
                          size="small"
                          icon={<EditOutlined />}
                          disabled={disabled}
                          onClick={() => setAdDrawerId(b.id)}
                        >
                          编辑广告位
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                ) : null}

                {b.type === "welcome_tip" ? (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    文案在左侧选好「首页」路由后，在「预览与文案」面板编辑 welcomeTip。
                  </Typography.Text>
                ) : null}

                {(b.type === "hero" || b.type === "vehicle_status") && !b.hidden ? (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    显示受右侧「模块开关」中首页·车辆卡片 / 地图 开关影响。
                  </Typography.Text>
                ) : null}
              </Space>
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

      <Drawer
        title="广告位配置"
        placement="right"
        width={420}
        open={!!adEditing && !disabled}
        onClose={() => setAdDrawerId(null)}
        destroyOnClose
        styles={{ body: { paddingTop: 16 } }}
        extra={
          <Button type="link" onClick={() => setAdDrawerId(null)}>
            完成
          </Button>
        }
      >
        {adEditing ? (
          <Form layout="vertical" size="small" requiredMark="optional">
            <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16, fontSize: 12 }}>
              以下内容修改会立即同步到左侧手机预览；确认无误后请在页面顶部点击「保存配置」写入网关。
            </Typography.Paragraph>

            <Form.Item label="素材预览">
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid var(--ant-color-border-secondary)",
                  background: "#fafafa",
                  maxWidth: 280,
                }}
              >
                {adEditing.imageUrl ? (
                  <Image
                    src={adEditing.imageUrl}
                    alt="广告素材"
                    style={{ width: "100%", maxHeight: 140, objectFit: "cover", display: "block" }}
                    fallback="数据:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='120' viewBox='0 0 280 120'%3E%3Crect fill='%23e5e7eb' width='280' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14'%3E图片加载失败%3C/text%3E%3C/svg%3E"
                    preview={{ mask: "点击预览 / 放大" }}
                  />
                ) : (
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                    填写下方图片地址后显示预览
                  </div>
                )}
              </div>
            </Form.Item>

            <Form.Item
              label="图片地址"
              required
              tooltip="需已配置小程序 download 合法域名，HTTPS 推荐"
            >
              <Input
                value={adEditing.imageUrl}
                placeholder="https://你的域名/xxx.jpg"
                allowClear
                onChange={(e) => patchAd(adEditing.id, { imageUrl: e.target.value })}
              />
            </Form.Item>

            <Form.Item label="展示标题" tooltip="小程序卡片上展示的主文案">
              <Input
                value={adEditing.title ?? ""}
                placeholder="例如：春季保养特惠"
                allowClear
                onChange={(e) => patchAd(adEditing.id, { title: e.target.value })}
              />
            </Form.Item>

            <Form.Item
              label="点击跳转"
              tooltip="可填小程序内路径（如 pages/mall/mall）或 https 链接（需业务域名）"
            >
              <Input
                value={adEditing.link ?? ""}
                placeholder="pages/... 或 https://..."
                allowClear
                onChange={(e) => patchAd(adEditing.id, { link: e.target.value })}
              />
            </Form.Item>

            <Form.Item label="展示样式">
              <Segmented
                block
                value={adEditing.variant === "banner" ? "banner" : "card"}
                onChange={(v) => patchAd(adEditing.id, { variant: v as "banner" | "card" })}
                options={[
                  { label: "横幅 · 偏全宽", value: "banner" },
                  { label: "卡片 · 缩略+文案", value: "card" },
                ]}
              />
            </Form.Item>
          </Form>
        ) : null}
      </Drawer>
    </div>
  );
}
