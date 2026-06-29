export type MiniappCarouselItem = {
  id: string;
  imageUrl: string;
  title?: string;
  link?: string;
};

export type MiniappAdBlock = {
  id: string;
  imageUrl: string;
  title?: string;
  link?: string;
  variant?: "banner" | "card";
};

/** 首页板块（顺序即展示顺序） */
export type MiniappHomeBlock =
  | { id: string; type: "welcome_tip"; hidden?: boolean }
  | { id: string; type: "hero"; hidden?: boolean }
  | { id: string; type: "vehicle_status"; hidden?: boolean }
  | { id: string; type: "carousel"; hidden?: boolean; items: MiniappCarouselItem[] }
  | (MiniappAdBlock & { type: "ad"; hidden?: boolean });

export type MiniappHomeLayout = {
  /** 有序板块列表；缺失时由 merge 从旧版 carousel/adBlocks 生成 */
  blocks?: MiniappHomeBlock[];
  /** @deprecated 仅兼容旧客户端；以 blocks 为准 */
  carouselEnabled?: boolean;
  carousel?: MiniappCarouselItem[];
  adBlocks?: MiniappAdBlock[];
};

export type MiniappUiPolicy = {
  allowHomeLayoutEdit?: boolean;
};

function trimLink(s: string): string | undefined {
  const t = s.trim();
  return t.length ? t : undefined;
}

function normCarouselItem(x: unknown): MiniappCarouselItem {
  const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  const id =
    String(o.id ?? "").trim() || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const imageUrl = String(o.imageUrl ?? "").trim();
  return {
    id,
    imageUrl: imageUrl || "https://picsum.photos/seed/placeholder/400/200",
    title: typeof o.title === "string" ? o.title : undefined,
    link: typeof o.link === "string" ? trimLink(o.link) : undefined,
  };
}

function normAdFields(x: unknown): MiniappAdBlock {
  const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  const id =
    String(o.id ?? "").trim() || `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const imageUrl = String(o.imageUrl ?? "").trim();
  const variant = o.variant === "card" ? "card" : "banner";
  return {
    id,
    imageUrl: imageUrl || "https://picsum.photos/seed/adph/400/120",
    title: typeof o.title === "string" ? o.title : undefined,
    link: typeof o.link === "string" ? trimLink(o.link) : undefined,
    variant,
  };
}

function normBlock(x: unknown): MiniappHomeBlock | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = String(o.id ?? "").trim() || `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const hidden = o.hidden === true;
  const t = o.type;
  if (t === "welcome_tip") return { id, type: "welcome_tip", hidden: hidden || undefined };
  if (t === "hero") return { id, type: "hero", hidden: hidden || undefined };
  if (t === "vehicle_status") return { id, type: "vehicle_status", hidden: hidden || undefined };
  if (t === "carousel") {
    const items = Array.isArray(o.items) ? o.items.map((it) => normCarouselItem(it)) : [];
    return { id, type: "carousel", hidden: hidden || undefined, items };
  }
  if (t === "ad") {
    const ad = normAdFields(o);
    return { ...ad, type: "ad" as const, hidden: hidden || undefined };
  }
  return null;
}

const SYS_WELCOME = "blk_welcome_tip";
const SYS_HERO = "blk_hero";
const SYS_STATUS = "blk_vehicle_status";

function dedupeSystemBlocks(blocks: MiniappHomeBlock[]): MiniappHomeBlock[] {
  let seenWelcome = false;
  let seenHero = false;
  let seenStatus = false;
  const out: MiniappHomeBlock[] = [];
  for (const b of blocks) {
    if (b.type === "welcome_tip") {
      if (seenWelcome) continue;
      seenWelcome = true;
    } else if (b.type === "hero") {
      if (seenHero) continue;
      seenHero = true;
    } else if (b.type === "vehicle_status") {
      if (seenStatus) continue;
      seenStatus = true;
    }
    out.push(b);
  }
  if (!seenWelcome) out.unshift({ id: SYS_WELCOME, type: "welcome_tip" });
  if (!seenHero) out.push({ id: SYS_HERO, type: "hero" });
  if (!seenStatus) out.push({ id: SYS_STATUS, type: "vehicle_status" });
  return out;
}

