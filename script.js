'use strict';
/* ===== Util & State ===== */
const KOP0 = {nama: 'Hadroh Al-Barokah', tagline: 'Hadroh & Sholawat untuk Berbagai Acara', alamat: '', telp: '', email: '', rek: '', ttd: '', catatan: 'Mohon pembayaran sisa dilunasi paling lambat pada hari acara. Terima kasih atas kepercayaan Anda.'};
const getKop = () => ({...KOP0, ...(settings.kop || {})});
const KEY = 'hadroh_jobs_v1', SKEY = 'hadroh_settings_v1';
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const TITLES = {dashboard:'Dashboard',jadwal:'Jadwal Job',tambah:'Tambah Job',kalender:'Kalender',pemesan:'Data Pemesan',laporan:'Laporan Job',keuangan:'Keuangan',pengaturan:'Pengaturan'};
let jobs = [], settings = {grups: ['Hadroh Al-Barokah', 'Hadroh An-Nur']};
let trx = []; const TKEY = 'hadroh_trx_v1';
let editId = null, calSel = null, view = 'dashboard';
const now = new Date(), cal = {y: now.getFullYear(), m: now.getMonth()};
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const fd = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {weekday:'short', day:'numeric', month:'short', year:'numeric'}) : '-';
const sisa = j => Math.max(0, (+j.honor || 0) - (+j.dp || 0));
const normWA = w => { let n = String(w).replace(/[\s\-().]/g, ''); if (n[0] === '+') n = n.slice(1); if (n[0] === '0') n = '62' + n.slice(1); return n; };
const validWA = w => /^628\d{8,12}$/.test(normWA(w));
const byDate = (a, b) => (a.tanggal + a.mulai).localeCompare(b.tanggal + b.mulai);
const aktif = j => j.statusJob !== 'dibatalkan';

let db = null, isAdmin = false, snap = {jobs: {}, transaksi: {}}, saving = Promise.resolve();
async function loadAll() {
  const [j, t, s] = await Promise.all([db.from('jobs').select('data'), db.from('transaksi').select('data'), db.from('pengaturan').select('data').eq('id', 1)]);
  const err = j.error || t.error || s.error; if (err) throw err;
  jobs = j.data.map(r => r.data); trx = t.data.map(r => r.data);
  if (s.data[0] && s.data[0].data && Array.isArray(s.data[0].data.grups)) settings = s.data[0].data;
  settings.kop = getKop();
  snap.jobs = {}; jobs.forEach(x => snap.jobs[x.id] = JSON.stringify(x));
  snap.transaksi = {}; trx.forEach(x => snap.transaksi[x.id] = JSON.stringify(x));
}
async function syncTable(tbl, arr) {
  const prev = snap[tbl], cur = {}; arr.forEach(x => cur[x.id] = JSON.stringify(x));
  const rows = arr.filter(x => prev[x.id] !== cur[x.id]).map(x => ({id: x.id, data: x}));
  const add = rows.filter(r => !(r.id in prev)), upd = rows.filter(r => r.id in prev);
  const del = Object.keys(prev).filter(id => !(id in cur));
  if (add.length) { const {error} = await db.from(tbl).insert(add); if (error) throw error; }
  if (upd.length) { const {error} = await db.from(tbl).upsert(upd); if (error) throw error; }
  if (del.length) { const {error} = await db.from(tbl).delete().in('id', del); if (error) throw error; }
  snap[tbl] = cur;
}
function save() {
  if (!isAdmin) return toast('Akun Anda hanya dapat melihat data.', 'err');
  saving = saving.then(async () => {
    try {
      await syncTable('jobs', jobs); await syncTable('transaksi', trx);
      const {error} = await db.from('pengaturan').upsert({id: 1, data: settings}); if (error) throw error;
    } catch (e) { toast('Gagal menyimpan ke server: ' + (e.message || e) + '. Data dimuat ulang.', 'err'); try { await loadAll(); renderAll(); } catch (e2) {} }
  });
}
function toast(msg, type) {
  const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = (type === 'err' ? '⚠️ ' : '✔️ ') + msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3500);
}
function modal({title, html, ok = 'OK', cancel = 'Batal', danger = false}) {
  return new Promise(res => {
    $('#mTitle').textContent = title; $('#mBody').innerHTML = html;
    $('#mOk').textContent = ok; $('#mOk').className = 'btn ' + (danger ? 'danger' : 'gold');
    $('#mCancel').textContent = cancel; $('#mCancel').hidden = !cancel; $('#modal').hidden = false;
    const done = v => { $('#modal').hidden = true; $('#mOk').onclick = $('#mCancel').onclick = null; res(v); };
    $('#mOk').onclick = () => done(true); $('#mCancel').onclick = () => done(false);
  });
}
function download(name, content, mime) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type: mime})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csv = (head, rows) => '\uFEFFsep=;\r\n' + [head, ...rows].map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');

