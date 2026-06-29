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

module.exports = {
  STORAGE_VEHICLES,
  STORAGE_CURRENT,
  readAll,
  writeAll,
  listForSession,
  getCurrentVehicleForSession,
  findByOwnerCodePlate,
};
