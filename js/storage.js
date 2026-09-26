/* =========================================================
   storage.js
   طبقة التعامل مع البيانات (LocalStorage)
   كل التعامل مع حفظ/قراءة البيانات يمر من هنا فقط،
   حتى لو غيّرنا طريقة التخزين مستقبلاً (مثلاً Backend حقيقي)
   لن نحتاج لتعديل باقي الملفات.
   ========================================================= */

const STORAGE_KEYS = {
  ORDERS: "odm_orders",
  DELIVERY: "odm_delivery_persons",
  SETTINGS: "odm_settings",
  COUNTER: "odm_order_counter",
  SEEDED: "odm_seeded_v1",
};

const DEFAULT_SETTINGS = {
  deliveryFee: 15, // مبلغ خدمة الدليفري الافتراضي لكل أوردر
};

// حالات الأوردر المتاحة في النظام
const ORDER_STATUS = {
  NEW: "جديد",
  PREPARING: "جاري التجهيز",
  READY: "جاهز",
  WITH_DELIVERY: "مع الدليفري",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);

const Storage = {
  /* ---------- أدوات عامة ---------- */
  _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("خطأ في قراءة البيانات:", key, e);
      return fallback;
    }
  },
  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("خطأ في حفظ البيانات:", key, e);
      return false;
    }
  },

  /* ---------- الأوردرات ---------- */
  getOrders() {
    return this._get(STORAGE_KEYS.ORDERS, []);
  },
  saveOrders(orders) {
    return this._set(STORAGE_KEYS.ORDERS, orders);
  },

  /* ---------- أفراد الدليفري ---------- */
  getDeliveryPersons() {
    return this._get(STORAGE_KEYS.DELIVERY, []);
  },
  saveDeliveryPersons(list) {
    return this._set(STORAGE_KEYS.DELIVERY, list);
  },

  /* ---------- الإعدادات ---------- */
  getSettings() {
    return this._get(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
  },
  saveSettings(settings) {
    return this._set(STORAGE_KEYS.SETTINGS, settings);
  },

  /* ---------- عداد رقم الأوردر ---------- */
  getNextOrderNumber() {
    let counter = this._get(STORAGE_KEYS.COUNTER, 0);
    counter += 1;
    this._set(STORAGE_KEYS.COUNTER, counter);
    return "ORD-" + String(counter).padStart(4, "0");
  },

  /* ---------- توليد معرف فريد بسيط ---------- */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /* ---------- تصدير / استيراد نسخة احتياطية ---------- */
  exportBackup() {
    const data = {
      orders: this.getOrders(),
      deliveryPersons: this.getDeliveryPersons(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    return JSON.stringify(data, null, 2);
  },
  importBackup(jsonText) {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.orders) || !Array.isArray(data.deliveryPersons)) {
      throw new Error("ملف النسخة الاحتياطية غير صالح");
    }
    this.saveOrders(data.orders);
    this.saveDeliveryPersons(data.deliveryPersons);
    if (data.settings) this.saveSettings(data.settings);
    return true;
  },

  /* ---------- مسح كل البيانات ---------- */
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.DELIVERY);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.COUNTER);
    localStorage.removeItem(STORAGE_KEYS.SEEDED);
  },

  /* ---------- البيانات التجريبية ---------- */
  isSeeded() {
    return !!this._get(STORAGE_KEYS.SEEDED, false);
  },

  seedDemoData() {
    if (this.isSeeded()) return; // لا نكرر التجريبي إذا كان موجودًا
    if (this.getOrders().length > 0 || this.getDeliveryPersons().length > 0) {
      // المستخدم لديه بيانات فعلية بالفعل، لا نلمسها
      this._set(STORAGE_KEYS.SEEDED, true);
      return;
    }

    const persons = [
      { id: this.generateId(), name: "محمد أحمد", phone: "01000000001", notes: "", status: "متاح" },
      { id: this.generateId(), name: "أحمد علي", phone: "01000000002", notes: "", status: "متاح" },
      { id: this.generateId(), name: "كريم سيد", phone: "01000000003", notes: "دراجة نارية", status: "غير متاح" },
    ];
    this.saveDeliveryPersons(persons);

    const now = Date.now();
    const sampleOrders = [
      {
        customerName: "سارة محمود",
        phone: "01111111111",
        area: "المعادي",
        street: "شارع 9",
        buildingName: "عمارة النور",
        buildingNumber: "25",
        floor: "3",
        apartment: "12",
        addressDetails: "بجوار الصيدلية",
        orderDetails: "2 بيتزا كبيرة + مشروبات",
        invoiceAmount: 320,
        notes: "",
        status: ORDER_STATUS.NEW,
      },
      {
        customerName: "خالد إبراهيم",
        phone: "01222222222",
        area: "مدينة نصر",
        street: "شارع مصطفى النحاس",
        buildingName: "برج الأمل",
        buildingNumber: "7",
        floor: "5",
        apartment: "20",
        addressDetails: "",
        orderDetails: "وجبة عائلية",
        invoiceAmount: 450,
        notes: "بدون بصل",
        status: ORDER_STATUS.PREPARING,
      },
      {
        customerName: "منى فتحي",
        phone: "01333333333",
        area: "الدقي",
        street: "شارع التحرير",
        buildingName: "عمارة النيل",
        buildingNumber: "3",
        floor: "1",
        apartment: "2",
        addressDetails: "",
        orderDetails: "طلبية مشويات",
        invoiceAmount: 610,
        notes: "",
        status: ORDER_STATUS.READY,
      },
      {
        customerName: "عمر حسن",
        phone: "01444444444",
        area: "المعادي",
        street: "شارع 9",
        buildingName: "عمارة النور",
        buildingNumber: "25",
        floor: "6",
        apartment: "18",
        addressDetails: "",
        orderDetails: "طلب حلويات",
        invoiceAmount: 180,
        notes: "",
        status: ORDER_STATUS.WITH_DELIVERY,
        deliveryPersonId: persons[0].id,
        deliveryPersonName: persons[0].name,
      },
      {
        customerName: "ياسمين طارق",
        phone: "01555555555",
        area: "الزمالك",
        street: "شارع 26 يوليو",
        buildingName: "عمارة الزمالك",
        buildingNumber: "10",
        floor: "2",
        apartment: "4",
        addressDetails: "",
        orderDetails: "طلب سوشي",
        invoiceAmount: 520,
        notes: "",
        status: ORDER_STATUS.DELIVERED,
        deliveryPersonId: persons[1].id,
        deliveryPersonName: persons[1].name,
        deliveredAt: new Date(now - 1000 * 60 * 60).toISOString(),
      },
    ];

    const deliveryFee = this.getSettings().deliveryFee;
    const orders = sampleOrders.map((o, idx) => ({
      id: this.generateId(),
      orderNumber: this.getNextOrderNumber(),
      ...o,
      deliveryFee: (o.status === ORDER_STATUS.WITH_DELIVERY || o.status === ORDER_STATUS.DELIVERED) ? deliveryFee : null,
      createdAt: new Date(now - (sampleOrders.length - idx) * 1000 * 60 * 15).toISOString(),
    }));

    this.saveOrders(orders);
    this._set(STORAGE_KEYS.SEEDED, true);
  },
};