/* ===== Data contoh ===== */
function sampleData() {
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return iso(x); };
  const mk = (i, p, wa, a, jn, n, m, s, t, al, g, k, h, dp, sb, sj) => ({id: 'JOB-' + String(i).padStart(3, '0'), pemesan: p, wa, acara: a, jenis: jn, tanggal: d(n), mulai: m, selesai: s, tempat: t, alamat: al, grup: g, koordinator: k, honor: h, dp, statusBayar: sb, statusJob: sj, catatan: 'Data contoh', sample: true});
  return [
    mk(1, 'Bapak Ahmad', '081234567801', 'Walimatul Ursy Ahmad & Siti', 'Pernikahan', 0, '19:00', '21:00', 'Gedung Serbaguna', 'Jl. Merdeka No. 10', 'Hadroh Al-Barokah', 'Ust. Fauzi', 2500000, 1000000, 'DP', 'dikonfirmasi'),
    mk(2, 'Ibu Fatimah', '081234567802', 'Khitanan Massal', 'Khitanan', 3, '09:00', '11:00', 'Rumah Ibu Fatimah', 'Jl. Mawar No. 5', 'Hadroh An-Nur', 'Ust. Hasan', 1500000, 0, 'belum bayar', 'menunggu'),
    mk(3, 'Panitia Masjid Al-Ikhlas', '081234567803', 'Peringatan Maulid Nabi', 'Maulid', 7, '19:30', '22:00', 'Masjid Al-Ikhlas', 'Jl. Melati No. 1', 'Hadroh Al-Barokah', 'Ust. Fauzi', 3000000, 3000000, 'lunas', 'dikonfirmasi'),
    mk(4, 'Bapak Ahmad', '081234567801', 'Pengajian Rutin', 'Pengajian', 7, '20:00', '22:30', 'Aula Pondok', 'Jl. Pesantren 3', 'Hadroh Al-Barokah', 'Ust. Fauzi', 1000000, 0, 'belum bayar', 'menunggu'),
    mk(5, 'Keluarga Besar Hj. Aminah', '081234567805', 'Haul Almarhum H. Karim', 'Haul', -5, '19:00', '21:30', 'Rumah Hj. Aminah', 'Jl. Kenanga 8', 'Hadroh An-Nur', 'Ust. Hasan', 2000000, 2000000, 'lunas', 'selesai'),
    mk(6, 'Ibu Rahma', '081234567806', 'Syukuran Rumah Baru', 'Acara Lainnya', 10, '16:00', '18:00', 'Perumahan Griya Asri', 'Blok C No. 4', 'Hadroh An-Nur', 'Ust. Hasan', 1200000, 0, 'belum bayar', 'dibatalkan')
  ];
}
function seed() { jobs = sampleData(); save(); }

/* ===== Bentrok ===== */
const overlap = (a, b) => a.tanggal === b.tanggal && a.mulai < b.selesai && b.mulai < a.selesai;
const sameGrup = (a, b) => a.grup.trim().toLowerCase() === b.grup.trim().toLowerCase();
const conflicts = j => !aktif(j) ? [] : jobs.filter(o => o.id !== j.id && aktif(o) && sameGrup(o, j) && overlap(o, j));
const conflictIds = () => { const s = new Set(); jobs.forEach(j => conflicts(j).length && s.add(j.id)); return s; };

/* ===== Navigasi ===== */
function show(v) {
  view = v;
  $$('.view').forEach(e => e.hidden = e.id !== 'v-' + v);
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#judul').textContent = TITLES[v];
  if (v === 'tambah' && editId === null) resetForm();
  if (v !== 'tambah') editId = null;
  renderAll(); window.scrollTo(0, 0);
}
function renderAll() { renderDash(); renderList(); renderCalPage(); renderPemesan(); renderLaporan(); renderKeu(); renderSettings(); }

/* ===== Dashboard ===== */
const badgeJob = s => `<span class="badge b-${s}">${s}</span>`;
const badgeBayar = s => `<span class="badge b-${s === 'belum bayar' ? 'belum' : s}">${s}</span>`;
function itemHTML(j) {
  return `<div class="item" data-detail="${esc(j.id)}"><b>${esc(j.acara)}</b> ${badgeJob(j.statusJob)}<small>📅 ${fd(j.tanggal)} · ${esc(j.mulai)}–${esc(j.selesai)}</small><small>📍 ${esc(j.tempat)} · 🎵 ${esc(j.grup)}</small></div>`;
}
function renderDash() {
  const t = today();
  $('#sTotal').textContent = jobs.length;
  $('#sHariIni').textContent = jobs.filter(j => j.tanggal === t && aktif(j)).length;
  $('#sAkan').textContent = jobs.filter(j => j.tanggal > t && aktif(j) && j.statusJob !== 'selesai').length;
  $('#sSelesai').textContent = jobs.filter(j => j.statusJob === 'selesai').length;
  $('#sBatal').textContent = jobs.filter(j => !aktif(j)).length;
  $('#calDash').innerHTML = calHTML();
  const n = jobs.filter(j => j.tanggal >= t && aktif(j) && j.statusJob !== 'selesai').sort(byDate).slice(0, 5);
  $('#terdekat').innerHTML = n.length ? n.map(itemHTML).join('') : '<p class="empty">Belum ada job mendatang.</p>';
  $('#tglHariIni').textContent = new Date().toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
}

