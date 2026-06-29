import {

  Alert,

  App,

  Button,

  Card,

  Collapse,

  Select,

  Space,

  Switch,

  Table,

  Tag,

  Tooltip,

  Typography,

} from "antd";

import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useAdminGateway } from "../context/AdminGatewayContext";

import { fallbackMiniappPages } from "../constants/miniappPagesFallback";

import { MINIAPP_STRING_PRESETS } from "../constants/miniappStringPresets";

import {

  MINIAPP_FEATURE_DEFS,

  mergeMiniappFeaturesClient,

  miniappFeaturesSignature,

  miniappPagesConfigSignature,

} from "../constants/miniappFeatures";

import { MINIAPP_GROUP_LABEL } from "../constants/miniappPageGroups";

import type { MiniappHomeLayout, MiniappPageConfig, StoreShape } from "../types/gatewayStore";

import type { PageEdit, StringRow } from "../miniapp-page-types";

import { MiniappCurrentPageStringsPanel } from "../miniapp-visual/MiniappCurrentPageStringsPanel";

import { MiniappVisualSimulator } from "../miniapp-visual/MiniappVisualSimulator";

import { togglePageEnabled } from "../miniapp-visual/updateEdits";

import type { HomeScene } from "../miniapp-visual/screens/HomeVisual";

import { R_HOME } from "../miniapp-visual/screens/HomeVisual";

import { HomeLayoutBlocksEditor } from "./HomeLayoutBlocksEditor";

import { isMiniappHomeLayoutEditAllowed } from "../utils/miniappUiPolicy";

import { normalizeMiniappHomeLayout } from "../utils/normalizeMiniappHomeLayout";

import styles from "./miniappPagesPage.module.css";



function presetsForRoute(route: string): { key: string; hint: string }[] {

  return (MINIAPP_STRING_PRESETS[route] ?? []).map((p) => ({ key: p.key, hint: p.label }));

}



function stringsToRows(strings: Record<string, string> | undefined, route: string): StringRow[] {

  const presets = presetsForRoute(route);

  const m = new Map(Object.entries(strings ?? {}));

  const out: StringRow[] = [];

  for (const p of presets) {

    out.push({

      key: p.key,

      value: m.get(p.key) ?? "",

      hint: p.hint,

    });

    m.delete(p.key);

  }

  for (const [key, value] of m) {

    out.push({ key, value, hint: "自定义" });

  }

  return out;

}



function rowsToStrings(rows: StringRow[]): Record<string, string> | undefined {

  const o: Record<string, string> = {};

  for (const r of rows) {

    const k = r.key.trim();

    if (!k) continue;

    o[k] = r.value;

  }

  return Object.keys(o).length ? o : undefined;

}



function toPageEdits(list: MiniappPageConfig[]): PageEdit[] {

  return list.map((p) => ({

    route: p.route,

    navigationBarTitle: p.navigationBarTitle,

    enabled: p.enabled !== false,

    adminNote: p.adminNote ?? "",

    stringRows: stringsToRows(p.strings, p.route),

  }));

}



function pageEditsToMiniapp(edits: PageEdit[]): MiniappPageConfig[] {

  return edits.map((e) => ({

    route: e.route,

    navigationBarTitle: e.navigationBarTitle.trim() || e.route,

    enabled: e.enabled !== false,

    strings: rowsToStrings(e.stringRows),

    adminNote: e.adminNote.trim() || undefined,

  }));

}



