/* =========================================================
   orders.js
   كل منطق التعامل مع الأوردرات:
   إضافة - تعديل - حذف - تغيير الحالة - البحث - التسليم للدليفري
   ========================================================= */

const Orders = {
  /* إضافة أوردر جديد */
  add(orderData) {
    const orders = Storage.getOrders();
    const newOrder = {
      id: Storage.generateId(),
      orderNumber: Storage.getNextOrderNumber(),
      customerName: orderData.customerName.trim(),
      phone: orderData.phone.trim(),
      area: orderData.area.trim(),
      street: orderData.street.trim(),
      buildingName: orderData.buildingName.trim(),
      buildingNumber: orderData.buildingNumber.trim(),
      floor: orderData.floor.trim(),
      apartment: orderData.apartment.trim(),
      addressDetails: orderData.addressDetails.trim(),
      orderDetails: orderData.orderDetails.trim(),
      invoiceAmount: parseFloat(orderData.invoiceAmount) || 0,
      notes: (orderData.notes || "").trim(),
      status: ORDER_STATUS.NEW,
      deliveryPersonId: null,
      deliveryPersonName: null,
      deliveryFee: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
    };
    orders.unshift(newOrder); // أحدث أوردر يظهر أولاً
    Storage.saveOrders(orders);
    return newOrder;
  },

  /* تعديل أوردر موجود */
  update(orderId, updates) {
    const orders = Storage.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    orders[idx] = {
      ...orders[idx],
      ...updates,
      invoiceAmount:
        updates.invoiceAmount !== undefined
          ? parseFloat(updates.invoiceAmount) || 0
          : orders[idx].invoiceAmount,
    };
    Storage.saveOrders(orders);
    return orders[idx];
  },

  /* حذف أوردر */
  remove(orderId) {
    const orders = Storage.getOrders().filter((o) => o.id !== orderId);
    Storage.saveOrders(orders);
  },

  /* تغيير حالة أوردر واحد */
  changeStatus(orderId, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === ORDER_STATUS.DELIVERED) {
      updates.deliveredAt = new Date().toISOString();
    }
    return this.update(orderId, updates);
  },

  /* الحصول على أوردر واحد بالمعرف */
  getById(orderId) {
    return Storage.getOrders().find((o) => o.id === orderId) || null;
  },

  /* تسليم مجموعة أوردرات لدليفري معين دفعة واحدة */
  assignToDelivery(orderIds, deliveryPersonId) {
    const persons = Storage.getDeliveryPersons();
    const person = persons.find((p) => p.id === deliveryPersonId);
    if (!person) throw new Error("الدليفري غير موجود");

    const fee = Storage.getSettings().deliveryFee;
    const orders = Storage.getOrders();
    const now = new Date().toISOString();

    orders.forEach((o) => {
      if (orderIds.includes(o.id)) {
        o.status = ORDER_STATUS.WITH_DELIVERY;
        o.deliveryPersonId = person.id;
        o.deliveryPersonName = person.name;
        o.deliveryFee = fee;
        o.assignedAt = now;
      }
    });

    Storage.saveOrders(orders);
    return { count: orderIds.length, fee, total: orderIds.length * fee, person };
  },

  /* ---------- البحث والفلترة ---------- */

  /* بحث نصي حي في كل الحقول المهمة (يشمل رقم العمارة كنص أيضًا) */
  search(query) {
    const orders = Storage.getOrders();
    if (!query || !query.trim()) return orders;

    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const haystack = [
        o.orderNumber,
        o.customerName,
        o.phone,
        o.area,
        o.street,
        o.buildingName,
        o.buildingNumber,
        o.deliveryPersonName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  },

  /* فلترة حسب الحالة (أو "الكل") */
  filterByStatus(orders, status) {
    if (!status || status === "الكل") return orders;
    return orders.filter((o) => o.status === status);
  },

  /* فلترة حسب يوم معين (تاريخ بصيغة YYYY-MM-DD) */
  filterByDate(orders, dateStr) {
    if (!dateStr) return orders;
    return orders.filter((o) => o.createdAt && o.createdAt.slice(0, 10) === dateStr);
  },

  /* أوردرات يوم معين (افتراضيًا اليوم) */
  getForDate(dateStr) {
    const targetDate = dateStr || Utils.todayStr();
    return this.filterByDate(Storage.getOrders(), targetDate);
  },
};
