import type { ReactNode } from "react";
import { Modal } from "antd";

export type DoubleConfirmDeleteOptions = {
  firstTitle?: string;
  firstContent?: ReactNode;
  secondTitle?: string;
  secondContent?: ReactNode;
  onDelete: () => void | Promise<void>;
};

/**
 * 连续两次 Modal 确认后再执行删除，降低误触风险。
 * @returns 是否在第二次确认后执行了 onDelete
 */
export async function doubleConfirmDelete(opts: DoubleConfirmDeleteOptions): Promise<boolean> {
  const firstTitle = opts.firstTitle ?? "确定要删除吗？";
  const firstContent = opts.firstContent ?? "删除后通常不可恢复，请谨慎操作。";
  const secondTitle = opts.secondTitle ?? "再次确认删除";
  const secondContent =
    opts.secondContent ?? "请再次确认是否删除。误删可在未保存到网关前撤销本页修改，或从备份恢复。";

  const pass1 = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: firstTitle,
      content: firstContent,
      okText: "继续",
      cancelText: "取消",
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
  if (!pass1) return false;

  const pass2 = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: secondTitle,
      content: secondContent,
      okText: "确定删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
  if (!pass2) return false;

  await opts.onDelete();
  return true;
}