export function MiniappPagesPage() {

  const navigate = useNavigate();

  const { message } = App.useApp();

  const { store, saveStore, connected } = useAdminGateway();

  const [edits, setEdits] = useState<PageEdit[]>(() => toPageEdits(fallbackMiniappPages()));

  const [featureEdits, setFeatureEdits] = useState<Record<string, boolean>>(() =>

    mergeMiniappFeaturesClient(undefined),

  );

  const [homeLayoutDraft, setHomeLayoutDraft] = useState<MiniappHomeLayout>(() =>

    normalizeMiniappHomeLayout(undefined),

  );

  const [homeScene, setHomeScene] = useState<HomeScene>("dashboard");

  const [activeRoute, setActiveRoute] = useState<string>(R_HOME);



  const pagesSigRef = useRef("");

  const featuresSigRef = useRef("");

  const homeSigRef = useRef("");



  const sourceList = useMemo(() => {

    if (store?.admin?.miniappPages?.length) return store.admin.miniappPages;

    return fallbackMiniappPages();

  }, [store?.admin?.miniappPages]);



  const homeFromStore = store?.admin?.miniappHomeLayout;



  useEffect(() => {

    const sig = miniappPagesConfigSignature(sourceList);

    if (sig === pagesSigRef.current) return;

    pagesSigRef.current = sig;

    setEdits(toPageEdits(sourceList));

  }, [sourceList]);



  useEffect(() => {

    const sig = miniappFeaturesSignature(store?.admin?.miniappFeatures);

    if (sig === featuresSigRef.current) return;

    featuresSigRef.current = sig;

    setFeatureEdits(mergeMiniappFeaturesClient(store?.admin?.miniappFeatures));

  }, [store?.admin?.miniappFeatures]);



  useEffect(() => {

    const normalized = normalizeMiniappHomeLayout(homeFromStore);

    const sig = JSON.stringify(normalized);

    if (sig === homeSigRef.current) return;

    homeSigRef.current = sig;

    setHomeLayoutDraft(normalized);

  }, [homeFromStore]);



  const activePage = edits.find((e) => e.route === activeRoute);

  const activeEnabled = activePage ? activePage.enabled !== false : true;



  const allowHomeLayoutEdit = isMiniappHomeLayoutEditAllowed(store?.admin?.miniappUiPolicy);



  const persistedPagesSnapshot = useMemo(

    () => (store?.admin?.miniappPages?.length ? store.admin.miniappPages : fallbackMiniappPages()),

    [store?.admin?.miniappPages],

  );



  const dirty = useMemo(() => {

    const pagesDirty =

      miniappPagesConfigSignature(pageEditsToMiniapp(edits)) !==

      miniappPagesConfigSignature(persistedPagesSnapshot);

    const featDirty =

      miniappFeaturesSignature(featureEdits) !== miniappFeaturesSignature(store?.admin?.miniappFeatures);

    const homePersisted = normalizeMiniappHomeLayout(store?.admin?.miniappHomeLayout);

    const homeDirty = JSON.stringify(homeLayoutDraft) !== JSON.stringify(homePersisted);

    return pagesDirty || featDirty || homeDirty;

  }, [

    edits,

    featureEdits,

    homeLayoutDraft,

    persistedPagesSnapshot,

    store?.admin?.miniappFeatures,

    store?.admin?.miniappHomeLayout,

  ]);



  const featureTableData = useMemo(

    () =>

      MINIAPP_FEATURE_DEFS.map((d) => ({

        key: d.key,

        group: MINIAPP_GROUP_LABEL[d.group],

        label: d.label,

        hint: d.hint,

      })),

    [],

  );



  const resetDraftFromStore = () => {

    setEdits(toPageEdits(sourceList));

    setFeatureEdits(mergeMiniappFeaturesClient(store?.admin?.miniappFeatures));

    setHomeLayoutDraft(normalizeMiniappHomeLayout(store?.admin?.miniappHomeLayout));

    message.info("已恢复为当前网关上的已保存配置。");

  };



  const save = async () => {

    const keysSeen = new Set<string>();

    for (const e of edits) {

      for (const r of e.stringRows) {

        const k = r.key.trim();

        if (!k) continue;

        const id = `${e.route}::${k}`;

        if (keysSeen.has(id)) {

          message.error(`页面「${e.navigationBarTitle || e.route}」有重复项，请联系技术人员。`);

          return;

        }

        keysSeen.add(id);

      }

    }

    if (!store) {

      message.warning("请先连接网关后再保存。");

      return;

    }

    try {

      const next: StoreShape = JSON.parse(JSON.stringify(store));

      if (!next.admin) next.admin = {};

      next.admin.miniappPages = pageEditsToMiniapp(edits);

      next.admin.miniappFeatures = mergeMiniappFeaturesClient(featureEdits);

      next.admin.miniappHomeLayout = normalizeMiniappHomeLayout(homeLayoutDraft);

      await saveStore(next);

      message.success("已保存：文案、模块开关与首页装修将随 miniapp-ui 下发。");

    } catch (e) {

      message.error(String(e));

    }

  };



  return (

    <div>

      <div className={styles.titleBar}>

        <Typography.Title level={4} style={{ margin: 0 }}>

          小程序页面

        </Typography.Title>

        <Space wrap size="small">

          {dirty ? <Tag color="warning">未保存的草稿</Tag> : <Tag color="success">与网关一致</Tag>}

          {!connected ? (

            <Button size="small" type="default" onClick={() => navigate("/settings")}>

              连接网关

            </Button>

          ) : null}

          <Button size="small" disabled={!connected || !dirty} onClick={resetDraftFromStore}>

            撤销未保存

          </Button>

          <Tooltip title={!connected ? "请先连接设备网关后再保存" : undefined}>

            <span style={!connected ? { display: "inline-block", cursor: "not-allowed" } : undefined}>

              <Button type="primary" size="small" onClick={() => void save()} disabled={!connected}>

                保存配置

              </Button>

            </span>

          </Tooltip>

        </Space>

      </div>

      <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>

        左侧手机预览为<strong>草稿实时预览</strong>；确认无误后点「保存配置」写入网关，小程序通过{" "}

        <Typography.Text code>GET /api/miniapp-ui</Typography.Text> 拉取后才会显示。

      </Typography.Paragraph>



      {!connected ? (

        <Alert

          type="warning"

          showIcon

          banner

          style={{ marginBottom: 10, padding: "6px 12px" }}

          message="未连接网关时无法保存到服务端"

          action={

            <Button size="small" type="link" onClick={() => navigate("/settings")}>

              去设置

            </Button>

          }

        />

      ) : null}



      {dirty && connected ? (

        <Alert

          type="info"

          showIcon

          style={{ marginBottom: 10, padding: "6px 12px", fontSize: 12 }}

          message="当前修改仅在本页生效；保存前小程序端仍显示上次已保存内容。"

        />

      ) : null}

      {!allowHomeLayoutEdit && connected ? (

        <Alert

          type="warning"

          showIcon

          style={{ marginBottom: 10, padding: "6px 12px", fontSize: 12 }}

          message="网关已关闭首页装修权限（miniappUiPolicy.allowHomeLayoutEdit）。轮播与广告为只读，仍可改文案与模块开关。"

        />

      ) : null}



      <div className={styles.layout}>

        <div className={styles.simWrap}>

          <MiniappVisualSimulator

            edits={edits}

            onEditsChange={setEdits}

            homeScene={homeScene}

            onActiveRoute={setActiveRoute}

            features={featureEdits}

            homeLayout={homeLayoutDraft}

          />

        </div>



        <div className={styles.editorStack}>

          <Collapse

            size="small"

            defaultActiveKey={["decor", "strings", "features"]}

            items={[

              {

                key: "decor",

                label: "首页布局（拖拽排序）",

                styles: { body: { maxHeight: "min(65vh, 640px)", overflowY: "auto" } },

                children: (

                  <HomeLayoutBlocksEditor

                    value={homeLayoutDraft}

                    onChange={setHomeLayoutDraft}

                    disabled={!allowHomeLayoutEdit}

                  />

                ),

              },

              {

                key: "strings",

                label: "预览与文案",

                children: (

                  <>

                    <Space wrap align="center" className={styles.toolbar} size={[8, 4]}>

                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>

                        首页态

                      </Typography.Text>

                      <Select<HomeScene>

                        size="small"

                        style={{ width: 120 }}

                        value={homeScene}

                        onChange={setHomeScene}

                        options={[

                          { label: "未登录", value: "login" },

                          { label: "绑车", value: "bind" },

                          { label: "已绑车", value: "dashboard" },

                        ]}

                      />

                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>

                        当前路由启用

                      </Typography.Text>

                      <Switch

                        size="small"

                        checked={activeEnabled}

                        onChange={(on) => setEdits(togglePageEnabled(edits, activeRoute, on))}

                      />

                    </Space>

                    <MiniappCurrentPageStringsPanel

                      activeRoute={activeRoute}

                      edits={edits}

                      onEditsChange={setEdits}

                    />

                  </>

                ),

              },

              {

                key: "features",

                label: "模块开关",

                children: (

                  <Card size="small" styles={{ body: { padding: 8 } }}>

                    <Table

                      className={styles.featureTable}

                      size="small"

                      rowKey="key"

                      pagination={false}

                      dataSource={featureTableData}

                      columns={[

                        { title: "分组", dataIndex: "group", width: 118, ellipsis: true },

                        {

                          title: "项",

                          dataIndex: "label",

                          render: (_: unknown, r: (typeof featureTableData)[0]) => (

                            <div>

                              <Typography.Text style={{ fontSize: 12 }}>{r.label}</Typography.Text>

                              {r.hint ? (

                                <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 11 }}>

                                  {r.hint}

                                </Typography.Paragraph>

                              ) : null}

                            </div>

                          ),

                        },

                        {

                          title: "开",

                          key: "on",

                          width: 56,

                          align: "center" as const,

                          render: (_: unknown, r: (typeof featureTableData)[0]) => (

                            <Switch

                              size="small"

                              checked={featureEdits[r.key] !== false}

                              onChange={(on) => setFeatureEdits((prev) => ({ ...prev, [r.key]: on }))}

                            />

                          ),

                        },

                      ]}

                    />

                  </Card>

                ),

              },

            ]}

          />

        </div>

      </div>

    </div>

  );

}


