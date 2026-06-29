/** 小程序页面后台编辑结构（与网关 store 对齐） */

export type StringRow = { key: string; value: string; hint: string };

export type PageEdit = {
  route: string;
  navigationBarTitle: string;
  enabled: boolean;
  adminNote: string;
  stringRows: StringRow[];
};
