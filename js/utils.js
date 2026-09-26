/* =========================================================
   utils.js
   دوال مساعدة عامة تُستخدم في أكثر من مكان بالمشروع
   ========================================================= */

const Utils = {
  /* تاريخ اليوم بصيغة YYYY-MM-DD (حسب توقيت الجهاز) */
  todayStr() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  },

  /* تحويل أي تاريخ ISO إلى YYYY-MM-DD */
  toDateStr(isoString) {
    if (!isoString) return "";
    return isoString.slice(0, 10);
  },

  /* عرض وقت مقروء بالعربي مثل 03:45 م */
  formatTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  },

  /* عرض تاريخ مقروء مثل 25 سبتمبر */
  formatDateReadable(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  },

  /* تنسيق رقم كعملة (جنيه) مع فواصل الآلاف */
  formatMoney(num) {
    const n = Number(num) || 0;
    return n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " جنيه";
  },

  /* تنظيف نص من الفراغات الزائدة */
  clean(str) {
    return (str || "").toString().trim();
  },

  /* بناء عنوان مختصر من بيانات الأوردر لعرضه في الجداول والبطاقات */
  buildAddress(order) {
    const parts = [
      order.area,
      order.street,
      order.buildingName && ("عمارة " + order.buildingName),
      order.buildingNumber && ("رقم " + order.buildingNumber),
      order.floor && ("الدور " + order.floor),
      order.apartment && ("شقة " + order.apartment),
    ].filter(Boolean);
    return parts.join(" - ");
  },

  /* تلوين شارة الحالة حسب نوعها */
  statusClass(status) {
    const map = {
      "جديد": "status-new",
      "جاري التجهيز": "status-preparing",
      "جاهز": "status-ready",
      "مع الدليفري": "status-with-delivery",
      "تم التسليم": "status-delivered",
      "ملغي": "status-cancelled",
    };
    return map[status] || "status-new";
  },

  /* إنشاء عنصر HTML من نص Template بسرعة */
  el(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  },

  /* منع الحقن عند عرض نصوص المستخدم داخل HTML */
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  },

  /* إظهار Toast إشعار بسيط أعلى الشاشة */
  toast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = this.el(`<div class="toast toast-${type}">${this.escapeHtml(message)}</div>`);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  },

  /* تأخير بسيط لمنع تنفيذ البحث مع كل حرف (debounce) */
  debounce(fn, delay = 150) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /* تنزيل نص كملف (يُستخدم في تصدير النسخة الاحتياطية) */
  downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
