import type { MiniappHomeBlock, MiniappHomeLayout } from "../types/gatewayStore";

const SYS_WELCOME = "blk_welcome_tip";
const SYS_HERO = "blk_hero";
const SYS_STATUS = "blk_vehicle_status";

/** 与 device-gateway defaultMiniappHomeLayout 演示数据一致（含 blocks） */
export function defaultMiniappHomeLayout(): MiniappHomeLayout {
  const demoCarousel = [
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
  const demoAd = {
    id: "demo_a1",
    imageUrl: "https://picsum.photos/seed/evad1/700/120",
    title: "广告位 · 可配置跳转",
    link: "",
    variant: "banner" as const,
  };
  const blocks: MiniappHomeBlock[] = [
    { id: SYS_WELCOME, type: "welcome_tip" },
    { id: "blk_carousel_1", type: "carousel", items: demoCarousel },
    { ...demoAd, type: "ad" as const },
    { id: SYS_HERO, type: "hero" },
    { id: SYS_STATUS, type: "vehicle_status" },
  ];
  return {
    blocks,
    carouselEnabled: true,
    carousel: demoCarousel,
    adBlocks: [demoAd],
  };
}
