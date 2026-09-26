/* =========================================================
   app.js
   المتحكم الرئيسي: التنقل بين الصفحات، الرسم، الأحداث،
   والربط بين كل الملفات السابقة (Storage / Orders / Delivery / Reports)
   ========================================================= */

const App = {
  currentView: "dashboard",
  selectedOrderIds: new Set(),
  confirmCallback: null,

  /* ================= نقطة البداية ================= */
  init() {
    Storage.seedDemoData();
    this.populateStatusFilter();
    this.bindNav();
    this.bindModals();
    this.bindOrdersView();
    this.bindDeliveryView();
    this.bindDeliveryAccountsView();
    this.bindSettingsView();
    this.bindDashboard();

    // تواريخ اليوم كقيمة افتراضية
    document.getElementById("dashboardDate").value = Utils.todayStr();
    document.getElementById("deliveryAccountsDate").value = Utils.todayStr();

    this.showView("dashboard");
    this.registerServiceWorker();
  },

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch(() => {
          /* لو فشل التسجيل (مثلاً أثناء فتح الملف مباشرة بدون سيرفر) نتجاهل بصمت */
        });
      });
    }
  },

  /* ================= التنقل بين الصفحات ================= */
  bindNav() {
    document.querySelectorAll(".nav-item, .bottom-nav-item[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => this.showView(btn.dataset.view));
    });
    document.getElementById("btnQuickAddDashboard").addEventListener("click", () => this.openOrderModal());
    document.getElementById("btnQuickAddMobile").addEventListener("click", () => this.openOrderModal());
  },

  showView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    document.getElementById("view-" + viewName).classList.remove("hidden");

    document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    document.querySelectorAll(".bottom-nav-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    if (viewName === "dashboard") this.renderDashboard();
    if (viewName === "orders") this.renderOrdersList();
    if (viewName === "delivery") this.renderDeliveryList();
    if (viewName === "delivery-accounts") this.renderDeliveryAccounts();
    if (viewName === "settings") this.renderSettings();

    window.scrollTo({ top: 0, behavior: "auto" });
  },

  /* ================= Modals عامة ================= */
  bindModals() {
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => this.closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });
    document.getElementById("btnConfirmAction").addEventListener("click", () => {
      if (typeof this.confirmCallback === "function") this.confirmCallback();
      this.closeModal("confirmModalOverlay");
    });
  },
  openModal(id) { document.getElementById(id).classList.remove("hidden"); },
  closeModal(id) { document.getElementById(id).classList.add("hidden"); },

  confirmAction(message, callback) {
    document.getElementById("confirmMessage").textContent = message;
    this.confirmCallback = callback;
    this.openModal("confirmModalOverlay");
  },

  /* =========================================================
     الداشبورد
     ========================================================= */
  bindDashboard() {
    document.getElementById("dashboardDate").addEventListener("change", () => this.renderDashboard());
  },

  renderDashboard() {
    const date = document.getElementById("dashboardDate").value || Utils.todayStr();
    const s = Reports.getDailySummary(date);

    document.getElementById("statTotalOrders").textContent = s.totalOrders;
    document.getElementById("statNew").textContent = s.newCount;
    document.getElementById("statPreparing").textContent = s.preparingCount;
    document.getElementById("statReady").textContent = s.readyCount;
    document.getElementById("statWithDelivery").textContent = s.withDeliveryCount;
    document.getElementById("statDelivered").textContent = s.deliveredCount;

    document.getElementById("sumTotalInvoices").textContent = Utils.formatMoney(s.totalInvoices);
    document.getElementById("sumTotalFees").textContent = "- " + Utils.formatMoney(s.totalFees);
    document.getElementById("sumNet").textContent = Utils.formatMoney(s.net);
  },

  /* =========================================================
     صفحة الأوردرات
     ========================================================= */
  populateStatusFilter() {
    const select = document.getElementById("statusFilter");
    ORDER_STATUS_LIST.forEach((status) => {
      const opt = document.createElement("option");
      opt.value = status;
      opt.textContent = status;
      select.appendChild(opt);
    });
  },

  bindOrdersView() {
    document.getElementById("btnAddOrder").addEventListener("click", () => this.openOrderModal());

    const debouncedRender = Utils.debounce(() => this.renderOrdersList(), 150);
    document.getElementById("searchInput").addEventListener("input", debouncedRender);
    document.getElementById("statusFilter").addEventListener("change", () => this.renderOrdersList());

    document.getElementById("selectAllCheckbox").addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rows = this.getCurrentFilteredOrders();
      this.selectedOrderIds.clear();
      if (checked) rows.forEach((o) => this.selectedOrderIds.add(o.id));
      this.renderOrdersList();
    });

    document.getElementById("btnClearSelection").addEventListener("click", () => {
      this.selectedOrderIds.clear();
      this.renderOrdersList();
    });

    document.getElementById("btnAssignDelivery").addEventListener("click", () => this.openAssignModal());
    document.getElementById("btnConfirmAssign").addEventListener("click", () => this.confirmAssignDelivery());

    document.getElementById("orderForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveOrderFromForm();
    });

    document.getElementById("assignDeliverySelect").addEventListener("change", () => this.updateAssignPreview());
  },

  getCurrentFilteredOrders() {
    const query = document.getElementById("searchInput").value;
    const status = document.getElementById("statusFilter").value;
    let orders = Orders.search(query);
    orders = Orders.filterByStatus(orders, status);
    return orders;
  },

  renderOrdersList() {
    const orders = this.getCurrentFilteredOrders();
    const persons = Delivery.getAll();

    document.getElementById("ordersEmptyState").classList.toggle("hidden", orders.length > 0);

    // ---- الجدول (Desktop) ----
    const tbody = document.getElementById("ordersTableBody");
    tbody.innerHTML = "";
    orders.forEach((o) => tbody.appendChild(this.buildOrderRow(o)));

    // ---- البطاقات (Mobile) ----
    const cardsWrap = document.getElementById("ordersCards");
    cardsWrap.innerHTML = "";
    orders.forEach((o) => cardsWrap.appendChild(this.buildOrderCard(o)));

    // ---- شريط التحديد الجماعي ----
    const count = this.selectedOrderIds.size;
    document.getElementById("bulkBar").classList.toggle("hidden", count === 0);
    document.getElementById("bulkCount").textContent = `تم تحديد ${count} أوردر`;
    document.getElementById("selectAllCheckbox").checked =
      orders.length > 0 && orders.every((o) => this.selectedOrderIds.has(o.id));

    if (persons.length === 0 && count > 0) {
      // احتياطي: لو تم حذف كل الدليفري بينما محدد أوردرات
    }
  },

  buildStatusSelect(order) {
    const select = document.createElement("select");
    select.className = "status-select";
    ORDER_STATUS_LIST.forEach((status) => {
      const opt = document.createElement("option");
      opt.value = status;
      opt.textContent = status;
      if (status === order.status) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      Orders.changeStatus(order.id, select.value);
      Utils.toast("تم تحديث حالة الأوردر");
      this.renderOrdersList();
      if (this.currentView === "dashboard") this.renderDashboard();
    });
    return select;
  },

  buildOrderRow(order) {
    const tr = document.createElement("tr");

    const tdCheck = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.selectedOrderIds.has(order.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) this.selectedOrderIds.add(order.id);
      else this.selectedOrderIds.delete(order.id);
      this.renderOrdersList();
    });
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    tr.appendChild(Utils.el(`<td class="order-number">${order.orderNumber}</td>`));
    tr.appendChild(Utils.el(`<td>${Utils.escapeHtml(order.customerName)}</td>`));
    tr.appendChild(Utils.el(`<td style="direction:ltr;text-align:right">${Utils.escapeHtml(order.phone)}</td>`));
    tr.appendChild(Utils.el(`<td class="cell-muted">${Utils.escapeHtml(Utils.buildAddress(order))}</td>`));
    tr.appendChild(Utils.el(`<td class="cell-muted">${Utils.escapeHtml(order.orderDetails)}</td>`));
    tr.appendChild(Utils.el(`<td>${Utils.formatMoney(order.invoiceAmount)}</td>`));
    tr.appendChild(Utils.el(`<td>${order.deliveryPersonName ? Utils.escapeHtml(order.deliveryPersonName) : "—"}</td>`));

    const tdStatus = document.createElement("td");
    tdStatus.appendChild(this.buildStatusSelect(order));
    tr.appendChild(tdStatus);

    tr.appendChild(Utils.el(`<td class="cell-muted">${Utils.formatTime(order.createdAt)}</td>`));

    const tdActions = document.createElement("td");
    tdActions.className = "cell-actions";
    tdActions.appendChild(this.makeIconButton("fa-eye", "عرض", () => this.openViewOrderModal(order.id)));
    tdActions.appendChild(this.makeIconButton("fa-pen", "تعديل", () => this.openOrderModal(order.id)));
    tdActions.appendChild(this.makeIconButton("fa-trash", "حذف", () => this.deleteOrder(order.id), true));
    tr.appendChild(tdActions);

    return tr;
  },

  buildOrderCard(order) {
    const card = Utils.el(`
      <div class="order-card">
        <div class="order-card-top">
          <div class="order-card-checkbox">
            <input type="checkbox" ${this.selectedOrderIds.has(order.id) ? "checked" : ""} />
            <div>
              <div class="order-card-title">${order.orderNumber} — ${Utils.escapeHtml(order.customerName)}</div>
              <div class="order-card-sub">${Utils.escapeHtml(order.phone)} · ${Utils.formatTime(order.createdAt)}</div>
            </div>
          </div>
          <span class="status-badge ${Utils.statusClass(order.status)}">${order.status}</span>
        </div>
        <div class="order-card-row"><span class="k">العنوان</span><span class="v">${Utils.escapeHtml(Utils.buildAddress(order)) || "—"}</span></div>
        <div class="order-card-row"><span class="k">تفاصيل الأوردر</span><span class="v">${Utils.escapeHtml(order.orderDetails)}</span></div>
        <div class="order-card-row"><span class="k">المبلغ</span><span class="v">${Utils.formatMoney(order.invoiceAmount)}</span></div>
        <div class="order-card-row"><span class="k">الدليفري</span><span class="v">${order.deliveryPersonName ? Utils.escapeHtml(order.deliveryPersonName) : "—"}</span></div>
        <div class="order-card-actions"></div>
      </div>
    `);

    card.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
      if (e.target.checked) this.selectedOrderIds.add(order.id);
      else this.selectedOrderIds.delete(order.id);
      this.renderOrdersList();
    });

    const actions = card.querySelector(".order-card-actions");
    const statusWrap = document.createElement("div");
    statusWrap.style.width = "100%";
    statusWrap.style.marginBottom = "8px";
    const statusSelect = this.buildStatusSelect(order);
    statusSelect.style.width = "100%";
    statusWrap.appendChild(statusSelect);
    actions.appendChild(statusWrap);

    const btnView = Utils.el(`<button class="btn btn-secondary btn-sm"><i class="fa-solid fa-eye"></i> عرض</button>`);
    btnView.addEventListener("click", () => this.openViewOrderModal(order.id));
    const btnEdit = Utils.el(`<button class="btn btn-secondary btn-sm"><i class="fa-solid fa-pen"></i> تعديل</button>`);
    btnEdit.addEventListener("click", () => this.openOrderModal(order.id));
    const btnDelete = Utils.el(`<button class="btn btn-danger btn-sm"><i class="fa-solid fa-trash"></i></button>`);
    btnDelete.addEventListener("click", () => this.deleteOrder(order.id));

    actions.appendChild(btnView);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    return card;
  },

  makeIconButton(icon, title, onClick, danger = false) {
    const btn = document.createElement("button");
    btn.className = "icon-btn" + (danger ? " danger" : "");
    btn.title = title;
    btn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    btn.addEventListener("click", onClick);
    return btn;
  },

  deleteOrder(orderId) {
    this.confirmAction("هل تريد حذف هذا الأوردر نهائيًا؟", () => {
      Orders.remove(orderId);
      this.selectedOrderIds.delete(orderId);
      Utils.toast("تم حذف الأوردر");
      this.renderOrdersList();
      if (this.currentView === "dashboard") this.renderDashboard();
    });
  },

  /* ---------- Modal: إضافة / تعديل أوردر ---------- */
  openOrderModal(orderId = null) {
    const form = document.getElementById("orderForm");
    form.reset();
    document.getElementById("orderId").value = "";

    if (orderId) {
      const order = Orders.getById(orderId);
      if (!order) return;
      document.getElementById("orderModalTitle").textContent = "تعديل الأوردر " + order.orderNumber;
      document.getElementById("orderId").value = order.id;
      document.getElementById("fCustomerName").value = order.customerName;
      document.getElementById("fPhone").value = order.phone;
      document.getElementById("fArea").value = order.area;
      document.getElementById("fStreet").value = order.street;
      document.getElementById("fBuildingName").value = order.buildingName;
      document.getElementById("fBuildingNumber").value = order.buildingNumber;
      document.getElementById("fFloor").value = order.floor;
      document.getElementById("fApartment").value = order.apartment;
      document.getElementById("fAddressDetails").value = order.addressDetails;
      document.getElementById("fOrderDetails").value = order.orderDetails;
      document.getElementById("fInvoiceAmount").value = order.invoiceAmount;
      document.getElementById("fNotes").value = order.notes;
      document.getElementById("quickAddAnotherRow").classList.add("hidden");
    } else {
      document.getElementById("orderModalTitle").textContent = "إضافة أوردر";
      document.getElementById("quickAddAnotherRow").classList.remove("hidden");
    }

    this.openModal("orderModalOverlay");
    document.getElementById("fCustomerName").focus();
  },

  saveOrderFromForm() {
    const orderId = document.getElementById("orderId").value;
    const data = {
      customerName: document.getElementById("fCustomerName").value,
      phone: document.getElementById("fPhone").value,
      area: document.getElementById("fArea").value,
      street: document.getElementById("fStreet").value,
      buildingName: document.getElementById("fBuildingName").value,
      buildingNumber: document.getElementById("fBuildingNumber").value,
      floor: document.getElementById("fFloor").value,
      apartment: document.getElementById("fApartment").value,
      addressDetails: document.getElementById("fAddressDetails").value,
      orderDetails: document.getElementById("fOrderDetails").value,
      invoiceAmount: document.getElementById("fInvoiceAmount").value,
      notes: document.getElementById("fNotes").value,
    };

    if (!data.customerName.trim() || !data.phone.trim() || !data.orderDetails.trim()) {
      Utils.toast("من فضلك أكمل الحقول المطلوبة (*)", "error");
      return;
    }

    if (orderId) {
      Orders.update(orderId, data);
      Utils.toast("تم تعديل الأوردر بنجاح");
      this.closeModal("orderModalOverlay");
    } else {
      Orders.add(data);
      Utils.toast("تم إضافة الأوردر بنجاح");
      const keepOpen = document.getElementById("quickAddAnother").checked;
      if (keepOpen) {
        document.getElementById("orderForm").reset();
        document.getElementById("quickAddAnother").checked = true;
        document.getElementById("fCustomerName").focus();
      } else {
        this.closeModal("orderModalOverlay");
      }
    }

    this.renderOrdersList();
    if (this.currentView === "dashboard") this.renderDashboard();
  },

  /* ---------- Modal: عرض تفاصيل أوردر ---------- */
  openViewOrderModal(orderId) {
    const o = Orders.getById(orderId);
    if (!o) return;
    const body = document.getElementById("viewOrderBody");
    body.innerHTML = `
      <div class="detail-row"><span class="k">رقم الأوردر</span><span class="v">${o.orderNumber}</span></div>
      <div class="detail-row"><span class="k">الحالة</span><span class="v"><span class="status-badge ${Utils.statusClass(o.status)}">${o.status}</span></span></div>
      <div class="detail-row"><span class="k">العميل</span><span class="v">${Utils.escapeHtml(o.customerName)}</span></div>
      <div class="detail-row"><span class="k">الهاتف</span><span class="v">${Utils.escapeHtml(o.phone)}</span></div>
      <div class="detail-row"><span class="k">العنوان</span><span class="v">${Utils.escapeHtml(Utils.buildAddress(o)) || "—"}</span></div>
      <div class="detail-row"><span class="k">تفاصيل العنوان</span><span class="v">${Utils.escapeHtml(o.addressDetails) || "—"}</span></div>
      <div class="detail-row"><span class="k">تفاصيل الأوردر</span><span class="v">${Utils.escapeHtml(o.orderDetails)}</span></div>
      <div class="detail-row"><span class="k">قيمة الفاتورة</span><span class="v">${Utils.formatMoney(o.invoiceAmount)}</span></div>
      <div class="detail-row"><span class="k">الدليفري</span><span class="v">${o.deliveryPersonName ? Utils.escapeHtml(o.deliveryPersonName) : "—"}</span></div>
      <div class="detail-row"><span class="k">خدمة الدليفري</span><span class="v">${o.deliveryFee ? Utils.formatMoney(o.deliveryFee) : "—"}</span></div>
      <div class="detail-row"><span class="k">ملاحظات</span><span class="v">${Utils.escapeHtml(o.notes) || "—"}</span></div>
      <div class="detail-row"><span class="k">وقت الإنشاء</span><span class="v">${Utils.formatDateReadable(o.createdAt)} - ${Utils.formatTime(o.createdAt)}</span></div>
      ${o.deliveredAt ? `<div class="detail-row"><span class="k">وقت التسليم</span><span class="v">${Utils.formatDateReadable(o.deliveredAt)} - ${Utils.formatTime(o.deliveredAt)}</span></div>` : ""}
    `;
    this.openModal("viewOrderModalOverlay");
  },

  /* ---------- Modal: تسليم مجموعة أوردرات لدليفري ---------- */
  openAssignModal() {
    if (this.selectedOrderIds.size === 0) return;
    const persons = Delivery.getAll();
    if (persons.length === 0) {
      Utils.toast("أضف دليفري أولاً من صفحة الدليفري", "error");
      return;
    }

    document.getElementById("assignSummaryText").textContent =
      `سيتم تسليم ${this.selectedOrderIds.size} أوردر للدليفري المختار.`;

    const select = document.getElementById("assignDeliverySelect");
    select.innerHTML = "";
    persons.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name + (p.status === "غير متاح" ? " (غير متاح حاليًا)" : "");
      select.appendChild(opt);
    });

    this.updateAssignPreview();
    this.openModal("assignModalOverlay");
  },

  updateAssignPreview() {
    const fee = Storage.getSettings().deliveryFee;
    const count = this.selectedOrderIds.size;
    document.getElementById("assignPreview").innerHTML =
      `${count} أوردر × ${Utils.formatMoney(fee)} = <strong>${Utils.formatMoney(count * fee)}</strong> إجمالي خدمة الدليفري`;
  },

  confirmAssignDelivery() {
    const personId = document.getElementById("assignDeliverySelect").value;
    if (!personId) return;
    const result = Orders.assignToDelivery([...this.selectedOrderIds], personId);
    Utils.toast(`تم تسليم ${result.count} أوردر إلى ${result.person.name}`);
    this.selectedOrderIds.clear();
    this.closeModal("assignModalOverlay");
    this.renderOrdersList();
    if (this.currentView === "dashboard") this.renderDashboard();
  },

  /* =========================================================
     صفحة الدليفري
     ========================================================= */
  bindDeliveryView() {
    document.getElementById("btnAddDeliveryPerson").addEventListener("click", () => this.openPersonModal());
    document.getElementById("personForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.savePersonFromForm();
    });
  },

  renderDeliveryList() {
    const persons = Delivery.getAll();
    const grid = document.getElementById("deliveryGrid");
    grid.innerHTML = "";
    document.getElementById("deliveryEmptyState").classList.toggle("hidden", persons.length > 0);

    persons.forEach((p) => {
      const stats = Delivery.getStatsForPerson(p.id);
      const initials = p.name.trim().charAt(0) || "؟";
      const card = Utils.el(`
        <div class="person-card">
          <div class="person-card-top">
            <div class="person-avatar">${Utils.escapeHtml(initials)}</div>
            <div>
              <div class="person-name">${Utils.escapeHtml(p.name)}</div>
              <div class="person-phone">${Utils.escapeHtml(p.phone)}</div>
            </div>
            <span class="person-status ${p.status === "متاح" ? "available" : "unavailable"}">${p.status}</span>
          </div>
          <div class="person-notes">${Utils.escapeHtml(p.notes) || ""}</div>
          <div class="order-card-row"><span class="k">إجمالي الأوردرات (كل الأوقات)</span><span class="v">${stats.totalOrders}</span></div>
          <div class="order-card-row"><span class="k">إجمالي الخدمات</span><span class="v">${Utils.formatMoney(stats.totalFees)}</span></div>
          <div class="person-actions"></div>
        </div>
      `);

      const actions = card.querySelector(".person-actions");
      const btnEdit = Utils.el(`<button class="btn btn-secondary btn-sm"><i class="fa-solid fa-pen"></i> تعديل</button>`);
      btnEdit.addEventListener("click", () => this.openPersonModal(p.id));
      const btnDelete = Utils.el(`<button class="btn btn-danger btn-sm"><i class="fa-solid fa-trash"></i></button>`);
      btnDelete.addEventListener("click", () => this.deletePerson(p.id));
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);

      grid.appendChild(card);
    });
  },

  openPersonModal(personId = null) {
    const form = document.getElementById("personForm");
    form.reset();
    document.getElementById("personId").value = "";

    if (personId) {
      const p = Delivery.getById(personId);
      if (!p) return;
      document.getElementById("personModalTitle").textContent = "تعديل بيانات الدليفري";
      document.getElementById("personId").value = p.id;
      document.getElementById("pName").value = p.name;
      document.getElementById("pPhone").value = p.phone;
      document.getElementById("pStatus").value = p.status;
      document.getElementById("pNotes").value = p.notes;
    } else {
      document.getElementById("personModalTitle").textContent = "إضافة دليفري";
    }

    this.openModal("personModalOverlay");
  },

  savePersonFromForm() {
    const personId = document.getElementById("personId").value;
    const data = {
      name: document.getElementById("pName").value,
      phone: document.getElementById("pPhone").value,
      status: document.getElementById("pStatus").value,
      notes: document.getElementById("pNotes").value,
    };
    if (!data.name.trim() || !data.phone.trim()) {
      Utils.toast("من فضلك أكمل الاسم ورقم الهاتف", "error");
      return;
    }

    if (personId) {
      Delivery.update(personId, data);
      Utils.toast("تم تعديل بيانات الدليفري");
    } else {
      Delivery.add(data);
      Utils.toast("تمت إضافة الدليفري بنجاح");
    }
    this.closeModal("personModalOverlay");
    this.renderDeliveryList();
  },

  deletePerson(personId) {
    this.confirmAction("هل تريد حذف هذا الدليفري؟", () => {
      try {
        Delivery.remove(personId);
        Utils.toast("تم حذف الدليفري");
        this.renderDeliveryList();
      } catch (err) {
        Utils.toast(err.message, "error");
      }
    });
  },

  /* =========================================================
     صفحة حسابات الدليفري
     ========================================================= */
  bindDeliveryAccountsView() {
    document.getElementById("deliveryAccountsDate").addEventListener("change", () => this.renderDeliveryAccounts());
  },

  renderDeliveryAccounts() {
    const date = document.getElementById("deliveryAccountsDate").value || Utils.todayStr();
    const stats = Delivery.getStatsForAll(date);
    const list = document.getElementById("deliveryAccountsList");
    list.innerHTML = "";

    const withOrders = stats.filter((s) => s.totalOrders > 0);
    document.getElementById("deliveryAccountsEmptyState").classList.toggle("hidden", withOrders.length > 0);

    stats.forEach(({ person, totalOrders, totalInvoices, totalFees, net }) => {
      if (totalOrders === 0) return; // نعرض فقط من عمل في هذا اليوم
      const initials = person.name.trim().charAt(0) || "؟";
      const card = Utils.el(`
        <div class="account-card">
          <div class="person-avatar">${Utils.escapeHtml(initials)}</div>
          <div class="account-name">${Utils.escapeHtml(person.name)}</div>
          <div class="account-metrics">
            <div class="account-metric">
              <span class="m-value">${totalOrders}</span>
              <span class="m-label">عدد الأوردرات</span>
            </div>
            <div class="account-metric">
              <span class="m-value">${Utils.formatMoney(totalInvoices)}</span>
              <span class="m-label">إجمالي الفواتير</span>
            </div>
            <div class="account-metric">
              <span class="m-value">${Utils.formatMoney(totalFees)}</span>
              <span class="m-label">خدمة الدليفري</span>
            </div>
            <div class="account-metric net">
              <span class="m-value">${Utils.formatMoney(net)}</span>
              <span class="m-label">الصافي</span>
            </div>
          </div>
        </div>
      `);
      list.appendChild(card);
    });
  },

  /* =========================================================
     صفحة الإعدادات
     ========================================================= */
  bindSettingsView() {
    document.getElementById("btnSaveFee").addEventListener("click", () => {
      const value = parseFloat(document.getElementById("deliveryFeeInput").value);
      if (isNaN(value) || value < 0) {
        Utils.toast("أدخل قيمة صحيحة", "error");
        return;
      }
      const settings = Storage.getSettings();
      settings.deliveryFee = value;
      Storage.saveSettings(settings);
      Utils.toast("تم حفظ سعر خدمة الدليفري");
    });

    document.getElementById("btnExportBackup").addEventListener("click", () => {
      const json = Storage.exportBackup();
      const filename = `backup-${Utils.todayStr()}.json`;
      Utils.downloadTextFile(filename, json);
      Utils.toast("تم تصدير النسخة الاحتياطية");
    });

    document.getElementById("btnImportBackup").addEventListener("click", () => {
      document.getElementById("importFileInput").click();
    });

    document.getElementById("importFileInput").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Storage.importBackup(reader.result);
          Utils.toast("تم استيراد البيانات بنجاح");
          this.renderSettings();
          this.renderDashboard();
        } catch (err) {
          Utils.toast("ملف غير صالح: " + err.message, "error");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    document.getElementById("btnClearAll").addEventListener("click", () => {
      this.confirmAction("سيتم حذف كل الأوردرات وأفراد الدليفري والإعدادات نهائيًا. هل أنت متأكد؟", () => {
        Storage.clearAll();
        Utils.toast("تم مسح جميع البيانات");
        this.selectedOrderIds.clear();
        this.renderSettings();
        this.showView("dashboard");
      });
    });
  },

  renderSettings() {
    document.getElementById("deliveryFeeInput").value = Storage.getSettings().deliveryFee;
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
