// Panel + admin ikon seti — lmax_capital'ın kendi çizgi ikonlarının HTML string hâli.
// (JSX değil; vanilla innerHTML için dönüştürüldü. Boyut/renk CSS'ten gelir.)

const s = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${extra}>${body}</svg>`;

// Kenar menüsü — admin
export const ADMIN_ICON = {
  dashboard: s('<path d="M3 13h8V3H3v10Z"/><path d="M13 21h8V11h-8v10Z"/><path d="M3 21h8v-6H3v6Z"/><path d="M13 3v6h8V3h-8Z"/>'),
  prospects: s('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>'),
  investors: s('<path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h7v7"/>'),
  tickets: s('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  transactions: s('<path d="M3 6h18"/><path d="M7 12h13"/><path d="M3 18h13"/><path d="m18 3 3 3-3 3"/><path d="m6 15-3 3 3 3"/>'),
  transfers: s('<path d="M4 7h15"/><path d="m15 3 4 4-4 4"/><path d="M20 17H5"/><path d="m9 21-4-4 4-4"/>'),
  mt5: s('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h2l2 4 2-4h2v8"/><path d="M7 20h10"/>'),
  payments: s('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01"/><path d="M18 12h.01"/>'),
  logout: s('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
};

// Kenar menüsü — müşteri paneli
export const PANEL_ICON = {
  overview: s('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  mt5: s('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h2l2 4 2-4h2v8"/><path d="M7 20h10"/>'),
  deposit: s('<path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/>'),
  withdraw: s('<path d="M12 21V7"/><path d="m6 13 6-6 6 6"/><path d="M5 3h14"/>'),
  transfer: s('<path d="M4 7h15"/><path d="m15 3 4 4-4 4"/><path d="M20 17H5"/><path d="m9 21-4-4 4-4"/>'),
  kyc: s('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0"/><path d="M15 9h4"/><path d="M15 13h4"/>'),
  support: s('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  account: s('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
  logout: s('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
};

// Form alanı ikonları (.field-ico — input içine sol tarafa)
const fi = (body) =>
  `<svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const FIELD_ICO = {
  dollar: fi('<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  note: fi('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/>'),
  hash: fi('<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>'),
  wallet: fi('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2"/><path d="M3 10h18"/>'),
  network: fi('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>'),
  subject: fi('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>'),
  tag: fi('<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.4"/>'),
  key: fi('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>'),
  lock: fi('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  server: fi('<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01"/><path d="M7 17h.01"/>'),
  eye: fi('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  bank: fi('<path d="M3 21h18"/><path d="m12 3 10 5H2l10-5Z"/><path d="M5 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M19 10v8"/>'),
  user: fi('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
  coin: fi('<circle cx="12" cy="12" r="9"/><path d="M14 9.5C13 8.5 11 8.5 10 9.5s-1 2.5 0 3 3 .5 4 1.5-1 2-2 2-2-.5-2.5-1.5"/><path d="M12 7v2"/><path d="M12 15v2"/>'),
  phone: fi('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/>'),
  // Türk lirası tutar alanları: svg yerine ₺ harfi (aynı .field-ico konumlandırması)
  lira: '<span class="field-ico field-ico-text" aria-hidden="true">₺</span>',
};
