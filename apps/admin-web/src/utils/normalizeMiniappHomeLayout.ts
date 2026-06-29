import type {
  MiniappAdBlock,
  MiniappCarouselItem,
  MiniappHomeBlock,
  MiniappHomeLayout,
} from "../types/gatewayStore";
import { defaultMiniappHomeLayout } from "../constants/miniappHomeLayoutDefaults";

function normCarouselItem(item: unknown, idx: number): MiniappCarouselItem {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const id = o.id != null && String(o.id).trim() ? String(o.id) : `c_${Date.now()}_${idx}`;
    const imageUrl = o.imageUrl != null ? String(o.imageUrl) : "";
    return {
      id,
      imageUrl,
      title: o.title != null ? String(o.title) : undefined,
      link: o.link != null ? String(o.link) : undefined,
    };
  }
  return { id: `c_${Date.now()}_${idx}`, imageUrl: "", title: "", link: "" };
}

function normAdItem(item: unknown, idx: number): MiniappAdBlock {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const id = o.id != null && String(o.id).trim() ? String(o.id) : `a_${Date.now()}_${idx}`;
    const imageUrl = o.imageUrl != null ? String(o.imageUrl) : "";
    const variant = o.variant === "card" ? "card" : "banner";
    return {
      id,
      imageUrl,
      title: o.title != null ? String(o.title) : undefined,
      link: o.link != null ? String(o.link) : undefined,
      variant,
    };
  }
  return { id: `a_${Date.now()}_${idx}`, imageUrl: "", title: "", link: "", variant: "card" };
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
    const items = Array.isArray(o.items) ? o.items.map((it, i) => normCarouselItem(it, i)) : [];
    return { id, type: "carousel", hidden: hidden || undefined, items };
  }
  if (t === "ad") {
    const ad = normAdItem(o, 0);
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

function blocksFromLegacyOrSeed(layout: MiniappHomeLayout): MiniappHomeBlock[] {
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
      items: car.map((x, i) => normCarouselItem(x, i)),
    });
  }
  const ads = Array.isArray(layout.adBlocks) ? layout.adBlocks : [];
  for (let i = 0; i < ads.length; i++) {
    const ad = normAdItem(ads[i], i);
    blocks.push({ ...ad, type: "ad" });
  }
  blocks.push({ id: SYS_HERO, type: "hero" });
  blocks.push({ id: SYS_STATUS, type: "vehicle_status" });
  return dedupeSystemBlocks(blocks);
}

function deriveLegacyFields(blocks: MiniappHomeBlock[]): Pick<
  MiniappHomeLayout,
  "carousel" | "adBlocks" | "carouselEnabled"
> {
  const carouselBlocks = blocks.filter(
    (b): b is Extract<MiniappHomeBlock, { type: "carousel" }> => b.type === "carousel",
  );
  const allCarouselItems = carouselBlocks.flatMap((b) => b.items);
  const ads: MiniappAdBlock[] = blocks
    .filter((b): b is MiniappHomeBlock & { type: "ad" } => b.type === "ad")
    .map(({ type: _t, hidden: _h, ...rest }) => rest);
  return {
    carouselEnabled: carouselBlocks.some((b) => !b.hidden && b.items.length > 0),
    carousel: allCarouselItems,
    adBlocks: ads,
  };
}

/** 合并网关可能不完整的 homeLayout，补齐 blocks 与旧字段 */
export function normalizeMiniappHomeLayout(raw: unknown): MiniappHomeLayout {
  const base = defaultMiniappHomeLayout();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const r = raw as MiniappHomeLayout;
  const blocks = blocksFromLegacyOrSeed(r);
  const legacy = deriveLegacyFields(blocks);
  return {
    ...r,
    blocks,
    ...legacy,
  };
}

export function getHomeLayoutBlocksForRender(layout: MiniappHomeLayout): MiniappHomeBlock[] {
  return blocksFromLegacyOrSeed(layout);
}
