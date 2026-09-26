/* =========================================================
   delivery.js
   إدارة أفراد الدليفري + حساب إحصائيات كل واحد منهم
   ========================================================= */

const Delivery = {
  add(personData) {
    const persons = Storage.getDeliveryPersons();
    const newPerson = {
      id: Storage.generateId(),
      name: Utils.clean(personData.name),
      phone: Utils.clean(personData.phone),
      notes: Utils.clean(personData.notes),
      status: personData.status || "متاح",
    };
    persons.push(newPerson);
    Storage.saveDeliveryPersons(persons);
    return newPerson;
  },

  update(personId, updates) {
    const persons = Storage.getDeliveryPersons();
    const idx = persons.findIndex((p) => p.id === personId);
    if (idx === -1) return null;
    persons[idx] = { ...persons[idx], ...updates };
    Storage.saveDeliveryPersons(persons);

    // إذا تغير اسمه، حدّث اسمه في الأوردرات القديمة المرتبطة به للحفاظ على التطابق
    if (updates.name) {
      const orders = Storage.getOrders();
      let changed = false;
      orders.forEach((o) => {
        if (o.deliveryPersonId === personId) {
          o.deliveryPersonName = updates.name;
          changed = true;
        }
      });
      if (changed) Storage.saveOrders(orders);
    }
    return persons[idx];
  },

  remove(personId) {
    const orders = Storage.getOrders();
    const hasOrders = orders.some((o) => o.deliveryPersonId === personId);
    if (hasOrders) {
      throw new Error("لا يمكن حذف هذا الدليفري لأن لديه أوردرات مرتبطة به");
    }
    const persons = Storage.getDeliveryPersons().filter((p) => p.id !== personId);
    Storage.saveDeliveryPersons(persons);
  },

  getById(personId) {
    return Storage.getDeliveryPersons().find((p) => p.id === personId) || null;
  },

  getAll() {
    return Storage.getDeliveryPersons();
  },

  getAvailable() {
    return this.getAll().filter((p) => p.status === "متاح");
  },

  /* إحصائيات دليفري واحد في تاريخ معين (أو كل الأوقات إذا لم يُحدد تاريخ) */
  getStatsForPerson(personId, dateStr) {
    let orders = Storage.getOrders().filter((o) => o.deliveryPersonId === personId);
    if (dateStr) {
      orders = orders.filter((o) => Utils.toDateStr(o.assignedAt || o.createdAt) === dateStr);
    }
    const totalOrders = orders.length;
    const totalInvoices = orders.reduce((sum, o) => sum + (o.invoiceAmount || 0), 0);
    const totalFees = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    return {
      totalOrders,
      totalInvoices,
      totalFees,
      net: totalInvoices - totalFees,
    };
  },

  /* إحصائيات كل أفراد الدليفري في تاريخ معين */
  getStatsForAll(dateStr) {
    return this.getAll().map((person) => ({
      person,
      ...this.getStatsForPerson(person.id, dateStr),
    }));
  },
};
