const STORAGE_KEY = "split-pay-board-v9";

const seedData = {
  owner: {
    name: "我",
    method: "支付宝",
    qr: "assets/alipay-qr.png",
    paymentUrl: "https://qr.alipay.com/fkx17087b7ip5a0f8zxjs16",
    paymentByAmount: {
      "52.50": {
        qr: "assets/alipay-52-qr.png",
        paymentUrl: "https://qr.alipay.com/fkx17501gsuzfprj3tapd01",
        fixedAmount: true
      },
      "239.06": {
        qr: "assets/alipay-23906-qr.png",
        paymentUrl: "https://qr.alipay.com/fkx157510ohlxomoontao6d",
        fixedAmount: true
      },
      "293.56": {
        qr: "assets/alipay-29356-qr.png",
        paymentUrl: "https://qr.alipay.com/fkx116637aano8rg63vife9",
        fixedAmount: true
      }
    },
    backup: {
      method: "微信",
      qr: "assets/wechat-qr.png",
      paymentUrl: "wxp://f2f0VLIaTxIP5I596o3y44jm6p-cqXPH5D9yOGaIzJb99i_5N6eBi7OTSBu5gy6FjuCR"
    }
  },
  people: [
    { id: "me", name: "我", role: "垫付人", color: "gray" },
    { id: "yujia", name: "玉家", role: "女生局成员", color: "green" },
    { id: "peiqi", name: "佩琪", role: "女生局成员", color: "coral" },
    { id: "yueru", name: "月如", role: "女生局成员", color: "ochre" },
    { id: "tongtong", name: "桐桐", role: "女生局成员", color: "blue" },
    { id: "boyfriend", name: "小李哥", role: "午饭加入", color: "gray" }
  ],
  bills: [
    {
      id: "bar", title: "灯湖雅萃酒廊", merchant: "Marble Arch 灯湖雅萃酒廊", amount: 480,
      date: "2026-07-18 23:05", category: "酒局", receipt: "assets/bar-480.jpg", type: "settled",
      splits: { me: 68, yujia: 88, peiqi: 108, yueru: 108, tongtong: 108 }
    },
    {
      id: "lunch", title: "云南大理午饭", merchant: "云南大理饭店", amount: 315,
      date: "2026-07-19 13:33", category: "午饭", receipt: "assets/lunch-315.jpg", type: "settled",
      splits: { me: 52.5, yujia: 52.5, peiqi: 52.5, yueru: 52.5, tongtong: 52.5, boyfriend: 52.5 }
    },
    {
      id: "ktv", title: "魅KTV · AI辅唱", merchant: "魅KTV（新凯广场店）", amount: 138,
      date: "2026-07-19 13:28", category: "KTV", receipt: "assets/ktv-138.jpg", type: "settled",
      splits: { me: 34.5, peiqi: 34.5, yueru: 34.5, tongtong: 34.5 }
    },
    {
      id: "voucher", title: "欢聚 4–5 人餐券", merchant: "一沙一城 · 岩烤牛扒", amount: 442.3,
      date: "2026-07-19", category: "团购餐券", receipt: "assets/voucher-442.jpg", type: "settled",
      splits: { me: 88.46, yujia: 88.46, peiqi: 88.46, yueru: 88.46, tongtong: 88.46 }
    },
    {
      id: "store", title: "便利店零食与餐饮", merchant: "广东美宜佳便利店", amount: 50.5,
      date: "2026-07-19 00:08–00:44", category: "便利店", receipt: "assets/store-50.jpg", type: "settled",
      splits: { me: 10.1, yujia: 10.1, peiqi: 10.1, yueru: 10.1, tongtong: 10.1 }
    }
  ],
  payments: [],
  activities: [
    { id: "a0", kind: "bill", text: "已录入 KTV 账单", sub: "魅KTV · 138.00", amount: 138, time: "7月19日 13:28" },
    { id: "a1", kind: "bill", text: "已录入午饭账单", sub: "云南大理饭店 · 315.00", amount: 315, time: "7月19日 13:33" },
    { id: "a2", kind: "bill", text: "已录入酒局账单", sub: "灯湖雅萃酒廊 · 480.00", amount: 480, time: "7月18日 23:05" }
  ]
};

