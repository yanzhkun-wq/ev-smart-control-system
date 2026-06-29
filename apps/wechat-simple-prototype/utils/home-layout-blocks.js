/** 与后台 blocks 顺序一致，供首页按序渲染 */

const DEFAULT_FEATURES = {
  home_show_hero: true,
  home_show_remote: true,
  home_show_status: true,
};

function featureOn(features, key) {
  const v = features && features[key];
  if (typeof v === "boolean") return v;
  return DEFAULT_FEATURES[key] !== false;
}

const SYS_WELCOME = "blk_welcome_tip";
const SYS_HERO = "blk_hero";
const SYS_STATUS = "blk_vehicle_status";

function normCarouselItem(x, idx) {
  if (x && typeof x === "object") {
    const id = x.id != null && String(x.id).trim() ? String(x.id) : "c_" + Date.now() + "_" + idx;
    return {
      id,
      imageUrl: x.imageUrl != null ? String(x.imageUrl) : "",
      title: x.title != null ? String(x.title) : "",
      link: x.link != null ? String(x.link) : "",
    };
  }
  return { id: "c_" + Date.now() + "_" + idx, imageUrl: "", title: "", link: "" };
}

function normAd(o, idx) {
  if (o && typeof o === "object") {
    const id = o.id != null && String(o.id).trim() ? String(o.id) : "a_" + Date.now() + "_" + idx;
    return {
      id,
      imageUrl: o.imageUrl != null ? String(o.imageUrl) : "",
      title: o.title != null ? String(o.title) : "",
      link: o.link != null ? String(o.link) : "",
      variant: o.variant === "card" ? "card" : "banner",
    };
  }
  return { id: "a_" + Date.now() + "_" + idx, imageUrl: "", title: "", link: "", variant: "card" };
}

function normBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id != null && String(raw.id).trim() ? String(raw.id) : "blk_" + Date.now();
  const hidden = raw.hidden === true;
  const t = raw.type;
  if (t === "welcome_tip") return { id, type: "welcome_tip", hidden };
  if (t === "hero") return { id, type: "hero", hidden };
  if (t === "vehicle_status") return { id, type: "vehicle_status", hidden };
  if (t === "carousel") {
    const items = Array.isArray(raw.items) ? raw.items.map(normCarouselItem) : [];
    return { id, type: "carousel", hidden, items };
  }
  if (t === "ad") {
    const a = normAd(raw, 0);
    return { id: a.id, type: "ad", hidden, imageUrl: a.imageUrl, title: a.title, link: a.link, variant: a.variant };
  }
  return null;
}

function dedupeSystemBlocks(blocks) {
  let seenWelcome = false;
  let seenHero = false;
  let seenStatus = false;
  const out = [];
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
  if (!seenWelcome) out.unshift({ id: SYS_WELCOME, type: "welcome_tip", hidden: false });
  if (!seenHero) out.push({ id: SYS_HERO, type: "hero", hidden: false });
  if (!seenStatus) out.push({ id: SYS_STATUS, type: "vehicle_status", hidden: false });
  return out;
}

function blocksFromLayout(layout) {
  if (layout && Array.isArray(layout.blocks)) {
    return dedupeSystemBlocks(layout.blocks.map(normBlock).filter(Boolean));
  }
  const blocks = [];
  blocks.push({ id: SYS_WELCOME, type: "welcome_tip", hidden: false });
  const ce = layout && layout.carouselEnabled !== false;
  const car = layout && Array.isArray(layout.carousel) ? layout.carousel : [];
  if (ce && car.length > 0) {
    blocks.push({ id: "blk_carousel_main", type: "carousel", hidden: false, items: car.map(normCarouselItem) });
  }
  const ads = layout && Array.isArray(layout.adBlocks) ? layout.adBlocks : [];
  ads.forEach((ad, i) => {
    const a = normAd(ad, i);
    blocks.push({
      id: a.id,
      type: "ad",
      hidden: false,
      imageUrl: a.imageUrl,
      title: a.title,
      link: a.link,
      variant: a.variant,
    });
  });
  blocks.push({ id: SYS_HERO, type: "hero", hidden: false });
  blocks.push({ id: SYS_STATUS, type: "vehicle_status", hidden: false });
  return dedupeSystemBlocks(blocks);
}

function filterForDashboard(blocks, features) {
  return blocks.filter((b) => {
    if (b.hidden) return false;
    if (b.type === "hero" && !featureOn(features, "home_show_hero")) return false;
    if (b.type === "vehicle_status" && !featureOn(features, "home_show_status")) return false;
    if (b.type === "carousel" && (!b.items || !b.items.length)) return false;
    return true;
  });
}

function getDashboardBlocksForHome(layout, features) {
  return filterForDashboard(blocksFromLayout(layout || {}), features || {});
}

module.exports = {
  getDashboardBlocksForHome,
};
