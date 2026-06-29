/**
 * 演示：邀请上下级、合作商/商家身份、超管改绑
 * 正式环境全部由服务端校验与持久化
 */

const auth = require("./auth-store.js");

const UPLINE_KEY = "ev_referral_upline";
const ROLES_KEY = "ev_account_roles";
const PORTAL_KEY = "ev_portal_mode";

/** 演示超管手机号（仅此号可进「绑定管理」修改他人上下级/车牌） */
const SUPER_ADMIN_PHONES = ["19900000000"];

function normalizePhone(p) {
  return auth.normalizePhone(p);
}

function readUplines() {
  return wx.getStorageSync(UPLINE_KEY) || {};
}

function writeUplines(obj) {
  wx.setStorageSync(UPLINE_KEY, obj);
}

function readRoles() {
  return wx.getStorageSync(ROLES_KEY) || {};
}

function writeRoles(obj) {
  wx.setStorageSync(ROLES_KEY, obj);
}

function isSuperAdmin(phone) {
  const p = normalizePhone(phone);
  return p && SUPER_ADMIN_PHONES.indexOf(p) >= 0;
}

function getRoles(phone) {
  const p = normalizePhone(phone);
  if (!p) return { partner: false, merchant: false };
  const all = readRoles();
  const r = all[p] || {};
  return {
    partner: !!r.partner,
    merchant: !!r.merchant,
  };
}

function setPartnerApproved(phone, approved) {
  const p = normalizePhone(phone);
  if (!p) return;
  const all = readRoles();
  if (!all[p]) all[p] = {};
  all[p].partner = !!approved;
  writeRoles(all);
}

function setMerchantApproved(phone, approved) {
  const p = normalizePhone(phone);
  if (!p) return;
  const all = readRoles();
  if (!all[p]) all[p] = {};
  all[p].merchant = !!approved;
  writeRoles(all);
}

/** @returns {{ inviterPhone: string, plate: string, at: string } | null} */
function getUpline(phone) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const all = readUplines();
  return all[p] || null;
}

/**
 * 被邀请人首次绑定上级（手机号+车牌演示字段，绑定后不可自行修改）
 */
function bindReferral(inviteePhone, inviterPhone, plate) {
  const pe = normalizePhone(inviteePhone);
  const pi = normalizePhone(inviterPhone);
  const plt = String(plate || "")
    .trim()
    .toUpperCase();
  if (!pe || !pi || !plt) return { ok: false, reason: "请填写完整手机号与车牌" };
  if (pe === pi) return { ok: false, reason: "不能绑定自己为上级" };
  const all = readUplines();
  if (all[pe] && all[pe].locked) {
    return { ok: false, reason: "您已绑定邀请关系，不可更改（需超管处理）" };
  }
  const pad = () => {
    const d = new Date();
    const z = (n) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
  };
  /** 邀请人为商家账号时标记，不计入合作商业绩（拓客用户） */
  const invRoles = getRoles(pi);
  const inviteKind = invRoles.merchant ? "merchant" : "";
  all[pe] = {
    inviterPhone: pi,
    plate: plt,
    at: pad(),
    locked: true,
    inviteKind,
  };
  writeUplines(all);
  return { ok: true };
}

/** 超管修改绑定 */
function superAdminSetReferral(inviteePhone, inviterPhone, plate, operatorPhone) {
  if (!isSuperAdmin(operatorPhone)) return { ok: false, reason: "无超管权限" };
  const pe = normalizePhone(inviteePhone);
  const pi = normalizePhone(inviterPhone);
  const plt = String(plate || "")
    .trim()
    .toUpperCase();
  if (!pe || !pi || !plt) return { ok: false, reason: "信息不完整" };
  const all = readUplines();
  const pad = () => {
    const d = new Date();
    const z = (n) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
  };
  all[pe] = { inviterPhone: pi, plate: plt, at: pad(), locked: true };
  writeUplines(all);
  return { ok: true };
}

function buildSystemInvitePath(inviterPhone) {
  const p = normalizePhone(inviterPhone);
  if (!p) return "";
  return `/pages/invite-system/invite-system?inv=${encodeURIComponent(p)}`;
}

function getPortalMode() {
  return wx.getStorageSync(PORTAL_KEY) || "user";
}

function setPortalMode(mode) {
  wx.setStorageSync(PORTAL_KEY, mode === "partner" || mode === "merchant" || mode === "user" ? mode : "user");
}

module.exports = {
  SUPER_ADMIN_PHONES,
  normalizePhone,
  isSuperAdmin,
  getRoles,
  setPartnerApproved,
  setMerchantApproved,
  getUpline,
  bindReferral,
  superAdminSetReferral,
  buildSystemInvitePath,
  getPortalMode,
  setPortalMode,
  readUplines,
};
