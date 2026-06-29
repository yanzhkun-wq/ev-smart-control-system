import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { gatewayFetch, getApiBase, setApiBasePersisted } from "../api/client";
import type { StoreShape } from "../types/gatewayStore";
import { buildUiDeviceRows, type UiDeviceRow } from "../utils/deviceRows";

export type TerminalsResponse = {
  binds: Array<{
    terminalPhone: string;
    plate: string;
    note?: string;
    online: boolean;
    last: unknown;
  }>;
  onlineSockets: Array<{ phoneKey: string; remote: string }>;
};

export type AdminGatewayContextValue = {
  apiBase: string;
  setApiBase: (url: string) => void;
  store: StoreShape | null;
  terminals: TerminalsResponse | null;
  deviceRows: UiDeviceRow[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  refresh: () => Promise<void>;
  saveStore: (next: StoreShape) => Promise<void>;
};

const AdminGatewayContext = createContext<AdminGatewayContextValue | null>(null);

export function AdminGatewayProvider({ children }: { children: React.ReactNode }) {
  const [apiBase, setApiBaseState] = useState(() => getApiBase());
  const [store, setStore] = useState<StoreShape | null>(null);
  const [terminals, setTerminals] = useState<TerminalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const setApiBase = useCallback((url: string) => {
    const u = url.replace(/\/$/, "");
    setApiBasePersisted(u);
    setApiBaseState(u);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await gatewayFetch<{ ok: boolean }>("/health").catch(() => null);
      setConnected(!!h?.ok);
      const [st, t] = await Promise.all([
        gatewayFetch<StoreShape>("/api/store"),
        gatewayFetch<TerminalsResponse>("/api/terminals"),
      ]);
      setStore(st);
      setTerminals(t);
    } catch (e) {
      setError(String(e));
      setConnected(false);
      setStore(null);
      setTerminals(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveStore = useCallback(
    async (next: StoreShape) => {
      await gatewayFetch("/api/store", { method: "PUT", body: JSON.stringify(next) });
      await refresh();
    },
    [refresh],
  );

  const deviceRows = useMemo(() => {
    if (!store || !terminals) return [];
    return buildUiDeviceRows(store, terminals.binds as Parameters<typeof buildUiDeviceRows>[1]);
  }, [store, terminals]);

  const value = useMemo<AdminGatewayContextValue>(
    () => ({
      apiBase,
      setApiBase,
      store,
      terminals,
      deviceRows,
      loading,
      error,
      connected,
      refresh,
      saveStore,
    }),
    [apiBase, setApiBase, store, terminals, deviceRows, loading, error, connected, refresh, saveStore],
  );

  return <AdminGatewayContext.Provider value={value}>{children}</AdminGatewayContext.Provider>;
}

export function useAdminGateway(): AdminGatewayContextValue {
  const ctx = useContext(AdminGatewayContext);
  if (!ctx) throw new Error("useAdminGateway must be used within AdminGatewayProvider");
  return ctx;
}
