import { Button, Empty, Spin, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

type EmptyStateProps = {
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否出错 */
  error?: string | null;
  /** 是否有数据（true=children, false=空状态） */
  hasData?: boolean;
  /** 空状态描述 */
  emptyText?: string;
  /** 空状态图标 */
  emptyIcon?: React.ReactNode;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 子组件 */
  children?: React.ReactNode;
};

/**
 * 通用页面状态容器：统一处理 Loading / Error / Empty / Normal 四种状态
 */
export function PageState({
  loading = false,
  error = null,
  hasData = true,
  emptyText = "暂无数据",
  emptyIcon,
  onRefresh,
  children,
}: EmptyStateProps) {
  // 加载中
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 240 }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Typography.Text type="danger">{error}</Typography.Text>
            </div>
          }
        >
          {onRefresh ? (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              重试
            </Button>
          ) : null}
        </Empty>
      </div>
    );
  }

  // 空数据
  if (!hasData) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <Empty
          image={emptyIcon || Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyText}
        />
      </div>
    );
  }

  // 正常渲染
  return <>{children}</>;
}
