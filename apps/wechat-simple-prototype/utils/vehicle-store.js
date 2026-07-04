/**
 * 多车存储：演示本机；正式环境由账号同步
 * ownerPhone：主账号手机号，用于多用户演示隔离
 */

const auth = require("./auth-store.js");

const STORAGE_VEHICLES = "ev_vehicles";
const STORAGE_CURRENT = "ev_current_vid";

function readAll() {
  return wx.getStorageSync(STORAGE_VEHICLES) || [];
}

function writeAll(list) {
  wx.setStorageSync(STORAGE_VEHICLES, list);
}

function listForSession(session) {
  const list = readAll();
  if (!session || !session.phone) return list;
  const p = auth.normalizePhone(session.phone);
  if (!p) return list;
  return list.filter((v) => !v.ownerPhone || v.ownerPhone === p);
}

function getCurrentVehicleForSession(session) {
  const visible = listForSession(session);
  const id = wx.getStorageSync(STORAGE_CURRENT);
  let v = visible.find((x) => x.id === id);
  if (!v && visible.length) {
    v = visible[0];
    wx.setStorageSync(STORAGE_CURRENT, v.id);
  }
  return v || null;
}

function findByOwnerCodePlate(ownerPhone, code, plate) {
  const p = auth.normalizePhone(ownerPhone);
  const c = String(code || "").trim();
  const pl = String(plate || "")
    .trim()
    .toUpperCase();
  if (!p || !c || !pl) return null;
  return readAll().find(
    (v) => v.ownerPhone === p && v.code === c && String(v.plate).toUpperCase() === pl
  );
}

/** 更新车辆备注 */
function updateNote(id, note) {
  const list = readAll();
  const idx = list.findIndex((v) => v.id === id);
  if (idx >= 0) {
    list[idx].note = note;
    writeAll(list);
  }
}

/** 删除车辆 */
function remove(id) {
  const list = readAll();
  writeAll(list.filter((v) => v.id !== id));
  // 如果删除的是当前车辆，清除 current
  if (wx.getStorageSync(STORAGE_CURRENT) === id) {
    wx.removeStorageSync(STORAGE_CURRENT);
  }
}

module.exports = {
  STORAGE_VEHICLES,
  STORAGE_CURRENT,
  readAll,
  writeAll,
  listForSession,
  getCurrentVehicleForSession,
  findByOwnerCodePlate,
  updateNote,
  remove,
};