/** 从旧版或空布局生成 blocks */
export function blocksFromLegacyOrSeed(layout: MiniappHomeLayout): MiniappHomeBlock[] {
  if (Array.isArray(layout.blocks)) {
    const parsed = layout.blocks.map(normBlock).filter((x): x is MiniappHomeBlock => !!x);
    return dedupeSystemBlocks(parsed);
  }
  const blocks: MiniappHomeBlock[] = [];
  blocks.push({ id: SYS_WELCOME, type: "welcome_tip" });
  const ce = layout.carouselEnabled !== false;
  const car = Array.isArray(layout.carousel) ? layout.carousel : [];
  if (ce && car.length > 0) {
    blocks.push({
      id: "blk_carousel_main",
      type: "carousel",
      items: car.map((x) => normCarouselItem(x)),
    });
  }
  const ads = Array.isArray(layout.adBlocks) ? layout.adBlocks : [];
  for (const ad of ads) {
    const a = normAdFields(ad);
    blocks.push({ ...a, type: "ad" });
  }
  blocks.push({ id: SYS_HERO, type: "hero" });
  blocks.push({ id: SYS_STATUS, type: "vehicle_status" });
  return dedupeSystemBlocks(blocks);
}

/** 从 blocks 派生旧字段，便于渐进迁移 */
function deriveLegacyFields(blocks: MiniappHomeBlock[]): Pick<
  MiniappHomeLayout,
  "carousel" | "adBlocks" | "carouselEnabled"
> {
  const carouselBlocks = blocks.filter((b): b is Extract<MiniappHomeBlock, { type: "carousel" }> => b.type === "carousel");
  const allCarouselItems = carouselBlocks.flatMap((b) => b.items);
  const ads = blocks
    .filter((b): b is MiniappHomeBlock & { type: "ad" } => b.type === "ad")
    .map(({ type: _t, hidden: _h, ...rest }) => rest);
  return {
    carouselEnabled: carouselBlocks.some((b) => !b.hidden && b.items.length > 0),
    carousel: allCarouselItems,
    adBlocks: ads,
  };
}

export function defaultMiniappHomeLayout(): MiniappHomeLayout {
  const demoCarousel: MiniappCarouselItem[] = [
    {
      id: "demo_c1",
      imageUrl: "https://picsum.photos/seed/evhome1/750/320",
      title: "智慧控车 · 活动示例",
      link: "",
    },
    {
      id: "demo_c2",
      imageUrl: "https://picsum.photos/seed/evhome2/750/320",
      title: "安防服务升级",
      link: "",
    },
  ];
  const demoAd = normAdFields({
    id: "demo_a1",
    imageUrl: "https://picsum.photos/seed/evad1/700/120",
    title: "广告位 · 可配置跳转",
    link: "",
    variant: "banner",
  });
  const blocks: MiniappHomeBlock[] = dedupeSystemBlocks([
    { id: SYS_WELCOME, type: "welcome_tip" },
    { id: "blk_carousel_1", type: "carousel", items: demoCarousel },
    { ...demoAd, type: "ad" },
    { id: SYS_HERO, type: "hero" },
    { id: SYS_STATUS, type: "vehicle_status" },
  ]);
  const legacy = deriveLegacyFields(blocks);
  return { blocks, ...legacy };
}

export function mergeMiniappHomeLayout(
  seed: MiniappHomeLayout,
  partial: MiniappHomeLayout | undefined,
): MiniappHomeLayout {
  if (!partial || typeof partial !== "object") {
    const blocks = blocksFromLegacyOrSeed(seed);
    return { ...seed, blocks, ...deriveLegacyFields(blocks) };
  }
  const blocks = Array.isArray(partial.blocks)
    ? dedupeSystemBlocks(partial.blocks.map(normBlock).filter((x): x is MiniappHomeBlock => !!x))
    : blocksFromLegacyOrSeed({ ...seed, ...partial });
  const legacy = deriveLegacyFields(blocks);
  return {
    ...seed,
    ...partial,
    blocks,
    ...legacy,
  };
}

export function mergeMiniappUiPolicy(
  seed: MiniappUiPolicy | undefined,
  partial: MiniappUiPolicy | undefined,
): MiniappUiPolicy {
  return { allowHomeLayoutEdit: true, ...seed, ...partial };
}

export { normCarouselItem, normAdFields, normBlock };