/* ===== Kalender ===== */
function calHTML() {
  const {y, m} = cal, first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  let h = `<div class="cal-head"><button class="btn sm" data-cal="-1">◀</button><strong>${BULAN[m]} ${y}</strong><button class="btn sm" data-cal="1">▶</button><button class="btn sm" data-cal="0">Hari ini</button></div><div class="cal-grid">`;
  h += HARI.map(x => `<div class="dow">${x}</div>`).join('') + '<span class="day blank"></span>'.repeat(first);
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m+1)}-${pad(d)}`, n = jobs.filter(j => j.tanggal === ds && aktif(j)).length;
    h += `<button class="day ${ds === today() ? 'today' : ''} ${ds === calSel ? 'sel' : ''}" data-day="${ds}">${d}${n ? `<em>${n}</em>` : ''}</button>`;
  }
  return h + '</div>';
}
function renderCalPage() {
  $('#calPage').innerHTML = calHTML();
  const prefix = `${cal.y}-${pad(cal.m + 1)}`;
  const list = (calSel ? jobs.filter(j => j.tanggal === calSel) : jobs.filter(j => j.tanggal.startsWith(prefix))).sort(byDate);
  $('#agendaJudul').textContent = calSel ? 'Agenda ' + fd(calSel) : `Agenda ${BULAN[cal.m]} ${cal.y}`;
  $('#agenda').innerHTML = (calSel ? '<button class="btn sm" data-cal="clear">Tampilkan sebulan penuh</button><br><br>' : '') + (list.length ? list.map(itemHTML).join('') : '<p class="empty">Tidak ada agenda.</p>');
}

/* ===== Daftar job ===== */
function filtered() {
  const q = $('#q').value.trim().toLowerCase(), b = $('#fBulan').value, s = $('#fStatus').value, p = $('#fBayar').value;
  return jobs.filter(j => (!q || [j.pemesan, j.acara, j.tempat, j.alamat, j.tanggal, fd(j.tanggal)].join(' ').toLowerCase().includes(q))
    && (!b || j.tanggal.startsWith(b)) && (!s || j.statusJob === s) && (!p || j.statusBayar === p)).sort(byDate);
}
function renderList() {
  const l = filtered(), bt = conflictIds();
  $('#jumlahHasil').textContent = l.length + ' job ditampilkan';
  $('#tblJadwal').innerHTML = '<tr><th>ID</th><th>Tanggal</th><th>Waktu</th><th>Acara / Pemesan</th><th>Lokasi</th><th>Grup</th><th>Honor / Sisa</th><th>Status</th><th>Aksi</th></tr>' +
    (l.length ? l.map(j => `<tr class="${bt.has(j.id) ? 'bentrok' : ''}"><td>${esc(j.id)}</td><td>${fd(j.tanggal)}</td><td>${esc(j.mulai)}–${esc(j.selesai)}</td>
    <td><b>${esc(j.acara)}</b><br>${esc(j.pemesan)}</td><td>${esc(j.tempat)}</td><td>${esc(j.grup)}${bt.has(j.id) ? '<br><span class="badge b-dibatalkan">Bentrok</span>' : ''}</td>
    <td>${rp(j.honor)}<br><small class="muted">Sisa ${rp(sisa(j))}</small></td><td>${badgeJob(j.statusJob)}<br>${badgeBayar(j.statusBayar)}</td>
    <td class="acts"><button class="btn sm" data-detail="${esc(j.id)}" title="Lihat">👁️</button><button class="btn sm" data-inv="${esc(j.id)}" title="Cetak invoice">🧾</button><button class="btn sm" data-edit="${esc(j.id)}" title="Edit">✏️</button><button class="btn sm danger" data-del="${esc(j.id)}" title="Hapus">🗑️</button></td></tr>`).join('')
    : '<tr><td colspan="9" class="empty">Tidak ada data job.</td></tr>');
}
function jobRow(j) { return [j.id, j.pemesan, j.wa, j.acara, j.jenis, j.tanggal, j.mulai, j.selesai, j.tempat, j.alamat, j.grup, j.koordinator, j.honor, j.dp, sisa(j), j.statusBayar, j.statusJob, j.catatan]; }
const CSV_HEAD = ['ID','Pemesan','WhatsApp','Acara','Jenis','Tanggal','Mulai','Selesai','Tempat','Alamat','Grup','Koordinator','Honor','DP','Sisa','Status Bayar','Status Job','Catatan'];
function showDetail(id) {
  const j = jobs.find(x => x.id === id); if (!j) return;
  const rows = [['ID', j.id], ['Pemesan', j.pemesan], ['WhatsApp', `<a style="color:#d4af37" target="_blank" rel="noopener" href="https://wa.me/${esc(normWA(j.wa))}">${esc(j.wa)}</a>`], ['Acara', `${j.acara} (${j.jenis})`], ['Tanggal', fd(j.tanggal)], ['Waktu', j.mulai + ' – ' + j.selesai], ['Tempat', j.tempat], ['Alamat', j.alamat], ['Grup', j.grup], ['Koordinator', j.koordinator], ['Honor', rp(j.honor)], ['DP', rp(j.dp)], ['Sisa', rp(sisa(j))], ['Pembayaran', j.statusBayar], ['Status Job', j.statusJob], ['Catatan', j.catatan || '-']];
  modal({title: 'Detail Job', html: '<dl class="dl">' + rows.map(([k, v]) => `<dt>${k}</dt><dd>${k === 'WhatsApp' ? v : esc(v)}</dd>`).join('') + '</dl>' + `<div class="toolbar"><button class="btn gold" data-inv="${esc(j.id)}">🧾 Cetak Invoice</button></div>`, ok: 'Tutup', cancel: ''});
}
async function hapus(id) {
  const j = jobs.find(x => x.id === id); if (!j) return;
  if (await modal({title: 'Hapus Job?', html: `<p>Job <b>${esc(j.id)} – ${esc(j.acara)}</b> akan dihapus permanen.</p>`, ok: 'Hapus', danger: true})) {
    jobs = jobs.filter(x => x.id !== id); save(); renderAll(); toast('Data job berhasil dihapus.');
  }
}

/* ===== Formulir ===== */
const F = ['pemesan','wa','acara','jenis','tanggal','mulai','selesai','tempat','alamat','grup','koordinator','honor','dp','statusBayar','statusJob','catatan'];
function nextId() { let n = jobs.reduce((m, j) => Math.max(m, parseInt(String(j.id).replace(/\D/g, '')) || 0), 0) + 1, id; do { id = 'JOB-' + String(n++).padStart(3, '0'); } while (jobs.some(j => j.id === id)); return id; }
function updSisa() { $('#f-sisa').value = rp(Math.max(0, (+$('#f-honor').value || 0) - (+$('#f-dp').value || 0))); }
function resetForm() {
  $('#form').reset(); $('#f-id').value = nextId(); $('#f-tanggal').value = today(); $('#f-dp').value = 0;
  $('#formJudul').textContent = 'Tambah Job Baru'; updSisa();
}
function editJob(id) {
  const j = jobs.find(x => x.id === id); if (!j) return;
  editId = id; show('tambah'); $('#f-id').value = j.id; F.forEach(k => $('#f-' + k).value = j[k]);
  $('#formJudul').textContent = 'Edit Job ' + j.id; updSisa();
}
function validate(j) {
  const req = {pemesan:'Nama pemesan', wa:'Nomor WhatsApp', acara:'Nama acara', tanggal:'Tanggal acara', mulai:'Jam mulai', selesai:'Jam selesai', tempat:'Nama tempat', alamat:'Alamat lokasi', grup:'Nama grup', koordinator:'Koordinator'};
  for (const k in req) if (!j[k]) return req[k] + ' wajib diisi.';
  if (!validWA(j.wa)) return 'Nomor WhatsApp tidak valid (contoh: 08123456789).';
  if (j.selesai <= j.mulai) return 'Jam selesai harus setelah jam mulai.';
  if (!Number.isFinite(j.honor) || j.honor <= 0) return 'Honor harus berupa angka lebih dari 0.';
  if (!Number.isFinite(j.dp) || j.dp < 0) return 'DP tidak boleh negatif.';
  if (j.dp > j.honor) return 'DP tidak boleh melebihi honor (sisa pembayaran tidak boleh negatif).';
  if (j.statusBayar === 'belum bayar' && j.dp > 0) return 'Status "belum bayar" tetapi DP lebih dari 0. Ubah status menjadi DP.';
  if (j.statusBayar === 'DP' && (j.dp <= 0 || j.dp >= j.honor)) return 'Status DP memerlukan DP lebih dari 0 dan kurang dari honor.';
  if (j.statusBayar === 'lunas' && j.dp !== j.honor) return 'Status lunas memerlukan DP sama dengan honor.';
  return '';
}
async function submitForm(e) {
  e.preventDefault();
  const g = k => $('#f-' + k).value.trim();
  const j = {id: $('#f-id').value, honor: Math.round(+g('honor')), dp: Math.round(+g('dp') || 0)};
  F.forEach(k => { if (k !== 'honor' && k !== 'dp') j[k] = g(k); });
  const err = validate(j); if (err) return toast(err, 'err');
  j.wa = normWA(j.wa);
  const c = conflicts(j);
  if (c.length && !await modal({title: '⚠️ Jadwal Bentrok', danger: true, ok: 'Tetap Simpan', cancel: 'Ubah Jadwal',
    html: `<p>Grup <b>${esc(j.grup)}</b> sudah punya jadwal pada waktu yang bertabrakan:</p>` + c.map(itemHTML).join('').replace(/data-detail/g, 'data-x') + '<p>Simpan tetap dilanjutkan?</p>'})) return;
  if (editId !== null) {
    const i = jobs.findIndex(x => x.id === editId); jobs[i] = j; toast('Perubahan jadwal berhasil disimpan.');
  } else {
    if (jobs.some(x => x.id === j.id)) j.id = nextId();
    jobs.push(j); toast('Jadwal baru berhasil ditambahkan.');
  }
  save(); editId = null; show('jadwal');
}

/* ===== Pemesan ===== */
function renderPemesan() {
  const q = $('#qPemesan').value.trim().toLowerCase(), map = {};
  jobs.forEach(j => { const k = normWA(j.wa) || j.pemesan; const o = map[k] = map[k] || {nama: j.pemesan, wa: j.wa, n: 0, honor: 0, last: ''}; o.n++; o.honor += aktif(j) ? +j.honor : 0; if (j.tanggal > o.last) o.last = j.tanggal; });
  const l = Object.values(map).filter(o => !q || (o.nama + o.wa).toLowerCase().includes(q)).sort((a, b) => b.n - a.n);
  $('#tblPemesan').innerHTML = '<tr><th>Nama</th><th>WhatsApp</th><th>Jumlah Job</th><th>Total Honor</th><th>Job Terakhir</th></tr>' +
    (l.length ? l.map(o => `<tr><td>${esc(o.nama)}</td><td><a style="color:#d4af37" target="_blank" rel="noopener" href="https://wa.me/${esc(normWA(o.wa))}">${esc(o.wa)}</a></td><td>${o.n}</td><td>${rp(o.honor)}</td><td>${fd(o.last)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Belum ada data pemesan.</td></tr>');
}

