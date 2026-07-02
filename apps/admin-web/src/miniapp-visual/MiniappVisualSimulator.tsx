import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { PageEdit } from "../miniapp-page-types";
import type { MiniappHomeLayout } from "../types/gatewayStore";
import { VisualShell } from "./VisualShell";
import { FallbackVisual } from "./screens/FallbackVisual";
import { HomeVisual, R_HOME, type HomeScene } from "./screens/HomeVisual";
import { ProfileVisual, R_PROFILE } from "./screens/ProfileVisual";

export function MiniappVisualSimulator(props: {
  edits: PageEdit[];
  onEditsChange: (next: PageEdit[]) => void;
  homeScene: HomeScene;
  onActiveRoute: (route: string) => void;
  features: Record<string, boolean>;
  homeLayout: MiniappHomeLayout;
}) {
  const { edits, onEditsChange, homeScene, onActiveRoute, features, homeLayout } = props;
  const [tab, setTab] = useState<0 | 1>(0);
  const [stack, setStack] = useState<string[]>([]);

  const topRoute = stack.length ? stack[stack.length - 1]! : tab === 0 ? R_HOME : R_PROFILE;

  useEffect(() => {
    onActiveRoute(topRoute);
  }, [topRoute, onActiveRoute]);

  const push = (r: string) => setStack((s) => [...s, r]);
  const pop = () => setStack((s) => s.slice(0, -1));

  const setMainTab = (i: 0 | 1) => {
    setStack([]);
    setTab(i);
  };

  let inner: ReactNode;
  if (stack.length === 0) {
    inner =
      tab === 0 ? (
        <HomeVisual
          scene={homeScene}
          edits={edits}
          onEditsChange={onEditsChange}
          features={features}
          homeLayout={homeLayout}
        />
      ) : (
        <ProfileVisual edits={edits} onEditsChange={onEditsChange} navigate={push} features={features} />
      );
  } else {
    inner = <FallbackVisual route={topRoute} edits={edits} onEditsChange={onEditsChange} />;
  }

  return (
    <VisualShell
      navRoute={topRoute}
      edits={edits}
      onEditsChange={onEditsChange}
      showBack={stack.length > 0}
      onBack={pop}
      showTabBar={stack.length === 0}
      tab={tab}
      onTab={setMainTab}
    >
      {inner}
    </VisualShell>
  );
}
