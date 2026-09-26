/* =========================================================
   reports.js
   حساب ملخص/تقرير اليوم (يُستخدم في الداشبورد والتقارير)
   ========================================================= */

const Reports = {
  /* ملخص كامل ليوم معين */
  getDailySummary(dateStr) {
    const targetDate = dateStr || Utils.todayStr();
    const dayOrders = Orders.filterByDate(Storage.getOrders(), targetDate);

    const countByStatus = {};
    ORDER_STATUS_LIST.forEach((s) => (countByStatus[s] = 0));
    dayOrders.forEach((o) => {
      countByStatus[o.status] = (countByStatus[o.status] || 0) + 1;
    });

    // الأوردرات الملغاة لا تُحتسب ضمن الإجماليات المالية
    const billableOrders = dayOrders.filter((o) => o.status !== ORDER_STATUS.CANCELLED);

    const totalInvoices = billableOrders.reduce((sum, o) => sum + (o.invoiceAmount || 0), 0);
    const totalFees = billableOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    return {
      date: targetDate,
      totalOrders: dayOrders.length,
      newCount: countByStatus[ORDER_STATUS.NEW],
      preparingCount: countByStatus[ORDER_STATUS.PREPARING],
      readyCount: countByStatus[ORDER_STATUS.READY],
      withDeliveryCount: countByStatus[ORDER_STATUS.WITH_DELIVERY],
      deliveredCount: countByStatus[ORDER_STATUS.DELIVERED],
      cancelledCount: countByStatus[ORDER_STATUS.CANCELLED],
      totalInvoices,
      totalFees,
      net: totalInvoices - totalFees,
    };
  },
};