/* ===== Laporan ===== */
function laporanJobs() { const a = $('#rDari').value, b = $('#rSampai').value; return jobs.filter(j => (!a || j.tanggal >= a) && (!b || j.tanggal <= b)).sort(byDate); }
function renderLaporan() {
  const l = laporanJobs(), a = l.filter(aktif);
  const sum = k => a.reduce((s, j) => s + (k === 'sisa' ? sisa(j) : +j[k] || 0), 0);
  $('#rTotal').innerHTML = [['🎵', l.length, 'Jumlah Job'], ['💰', rp(sum('honor')), 'Total Honor'], ['💵', rp(sum('dp')), 'Total DP'], ['🧾', rp(sum('sisa')), 'Total Sisa']].map(([i, v, t]) => `<div class="stat"><i>${i}</i><b style="font-size:1.1rem">${v}</b><span>${t}</span></div>`).join('');
  const bln = {}; l.forEach(j => { const k = j.tanggal.slice(0, 7), o = bln[k] = bln[k] || {n: 0, h: 0, d: 0, s: 0}; o.n++; if (aktif(j)) { o.h += +j.honor; o.d += +j.dp; o.s += sisa(j); } });
  const ks = Object.keys(bln).sort();
  $('#tblBulan').innerHTML = '<tr><th>Bulan</th><th>Jumlah Job</th><th>Honor</th><th>DP</th><th>Sisa</th></tr>' + (ks.length ? ks.map(k => `<tr><td>${BULAN[+k.slice(5) - 1]} ${k.slice(0, 4)}</td><td>${bln[k].n}</td><td>${rp(bln[k].h)}</td><td>${rp(bln[k].d)}</td><td>${rp(bln[k].s)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Tidak ada data pada periode ini.</td></tr>');
  const order = ['menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan'];
  let h = '<tr><th>Status</th><th>ID</th><th>Tanggal</th><th>Acara</th><th>Pemesan</th><th>Honor</th><th>Sisa</th></tr>';
  order.forEach(s => { const x = l.filter(j => j.statusJob === s); h += `<tr><td colspan="7"><b>${s.toUpperCase()}</b> (${x.length} job)</td></tr>` + x.map(j => `<tr><td></td><td>${esc(j.id)}</td><td>${fd(j.tanggal)}</td><td>${esc(j.acara)}</td><td>${esc(j.pemesan)}</td><td>${rp(j.honor)}</td><td>${rp(sisa(j))}</td></tr>`).join(''); });
  $('#tblStatus').innerHTML = h;
}

/* ===== Pengaturan ===== */
function renderSettings() {
  $('#setGrup').value = settings.grups.join('\n');
  const k = getKop(); [['Nama','nama'],['Tagline','tagline'],['Alamat','alamat'],['Telp','telp'],['Email','email'],['Rek','rek'],['Ttd','ttd'],['Catatan','catatan']].forEach(([id, f]) => { const el = $('#kop' + id); if (el && document.activeElement !== el) el.value = k[f]; });
  $('#dlGrup').innerHTML = [...new Set([...settings.grups, ...jobs.map(j => j.grup)])].map(g => `<option value="${esc(g)}">`).join('');
}
function restore(file) {
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || !Array.isArray(d.jobs)) throw 0;
      const ok = d.jobs.every(j => j && j.id && j.tanggal && j.mulai && j.selesai && j.grup);
      if (!ok) throw 0;
      if (!await modal({title: 'Pulihkan Data?', html: `<p>Seluruh data saat ini akan diganti dengan <b>${d.jobs.length}</b> job dari berkas cadangan.</p>`, ok: 'Pulihkan', danger: true})) return;
      const seen = new Set(); jobs = d.jobs.map(j => { if (seen.has(j.id)) j.id = 'JOB-' + Math.random().toString(36).slice(2, 7).toUpperCase(); seen.add(j.id); return j; });
      if (d.settings && Array.isArray(d.settings.grups)) settings = d.settings;
      trx = Array.isArray(d.trx) ? d.trx : [];
      save(); renderAll(); toast('Data berhasil dipulihkan.');
    } catch (e) { toast('Berkas cadangan tidak valid.', 'err'); }
  };
  r.readAsText(file);
}

/* ===== Event ===== */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-view],[data-go],[data-cal],[data-day],[data-detail],[data-edit],[data-del],[data-inv]'); if (!t) return;
  const d = t.dataset;
  if (d.view) { editId = null; show(d.view); }
  else if (d.go) { editId = null; show(d.go); }
  else if (d.cal !== undefined) {
    if (d.cal === 'clear') calSel = null;
    else if (d.cal === '0') { cal.y = now.getFullYear(); cal.m = now.getMonth(); calSel = null; }
    else { cal.m += +d.cal; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } calSel = null; }
    renderDash(); renderCalPage();
  }
  else if (d.day) { calSel = d.day; if (view !== 'kalender') show('kalender'); else renderCalPage(); }
  else if (d.detail) showDetail(d.detail);
  else if (d.edit) editJob(d.edit);
  else if (d.del) hapus(d.del);
  else if (d.inv) cetakInvoice(d.inv);
});
['q', 'fBulan', 'fStatus', 'fBayar'].forEach(id => $('#' + id).addEventListener('input', renderList));
$('#fReset').onclick = () => { ['q', 'fBulan', 'fStatus', 'fBayar'].forEach(id => $('#' + id).value = ''); renderList(); };
$('#qPemesan').addEventListener('input', renderPemesan);
['rDari', 'rSampai'].forEach(id => $('#' + id).addEventListener('input', renderLaporan));
$('#rReset').onclick = () => { $('#rDari').value = $('#rSampai').value = ''; renderLaporan(); };
['f-honor', 'f-dp'].forEach(id => $('#' + id).addEventListener('input', updSisa));
$('#form').addEventListener('submit', submitForm);
$('#btnBatalForm').onclick = () => { editId = null; show('jadwal'); };
$('#btnCsv').onclick = () => { download('jadwal-hadroh.csv', csv(CSV_HEAD, filtered().map(jobRow)), 'text/csv;charset=utf-8'); toast('CSV jadwal diekspor.'); };
$('#btnCsvLaporan').onclick = () => { download('laporan-hadroh.csv', csv(CSV_HEAD, laporanJobs().map(jobRow)), 'text/csv;charset=utf-8'); toast('CSV laporan diekspor.'); };
$('#btnCetak').onclick = () => window.print();
$('#btnSimpanGrup').onclick = () => { settings.grups = $('#setGrup').value.split('\n').map(s => s.trim()).filter(Boolean); save(); renderSettings(); toast('Daftar grup disimpan.'); };
$('#btnBackup').onclick = () => { download(`cadangan-hadroh-${today()}.json`, JSON.stringify({versi: 1, tanggal: new Date().toISOString(), jobs, trx, settings}, null, 2), 'application/json'); toast('Cadangan JSON dibuat.'); };
$('#fileRestore').onchange = e => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ''; };
$('#btnMuatContoh').onclick = () => { const s = sampleData().map(j => ({...j, id: nextId()})); s.forEach(j => { jobs.push(j); }); save(); renderAll(); toast('Data contoh dimuat.'); };
$('#btnHapusContoh').onclick = async () => {
  const n = jobs.filter(j => j.sample).length;
  if (!n) return toast('Tidak ada data contoh.', 'err');
  if (await modal({title: 'Hapus Data Contoh?', html: `<p>${n} data contoh akan dihapus. Data buatan Anda tidak terpengaruh.</p>`, ok: 'Hapus', danger: true})) { jobs = jobs.filter(j => !j.sample); save(); renderAll(); toast('Data contoh dihapus.'); }
};
$('#btnHapusSemua').onclick = async () => {
  if (await modal({title: 'Hapus Semua Data?', html: '<p>Seluruh data job dan transaksi keuangan akan dihapus permanen. Buat cadangan JSON lebih dulu bila perlu.</p>', ok: 'Hapus Semua', danger: true})) { jobs = []; trx = []; save(); renderAll(); toast('Semua data dihapus.'); }
};

/* ===== Keuangan (akuntansi sederhana, basis kas) ===== */
const KAT_KELUAR = ['Honor Anggota', 'Transportasi', 'Konsumsi', 'Perawatan Alat', 'Sewa/Perlengkapan', 'Lainnya'];
const KAT_MASUK = ['Infak/Donasi', 'Pendapatan Lain', 'Lainnya'];
function fillKat() { $('#kKat').innerHTML = ($('#kJenis').value === 'keluar' ? KAT_KELUAR : KAT_MASUK).map(k => `<option>${k}</option>`).join(''); }
function keuRows() {
  const a = $('#kDari').value, b = $('#kSampai').value;
  const auto = jobs.filter(j => aktif(j) && +j.dp > 0).map(j => ({id: 'AUTO-' + j.id, auto: true, tanggal: j.tanggal, jenis: 'masuk', kategori: 'Pembayaran Job', keterangan: `${j.acara} (${j.pemesan}) - ${j.statusBayar}`, jumlah: +j.dp, jobId: j.id}));
  return [...auto, ...trx].filter(t => (!a || t.tanggal >= a) && (!b || t.tanggal <= b)).sort((x, y) => x.tanggal.localeCompare(y.tanggal) || x.id.localeCompare(y.id));
}
function renderKeu() {
  const r = keuRows(), kat = {}; let masuk = 0, keluar = 0, saldo = 0;
  r.forEach(t => { if (t.jenis === 'masuk') masuk += t.jumlah; else { keluar += t.jumlah; kat[t.kategori] = (kat[t.kategori] || 0) + t.jumlah; } });
  const piutang = jobs.filter(aktif).reduce((s, j) => s + sisa(j), 0);
  $('#kStat').innerHTML = [['💵', masuk, 'Pemasukan'], ['🧾', keluar, 'Pengeluaran'], ['📈', masuk - keluar, 'Laba / Rugi'], ['⏳', piutang, 'Piutang (Total Sisa Bayar)']].map(([i, v, t]) => `<div class="stat"><i>${i}</i><b style="font-size:1.1rem">${rp(v)}</b><span>${t}</span></div>`).join('');
  const v = $('#kJob').value;
  $('#kJob').innerHTML = '<option value="">- Tanpa job -</option>' + jobs.slice().sort(byDate).map(j => `<option value="${esc(j.id)}">${esc(j.id)} · ${esc(j.acara)}</option>`).join('');
  $('#kJob').value = v;
  $('#tblKas').innerHTML = '<tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Masuk</th><th>Keluar</th><th>Saldo</th><th>Aksi</th></tr>' +
    (r.length ? r.map(t => { saldo += t.jenis === 'masuk' ? t.jumlah : -t.jumlah;
      return `<tr><td>${fd(t.tanggal)}</td><td>${esc(t.keterangan)}${t.jobId ? `<br><small class="muted">${esc(t.jobId)}</small>` : ''}</td><td>${esc(t.kategori)}</td><td class="in">${t.jenis === 'masuk' ? rp(t.jumlah) : ''}</td><td class="out">${t.jenis === 'keluar' ? rp(t.jumlah) : ''}</td><td>${rp(saldo)}</td><td>${t.auto ? '<small class="muted">otomatis</small>' : `<button class="btn sm danger" data-tdel="${esc(t.id)}">🗑️</button>`}</td></tr>`; }).join('') +
      `<tr><th colspan="3">TOTAL</th><th class="in">${rp(masuk)}</th><th class="out">${rp(keluar)}</th><th>${rp(masuk - keluar)}</th><th></th></tr>`
      : '<tr><td colspan="7" class="empty">Belum ada transaksi pada periode ini.</td></tr>');
  const ks = Object.keys(kat);
  $('#tblKat').innerHTML = '<tr><th>Kategori</th><th>Jumlah</th><th>% dari Pengeluaran</th></tr>' + (ks.length ? ks.map(k => `<tr><td>${esc(k)}</td><td>${rp(kat[k])}</td><td>${Math.round(kat[k] / keluar * 100)}%</td></tr>`).join('') : '<tr><td colspan="3" class="empty">Belum ada pengeluaran.</td></tr>');
}
$('#kJenis').onchange = fillKat;
['kDari', 'kSampai'].forEach(id => $('#' + id).addEventListener('input', renderKeu));
$('#kReset').onclick = () => { $('#kDari').value = $('#kSampai').value = ''; renderKeu(); };
$('#kForm').addEventListener('submit', e => {
  e.preventDefault();
  const t = {id: 'TRX-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tanggal: $('#kTgl').value, jenis: $('#kJenis').value, kategori: $('#kKat').value, keterangan: $('#kKet').value.trim(), jumlah: Math.round(+$('#kJml').value), jobId: $('#kJob').value};
  if (!t.tanggal || !t.keterangan) return toast('Tanggal dan keterangan wajib diisi.', 'err');
  if (!Number.isFinite(t.jumlah) || t.jumlah <= 0) return toast('Jumlah harus lebih dari 0.', 'err');
  trx.push(t); save(); $('#kKet').value = ''; $('#kJml').value = ''; renderKeu(); toast('Transaksi berhasil dicatat.');
});
$('#tblKas').addEventListener('click', async e => {
  const b = e.target.closest('[data-tdel]'); if (!b) return;
  const t = trx.find(x => x.id === b.dataset.tdel); if (!t) return;
  if (await modal({title: 'Hapus Transaksi?', html: `<p><b>${esc(t.keterangan)}</b> (${rp(t.jumlah)}) akan dihapus permanen.</p>`, ok: 'Hapus', danger: true})) { trx = trx.filter(x => x.id !== t.id); save(); renderKeu(); toast('Transaksi dihapus.'); }
});
$('#btnCsvKas').onclick = () => { download('buku-kas-hadroh.csv', csv(['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah', 'Job', 'Sumber'], keuRows().map(t => [t.tanggal, t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran', t.kategori, t.keterangan, t.jumlah, t.jobId || '', t.auto ? 'Otomatis' : 'Manual'])), 'text/csv;charset=utf-8'); toast('CSV buku kas diekspor.'); };
$('#kTgl').value = today(); fillKat();

/* ===== Cetak Invoice & Buku Kas ===== */
const fdl = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-';
function kopHTML() {
  const k = getKop(), kontak = [k.telp && '📞 ' + esc(k.telp), k.email && '✉️ ' + esc(k.email)].filter(Boolean).join(' &nbsp; ');
  return `<div class="kop"><div class="lg">🕌</div><div><h2>${esc(k.nama).toUpperCase()}</h2>${k.tagline ? `<p><i>${esc(k.tagline)}</i></p>` : ''}${k.alamat ? `<p>${esc(k.alamat)}</p>` : ''}${kontak ? `<p>${kontak}</p>` : ''}</div></div>`;
}
function printDoc(html) {
  $('#printDoc').innerHTML = '<div class="doc">' + html + '</div>';
  document.body.classList.add('doc-mode'); $('#modal').hidden = true;
  const end = () => { document.body.classList.remove('doc-mode'); window.removeEventListener('afterprint', end); };
  window.addEventListener('afterprint', end);
  setTimeout(() => window.print(), 100);
}
function cetakInvoice(id) {
  const j = jobs.find(x => x.id === id); if (!j) return;
  const k = getKop(), lunas = j.statusBayar === 'lunas', batal = !aktif(j);
  const no = `INV/${String(j.id).replace(/\D/g, '').padStart(3, '0')}/${j.tanggal.slice(0, 4)}${j.tanggal.slice(5, 7)}`;
  printDoc(kopHTML() + `
    <div class="jdl"><h3>INVOICE</h3><div>No. Invoice: <b>${esc(no)}</b><br>Tanggal terbit: ${fdl(today())}</div></div>
    <table class="plain"><tr><td>Kepada Yth.</td><td><b>${esc(j.pemesan)}</b></td></tr><tr><td>WhatsApp</td><td>${esc(j.wa)}</td></tr></table>
    <table><tr><th style="width:36px">No</th><th>Uraian</th><th class="r" style="width:150px">Jumlah</th></tr>
      <tr><td>1</td><td><b>Jasa ${esc(j.grup)}</b> – ${esc(j.acara)} (${esc(j.jenis)})<br>
        ${fdl(j.tanggal)}, pukul ${esc(j.mulai)}–${esc(j.selesai)} WIB<br>${esc(j.tempat)}, ${esc(j.alamat)}</td><td class="r">${rp(j.honor)}</td></tr>
      <tr class="tot"><td colspan="2" class="r">Total Tagihan</td><td class="r">${rp(j.honor)}</td></tr>
      <tr><td colspan="2" class="r">Uang muka / pembayaran diterima</td><td class="r">${rp(j.dp)}</td></tr>
      <tr class="tot"><td colspan="2" class="r">Sisa Pembayaran</td><td class="r">${rp(sisa(j))}</td></tr></table>
    <p>${lunas ? '<span class="stamp">LUNAS</span>' : `Status pembayaran: <b>${esc(j.statusBayar)}</b>`}${batal ? ' &nbsp; <b>(Job dibatalkan)</b>' : ''}</p>
    ${k.rek ? `<p class="note"><b>Pembayaran ke rekening:</b> ${esc(k.rek)}</p>` : ''}
    ${k.catatan ? `<p class="note">${esc(k.catatan)}</p>` : ''}
    <div class="ttd"><div>Penerima,<div class="sp"></div>( ${esc(j.pemesan)} )</div><div>Hormat kami,<div class="sp"></div>( ${esc(k.ttd || j.koordinator)} )</div></div>`);
}
function cetakKas() {
  const r = keuRows(), a = $('#kDari').value, b = $('#kSampai').value; let masuk = 0, keluar = 0, saldo = 0;
  const periode = a || b ? `${a ? fdl(a) : 'Awal'} s.d. ${b ? fdl(b) : 'Sekarang'}` : 'Semua periode';
  const body = r.map(t => { if (t.jenis === 'masuk') masuk += t.jumlah; else keluar += t.jumlah; saldo = masuk - keluar;
    return `<tr><td>${fdl(t.tanggal)}</td><td>${esc(t.keterangan)}${t.jobId ? ` <small>(${esc(t.jobId)})</small>` : ''}<br><small>${esc(t.kategori)}</small></td><td class="r">${t.jenis === 'masuk' ? rp(t.jumlah) : ''}</td><td class="r">${t.jenis === 'keluar' ? rp(t.jumlah) : ''}</td><td class="r">${rp(saldo)}</td></tr>`; }).join('');
  printDoc(kopHTML() + `
    <div class="jdl"><h3 style="font-size:16pt">LAPORAN BUKU KAS</h3><div>Periode: <b>${periode}</b><br>Dicetak: ${fdl(today())}</div></div>
    <table><tr><th>Tanggal</th><th>Keterangan</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r">Saldo</th></tr>
      ${body || '<tr><td colspan="5" style="text-align:center">Tidak ada transaksi pada periode ini.</td></tr>'}
      <tr class="tot"><td colspan="2" class="r">TOTAL</td><td class="r">${rp(masuk)}</td><td class="r">${rp(keluar)}</td><td class="r">${rp(masuk - keluar)}</td></tr></table>
    <p class="note">Pemasukan dari job dihitung dari DP/pembayaran job aktif pada tanggal acara.</p>
    <div class="ttd"><div>Mengetahui,<div class="sp"></div>( ........................ )</div><div>Bendahara,<div class="sp"></div>( ${esc(getKop().ttd || '........................')} )</div></div>`);
}
$('#btnCetakKas').onclick = cetakKas;
$('#btnSimpanKop').onclick = () => {
  const v = id => $('#kop' + id).value.trim();
  settings.kop = {nama: v('Nama') || KOP0.nama, tagline: v('Tagline'), alamat: v('Alamat'), telp: v('Telp'), email: v('Email'), rek: v('Rek'), ttd: v('Ttd'), catatan: v('Catatan')};
  save(); toast('Kop invoice disimpan.');
};

const showLogin = msg => { $('#lErr').textContent = msg || ''; $('#login').hidden = false; };
async function enter(user) {
  try {
    const r = await db.from('admins').select('user_id').eq('user_id', user.id); if (r.error) throw r.error;
    isAdmin = r.data.length > 0; await loadAll();
  } catch (e) { await db.auth.signOut(); return showLogin('Gagal memuat data: ' + (e.message || e)); }
  document.body.classList.toggle('viewer', !isAdmin);
  $('#akunInfo').textContent = user.email + ' · ' + (isAdmin ? 'Admin' : 'Hanya lihat');
  $('#login').hidden = true; show('dashboard');
}
$('#lForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!db) return;
  const {data, error} = await db.auth.signInWithPassword({email: $('#lEmail').value.trim(), password: $('#lPass').value});
  if (error) return showLogin('Gagal masuk: ' + error.message);
  $('#lPass').value = ''; await enter(data.user);
});
$('#btnKeluar').onclick = async () => { await db.auth.signOut(); jobs = []; trx = []; showLogin(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && db && $('#login').hidden) saving.then(loadAll).then(renderAll).catch(() => {}); });
(async function boot() {
  if (!window.supabase || !window.SUPABASE_URL || /ISI_DENGAN/.test(window.SUPABASE_URL + window.SUPABASE_ANON_KEY)) return showLogin('Konfigurasi belum lengkap: isi config.js dan pastikan terhubung internet.');
  db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  db.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') showLogin(); });
  const {data} = await db.auth.getSession();
  if (data.session) enter(data.session.user); else showLogin();
})();
