// orderStatusMap.js
export const orderStatusMap = {
  PENDING: "待接单",
  ASSIGNED: "已接单",
  IN_TRANSIT: "配送中",
  DELIVERED: "已送达",
  COMPLETED: "已完成",
  PLATFORM_INTERVENTION: "平台介入中",
  REFUNDING: "退款中",
  REFUNDED: "已退款",
  LOCKED: "已锁定",
  PAYMENT_PENDING: "等待支付",
  PAYMENT_TIMEOUT: "支付超时",
  CANCELLED: "已取消"
};

export const deliveryServiceMap = {
  STANDARD: "互助配送",
  EXPRESS: "极速配送"
};
