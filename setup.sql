-- Aman dijalankan berulang kali. Supabase: SQL Editor -> New query -> tempel semua -> Run

-- 1. Tabel
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.jobs (id text primary key, data jsonb not null);
create table if not exists public.transaksi (id text primary key, data jsonb not null);
create table if not exists public.pengaturan (id int primary key check (id = 1), data jsonb not null);

-- 2. Aktifkan Row Level Security
alter table public.admins enable row level security;
alter table public.jobs enable row level security;
alter table public.transaksi enable row level security;
alter table public.pengaturan enable row level security;

-- 3. Fungsi pengecek admin
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- 4. Kebijakan: semua akun login boleh BACA; hanya admin boleh UBAH
drop policy if exists "cek diri sendiri" on public.admins;
create policy "cek diri sendiri" on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "baca jobs" on public.jobs;
create policy "baca jobs" on public.jobs for select to authenticated using (true);
drop policy if exists "ubah jobs" on public.jobs;
create policy "ubah jobs" on public.jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "baca transaksi" on public.transaksi;
create policy "baca transaksi" on public.transaksi for select to authenticated using (true);
drop policy if exists "ubah transaksi" on public.transaksi;
create policy "ubah transaksi" on public.transaksi for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "baca pengaturan" on public.pengaturan;
create policy "baca pengaturan" on public.pengaturan for select to authenticated using (true);
drop policy if exists "ubah pengaturan" on public.pengaturan;
create policy "ubah pengaturan" on public.pengaturan for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5. Jadikan akun Anda admin (ganti email; akun harus sudah dibuat di Authentication -> Users)
insert into public.admins (user_id) select id from auth.users where email = 'hanafyilman7@gmail.com' on conflict do nothing;