let state = loadState();
let currentFilter = "pending";
let activePayPerson = null;
let activePayChannel = "primary";

function cloneSeed() { return JSON.parse(JSON.stringify(seedData)); }
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || cloneSeed(); }
  catch { return cloneSeed(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(value) { return `¥${Number(value || 0).toFixed(2)}`; }
function initials(name) { return name.length > 2 ? name.slice(-2) : name; }
function personById(id) { return state.people.find((person) => person.id === id); }
function paidIds() { return new Set(state.payments.map((payment) => payment.personId)); }
function payablePeople() { return state.people.filter((person) => person.id !== "me"); }
function allocationsFor(personId) {
  return state.bills
    .filter((bill) => bill.type === "settled" && Number(bill.splits[personId]) > 0)
    .map((bill) => ({ bill, amount: Number(bill.splits[personId]) }));
}
function dueFor(personId) { return allocationsFor(personId).reduce((sum, item) => sum + item.amount, 0); }
function totalToCollect() { return payablePeople().reduce((sum, person) => sum + dueFor(person.id), 0); }
function collectedAmount() { return state.payments.reduce((sum, payment) => sum + payment.amount, 0); }
function totalExpenses() { return state.bills.reduce((sum, bill) => sum + bill.amount, 0); }

function renderAll() {
  renderSummary();
  renderCollections();
  renderActivities();
  renderBills();
  renderPeople();
  renderParticipantChecks();
  renderPaymentConfig();
  lucide.createIcons();
}

function renderSummary() {
  const total = totalToCollect();
  const collected = collectedAmount();
  const remaining = Math.max(0, total - collected);
  const percentage = total ? Math.round((collected / total) * 100) : 0;
  const paid = paidIds();
  const peopleWithDue = payablePeople().filter((person) => dueFor(person.id) > 0);
  document.querySelector("#outstandingTotal").textContent = money(remaining);
  document.querySelector("#collectedTotal").textContent = money(collected);
  document.querySelector("#expenseTotal").textContent = money(totalExpenses());
  document.querySelector("#pendingPeople").textContent = `${peopleWithDue.filter((person) => !paid.has(person.id)).length} 人`;
  document.querySelector("#paidPeople").textContent = `${peopleWithDue.filter((person) => paid.has(person.id)).length} 人`;
  document.querySelector("#collectionProgress").style.width = `${Math.min(100, percentage)}%`;
  document.querySelector("#progressText").textContent = `${percentage}%`;
}

function renderCollections() {
  const list = document.querySelector("#collectionList");
  const paid = paidIds();
  const rows = payablePeople().filter((person) => {
    if (dueFor(person.id) <= 0) return false;
    if (currentFilter === "paid") return paid.has(person.id);
    if (currentFilter === "pending") return !paid.has(person.id);
    return true;
  });

  if (!rows.length) {
    list.innerHTML = `<div class="empty-state">${currentFilter === "pending" ? "全部收齐了" : "暂无记录"}</div>`;
    return;
  }

  list.innerHTML = rows.map((person) => {
    const lines = allocationsFor(person.id);
    const isPaid = paid.has(person.id);
    return `
      <article class="person-row" data-person="${person.id}">
        <button class="person-main" data-expand="${person.id}">
          <span class="avatar ${person.color}">${initials(person.name)}</span>
          <span class="person-name"><strong>${person.name}</strong><span>${lines.length} 笔账单</span></span>
          <span class="source-tags">${lines.map((line) => `<span>${line.bill.category}</span>`).join("")}</span>
          <span class="person-amount">${money(dueFor(person.id))}</span>
          <span class="status-dot ${isPaid ? "paid" : ""}">${isPaid ? "已收" : "待收"}</span>
          <i class="chev" data-lucide="chevron-down"></i>
        </button>
        <div class="person-detail">
          ${lines.map((line) => `<div class="detail-line"><span>${line.bill.title}</span><strong>${money(line.amount)}</strong></div>`).join("")}
          <div class="detail-actions">
            <button class="mini-pay" data-pay="${person.id}" ${isPaid ? "disabled" : ""}>
              <i data-lucide="${isPaid ? "check" : "scan-line"}"></i>${isPaid ? "已结清" : "收款"}
            </button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderActivities() {
  const list = document.querySelector("#activityList");
  const items = [...state.activities].slice(-4).reverse();
  list.innerHTML = items.map((item) => `
    <div class="activity-item">
      <span class="activity-icon"><i data-lucide="${item.kind === "payment" ? "circle-check" : "receipt"}"></i></span>
      <div><strong>${item.text}</strong><span>${item.time}</span></div>
      <strong>${item.kind === "payment" ? "+" : ""}${money(item.amount)}</strong>
    </div>`).join("");
}

function renderBills() {
  const query = document.querySelector("#billSearch")?.value.trim().toLowerCase() || "";
  const filter = document.querySelector("#billFilter")?.value || "all";
  const bills = state.bills.filter((bill) => {
    const matchesText = !query || `${bill.title} ${bill.merchant}`.toLowerCase().includes(query);
    const matchesType = filter === "all" || bill.type === filter;
    return matchesText && matchesType;
  });
  document.querySelector("#billList").innerHTML = bills.map((bill) => {
    const splitCount = Object.keys(bill.splits).length;
    return `
      <article class="bill-card">
        ${bill.receipt ? `<button class="receipt-thumb" data-receipt="${bill.receipt}" aria-label="查看${bill.title}凭证"><img src="${bill.receipt}" alt="${bill.title}账单截图" /></button>` : `<span class="receipt-thumb placeholder"><i data-lucide="receipt"></i></span>`}
        <div class="bill-copy"><h3>${bill.title}</h3><p>${bill.merchant}</p></div>
        <div class="bill-meta"><div><span>日期</span><strong>${bill.date}</strong></div><div><span>参与人</span><strong>${splitCount || "—"}</strong></div></div>
        <div class="bill-total"><strong>${money(bill.amount)}</strong><span class="${bill.type === "reference" ? "reference" : ""}">${bill.type === "reference" ? "仅作凭证" : "已分摊"}</span></div>
      </article>`;
  }).join("") || `<div class="empty-state">没有匹配的账单</div>`;
}

function renderPeople() {
  const paid = paidIds();
  document.querySelector("#peopleGrid").innerHTML = state.people.map((person) => {
    const due = dueFor(person.id);
    const count = allocationsFor(person.id).length;
    const status = person.id === "me" ? "自付" : paid.has(person.id) ? "已结清" : due > 0 ? "待付款" : "无分摊";
    return `
      <article class="people-card">
        <div class="people-card-head"><span class="avatar ${person.color}">${initials(person.name)}</span><div><strong>${person.name}</strong><span>${person.role}</span></div></div>
        <div class="people-stats"><div><span>${person.id === "me" ? "自付份额" : "应付金额"}</span><strong>${money(due)}</strong></div><div><span>状态 / 账单</span><strong>${status} · ${count}</strong></div></div>
      </article>`;
  }).join("");
}

function renderParticipantChecks() {
  const box = document.querySelector("#participantChecks");
  box.innerHTML = state.people.map((person) => `<label><input type="checkbox" name="participants" value="${person.id}" checked />${person.name}</label>`).join("");
}

function renderPaymentConfig() {
  const configured = Boolean(state.owner.qr);
  document.querySelector("#paymentConfigStatus").textContent = configured ? `${state.owner.method} · 已配置` : "未配置收款码";
  document.querySelector("#ownerName").value = state.owner.name;
  document.querySelector("#paymentUrl").value = state.owner.paymentUrl || "";
  document.querySelectorAll("input[name='payMethod']").forEach((radio) => { radio.checked = radio.value === state.owner.method; });
  const preview = document.querySelector("#qrPreview");
  const prompt = document.querySelector("#uploadPrompt");
  if (configured) { preview.src = state.owner.qr; preview.style.display = "block"; prompt.style.display = "none"; }
  else { preview.style.display = "none"; prompt.style.display = "grid"; }
}

function switchView(name) {
  const titles = { overview: ["COLLECTION BOARD", "收款总览"], bills: ["TRANSACTION RECORDS", "账单流水"], people: ["PARTICIPANTS", "参与人"] };
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  document.querySelector("#viewEyebrow").textContent = titles[name][0];
  document.querySelector("#viewTitle").textContent = titles[name][1];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(id) { const modal = document.querySelector(`#${id}`); modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); }
function closeModal(id) { const modal = document.querySelector(`#${id}`); modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }

function openPayment(personId) {
  const person = personById(personId);
  activePayPerson = personId;
  const lines = allocationsFor(personId);
  document.querySelector("#payPersonName").textContent = person.name;
  document.querySelector("#paymentTitle").textContent = money(dueFor(personId));
  document.querySelector("#payBreakdown").innerHTML = lines.map((line) => `<div class="detail-line"><span>${line.bill.category}</span><strong>${money(line.amount)}</strong></div>`).join("");
  setPayChannel("primary");
  openModal("paymentModal");
}

function paymentConfig(channel = activePayChannel) {
  if (channel === "backup" && state.owner.backup) return state.owner.backup;
  const amountKey = activePayPerson ? dueFor(activePayPerson).toFixed(2) : "";
  const amountConfig = state.owner.paymentByAmount?.[amountKey];
  return amountConfig ? { ...state.owner, ...amountConfig } : state.owner;
}

function setPayChannel(channel) {
  activePayChannel = channel;
  const config = paymentConfig(channel);
  document.querySelectorAll("[data-pay-channel]").forEach((button) => button.classList.toggle("active", button.dataset.payChannel === channel));
  document.querySelector("#paymentNote").textContent = `${config.method}${config.fixedAmount ? "定额" : ""}收款 · 佛山女生局`;
  const jumpPay = document.querySelector("#jumpPay");
  jumpPay.href = paymentTarget(activePayPerson, config);
  jumpPay.target = "_self";
  jumpPay.querySelector("span").textContent = `打开${config.method}`;
  const image = document.querySelector("#qrImage");
  const imageLink = document.querySelector("#qrImageLink");
  const empty = document.querySelector("#qrEmpty");
  if (config.qr) {
    image.src = config.qr;
    imageLink.href = config.qr;
    imageLink.style.display = "grid";
    empty.style.display = "none";
  } else {
    imageLink.style.display = "none";
    empty.style.display = "grid";
  }
}

function paymentTarget(personId, config = paymentConfig()) {
  const person = personById(personId);
  const amount = dueFor(personId).toFixed(2);
  const fallback = config.method === "支付宝"
    ? "alipays://platformapi/startapp?appId=20000056"
    : "weixin://";
  return (config.paymentUrl || fallback)
    .replaceAll("{amount}", encodeURIComponent(amount))
    .replaceAll("{name}", encodeURIComponent(person.name));
}

function markPaid() {
  if (!activePayPerson || paidIds().has(activePayPerson)) return;
  const person = personById(activePayPerson);
  const amount = dueFor(activePayPerson);
  state.payments.push({ id: `p-${Date.now()}`, personId: activePayPerson, amount, paidAt: new Date().toISOString() });
  state.activities.push({ id: `a-${Date.now()}`, kind: "payment", text: `收到 ${person.name} 的付款`, sub: state.owner.method, amount, time: "刚刚" });
  saveState(); closeModal("paymentModal"); renderAll(); showToast(`已确认收到 ${person.name} 的 ${money(amount)}`);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) switchView(viewButton.dataset.view);
  const viewLink = event.target.closest("[data-view-link]");
  if (viewLink) switchView(viewLink.dataset.viewLink);
  const expand = event.target.closest("[data-expand]");
  if (expand) expand.closest(".person-row").classList.toggle("open");
  const pay = event.target.closest("[data-pay]");
  if (pay && !pay.disabled) { event.stopPropagation(); openPayment(pay.dataset.pay); }
  const close = event.target.closest("[data-close]");
  if (close) closeModal(close.dataset.close);
  if (event.target.classList.contains("modal-backdrop")) closeModal(event.target.id);
  const receipt = event.target.closest("[data-receipt]");
  if (receipt) window.open(receipt.dataset.receipt, "_blank");
});

document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderCollections(); lucide.createIcons();
}));

