import { Input, Modal, Typography } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { useRef, useState } from "react";
import type { PageEdit } from "../miniapp-page-types";
import { updateEditString, updateNavigationTitle } from "./updateEdits";

/** 命中区加大，避免点到外层「跳转子页」；表单区用 data 选择器忽略导航 */
export const MINIAPP_EDIT_HIT = "data-miniapp-edit-hit";

const baseHit: CSSProperties = {
  cursor: "pointer",
  borderBottom: "1px dashed rgba(79, 70, 229, 0.45)",
  boxSizing: "border-box",
  borderRadius: 4,
  transition: "background 0.15s ease",
};

type EditableStringProps = {
  route: string;
  stringKey: string;
  label: string;
  fallback: string;
  edits: PageEdit[];
  onEditsChange: (next: PageEdit[]) => void;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  /** icon：单字图标块，扩大可点区域 */
  variant?: "text" | "icon";
};

export function EditableString(props: EditableStringProps) {
  const { route, stringKey, label, fallback, edits, onEditsChange, multiline, variant = "text" } = props;
  const page = edits.find((e) => e.route === route);
  const row = page?.stringRows.find((r) => r.key === stringKey);
  const stored = row?.value ?? "";
  const display = stored.trim() ? stored : fallback;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(stored);
  const taRef = useRef<TextAreaRef>(null);

  const openModal = () => {
    setDraft(row?.value ?? "");
    setOpen(true);
  };

  const apply = () => {
    onEditsChange(updateEditString(edits, route, stringKey, draft));
    setOpen(false);
  };

  const shown = display.trim() || fallback.trim();
  const content = shown || (
    <span style={{ color: "#94a3b8", fontSize: 12, borderBottom: "1px dashed #cbd5e1" }}>点击填写</span>
  );

  const hitArea: CSSProperties =
    variant === "icon"
      ? {
          ...baseHit,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 32,
          minHeight: 32,
          padding: "2px 10px",
          lineHeight: 1.2,
          borderBottom: "none",
          outline: "1px dashed rgba(79, 70, 229, 0.45)",
          outlineOffset: 1,
        }
      : {
          ...baseHit,
          display: "inline-flex",
          alignItems: "center",
          minHeight: 28,
          padding: "4px 6px",
          margin: "-4px -4px",
        };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className={props.className}
        {...{ [MINIAPP_EDIT_HIT]: "1" }}
        style={{ ...hitArea, ...props.style }}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          openModal();
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLSpanElement).style.background = "rgba(79, 70, 229, 0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLSpanElement).style.background = "transparent";
        }}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openModal();
          }
        }}
        title="点击修改（右侧表单可批量改）"
      >
        {content}
      </span>
      <Modal
        title={label}
        open={open}
        onOk={apply}
        onCancel={() => setOpen(false)}
        destroyOnClose
        okText="确定"
        width={420}
        zIndex={1200}
        maskClosable
        centered
        afterOpenChange={(next) => {
          if (next) {
            window.setTimeout(() => taRef.current?.focus(), 50);
          }
        }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
          不填则用小程序默认：{fallback || "（无）"}
        </Typography.Paragraph>
        <Input.TextArea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={multiline === false ? 2 : 4}
          placeholder="留空表示用默认"
        />
      </Modal>
    </>
  );
}

type EditableNavTitleProps = {
  route: string;
  edits: PageEdit[];
  onEditsChange: (next: PageEdit[]) => void;
};

export function EditableNavTitle(props: EditableNavTitleProps) {
  const { route, edits, onEditsChange } = props;
  const page = edits.find((e) => e.route === route);
  const title = page?.navigationBarTitle?.trim() || page?.route || "";

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(title);

  const openModal = () => {
    setDraft(page?.navigationBarTitle ?? "");
    setOpen(true);
  };

  const apply = () => {
    onEditsChange(updateNavigationTitle(edits, route, draft));
    setOpen(false);
  };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        {...{ [MINIAPP_EDIT_HIT]: "1" }}
        style={{
          ...baseHit,
          fontSize: 17,
          fontWeight: 600,
          color: "#0f172a",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "inline-block",
          padding: "6px 8px",
          margin: "-6px -8px",
        }}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          openModal();
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLSpanElement).style.background = "rgba(79, 70, 229, 0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLSpanElement).style.background = "transparent";
        }}
        title="点击修改顶部标题（右侧表单也可改）"
      >
        {title}
      </span>
      <Modal
        title="顶部标题"
        open={open}
        onOk={apply}
        onCancel={() => setOpen(false)}
        destroyOnClose
        okText="确定"
        zIndex={1200}
        maskClosable
        centered
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="标题" />
      </Modal>
    </>
  );
}
