import { App, Button, Card, Col, Form, Input, InputNumber, Row, Space, Table, Tag, Tree, Typography } from "antd";
import type { TreeDataNode } from "antd";
import { useEffect, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { AdminUserRow, OrgTreeNode, StoreShape } from "../types/gatewayStore";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";

export type FleetPageProps = { embedded?: boolean };

export function FleetPage({ embedded = false }: FleetPageProps = {}) {
  const { message } = App.useApp();
  const { store, saveStore } = useAdminGateway();
  const [userOpen, setUserOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [userForm] = Form.useForm();
  const [orgJson, setOrgJson] = useState("");

  const users = store?.admin?.fleetUsers ?? [];
  const orgTree = store?.admin?.orgTree ?? [];

  useEffect(() => {
    if (!userOpen) return;
    if (editing) userForm.setFieldsValue(editing);
    else {
      userForm.resetFields();
      userForm.setFieldsValue({ key: `u-${Date.now()}`, role: "车队长", devices: 0 });
    }
  }, [userOpen, editing, userForm]);

  const persistUsers = async (list: AdminUserRow[]) => {
    if (!store) return;
    const s: StoreShape = JSON.parse(JSON.stringify(store));
    s.admin = s.admin ?? {};
    s.admin.fleetUsers = list;
    await saveStore(s);
  };

  const saveOrg = async () => {
    if (!store) return;
    let parsed: OrgTreeNode[];
    try {
      parsed = JSON.parse(orgJson) as OrgTreeNode[];
      if (!Array.isArray(parsed)) throw new Error("须为数组");
    } catch (e) {
      message.error(`车队树 JSON 无效：${String(e)}`);
      return;
    }
    const s: StoreShape = JSON.parse(JSON.stringify(store));
    s.admin = s.admin ?? {};
    s.admin.orgTree = parsed;
    try {
      await saveStore(s);
      message.success("车队树已保存");
      setOrgOpen(false);
    } catch (e) {
      message.error(String(e));
    }
  };

  const onUserFinish = async (v: Record<string, unknown>) => {
    const row: AdminUserRow = {
      key: String(v.key ?? ""),
      name: String(v.name ?? ""),
      role: String(v.role ?? ""),
      phone: String(v.phone ?? ""),
      fleet: String(v.fleet ?? ""),
      devices: Number(v.devices) || 0,
    };
    const list = [...users];
    const idx = list.findIndex((x) => x.key === row.key);
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    try {
      await persistUsers(list);
      message.success("已保存");
      setUserOpen(false);
      setEditing(null);
    } catch (e) {
      message.error(String(e));
    }
  };

  const removeUser = async (k: string) => {
    await persistUsers(users.filter((x) => x.key !== k));
    message.success("已删除");
  };

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            车队与账号
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            用户表在 <Typography.Text code>admin.fleetUsers</Typography.Text>；组织架构在 <Typography.Text code>admin.orgTree</Typography.Text>{" "}
            （Ant Tree 数据结构 JSON 数组）。
          </Typography.Paragraph>
        </>
      ) : null}

      <Row gutter={16}>
        <Col xs={24}>
          <Card size="small" title="用户与角色" style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  setUserOpen(true);
                }}
              >
                新建用户
              </Button>
            </Space>
            <Table
              rowKey="key"
              dataSource={users}
              pagination={false}
              columns={[
                { title: "姓名", dataIndex: "name" },
                {
                  title: "角色",
                  dataIndex: "role",
                  render: (r: string) => <Tag color={r.includes("超级") ? "red" : "blue"}>{r}</Tag>,
                },
                { title: "手机", dataIndex: "phone" },
                { title: "所属车队", dataIndex: "fleet" },
                { title: "可见终端数", dataIndex: "devices", width: 120 },
                {
                  title: "操作",
                  key: "op",
                  width: 160,
                  render: (_, r) => (
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setEditing(r);
                          setUserOpen(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() =>
                          void doubleConfirmDelete({
                            firstTitle: `删除用户「${r.name}」？`,
                            firstContent: `手机 ${r.phone || "—"}，角色 ${r.role || "—"}。删除后立即写入网关。`,
                            onDelete: () => removeUser(r.key),
                          })
                        }
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={10}>
          <Card
            size="small"
            title="车队树"
            extra={
              <Button
                size="small"
                onClick={() => {
                  setOrgJson(JSON.stringify(orgTree, null, 2));
                  setOrgOpen(true);
                }}
              >
                编辑 JSON
              </Button>
            }
          >
            <Tree defaultExpandAll treeData={orgTree as TreeDataNode[]} />
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card size="small" title="说明">
            <Typography.Paragraph>
              所有字段通过网关 HTTP 写入同一 JSON 文件，便于未上独立账号服务前在管理端统一改数。
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      {userOpen && (
        <Card size="small" title={editing ? "编辑用户" : "新建用户"} style={{ marginTop: 16 }}>
          <Form form={userForm} layout="vertical" style={{ maxWidth: 480 }} onFinish={onUserFinish}>
            <Form.Item name="key" label="key" rules={[{ required: true }]}>
              <Input disabled={!!editing} />
            </Form.Item>
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="role" label="角色" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="手机" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="fleet" label="所属车队" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="devices" label="可见终端数" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setUserOpen(false);
                    setEditing(null);
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {orgOpen && (
        <Card size="small" title="编辑车队树 JSON" style={{ marginTop: 16 }}>
          <Input.TextArea rows={14} value={orgJson} onChange={(e) => setOrgJson(e.target.value)} />
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" onClick={() => void saveOrg()}>
              保存
            </Button>
            <Button onClick={() => setOrgOpen(false)}>取消</Button>
          </Space>
        </Card>
      )}
    </div>
  );
}