document.querySelectorAll("[data-pay-channel]").forEach((button) => button.addEventListener("click", () => setPayChannel(button.dataset.payChannel)));

document.querySelector("#openSettings").addEventListener("click", () => openModal("settingsModal"));
document.querySelector("#mobileSettings").addEventListener("click", () => openModal("settingsModal"));
document.querySelector("#addBillBtn").addEventListener("click", () => { updateEstimate(); openModal("addBillModal"); });
document.querySelector("#markPaid").addEventListener("click", markPaid);
document.querySelector("#copyRequest").addEventListener("click", async () => {
  if (!activePayPerson) return;
  const person = personById(activePayPerson);
  const text = `${person.name}，这次聚会需要支付 ${money(dueFor(activePayPerson))}，包含：${allocationsFor(activePayPerson).map((line) => `${line.bill.category} ${money(line.amount)}`).join("、")}。`;
  try { await navigator.clipboard.writeText(text); showToast("收款信息已复制"); }
  catch { showToast("当前浏览器未开放剪贴板权限"); }
});

document.querySelector("#qrUpload").addEventListener("change", (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const source = new Image();
    source.onload = () => {
      const scale = Math.min(1, 720 / Math.max(source.naturalWidth, source.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(source.naturalWidth * scale);
      canvas.height = Math.round(source.naturalHeight * scale);
      canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
      state.owner.qr = canvas.toDataURL("image/jpeg", 0.84);
      const preview = document.querySelector("#qrPreview");
      preview.src = state.owner.qr; preview.style.display = "block";
      document.querySelector("#uploadPrompt").style.display = "none";
    };
    source.src = reader.result;
  };
  reader.readAsDataURL(file);
});

document.querySelector("#saveSettings").addEventListener("click", () => {
  state.owner.name = document.querySelector("#ownerName").value.trim() || "我";
  state.owner.method = document.querySelector("input[name='payMethod']:checked").value;
  state.owner.paymentUrl = document.querySelector("#paymentUrl").value.trim();
  saveState(); closeModal("settingsModal"); renderPaymentConfig(); showToast("收款设置已保存");
});

document.querySelector("#billSearch").addEventListener("input", renderBills);
document.querySelector("#billFilter").addEventListener("change", renderBills);

function updateEstimate() {
  const amount = Number(document.querySelector("[name='amount']").value || 0);
  const count = document.querySelectorAll("[name='participants']:checked").length;
  document.querySelector("#perPersonEstimate").textContent = money(count ? amount / count : 0);
}
document.querySelector("[name='amount']").addEventListener("input", updateEstimate);
document.querySelector("#participantChecks").addEventListener("change", updateEstimate);

document.querySelector("#billForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const ids = form.getAll("participants");
  const amount = Number(form.get("amount"));
  if (!ids.length || !amount) return showToast("请选择参与人并填写金额");
  const share = Number((amount / ids.length).toFixed(2));
  const splits = Object.fromEntries(ids.map((id, index) => [id, index === ids.length - 1 ? Number((amount - share * (ids.length - 1)).toFixed(2)) : share]));
  const title = form.get("title");
  state.bills.unshift({ id: `b-${Date.now()}`, title, merchant: form.get("merchant"), amount, date: form.get("date"), category: title, receipt: "", type: "settled", splits });
  state.activities.push({ id: `a-${Date.now()}`, kind: "bill", text: `已录入${title}`, sub: form.get("merchant"), amount, time: "刚刚" });
  saveState(); event.currentTarget.reset(); closeModal("addBillModal"); renderAll(); showToast(`${title}已加入并完成均分`);
});

document.querySelector("#resetData").addEventListener("click", () => {
  if (!confirm("恢复示例数据？当前支付状态和新增账单会被清除。")) return;
  state = cloneSeed(); saveState(); renderAll(); showToast("已恢复示例数据");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelectorAll(".modal-backdrop.open").forEach((modal) => closeModal(modal.id));
});

renderAll();
