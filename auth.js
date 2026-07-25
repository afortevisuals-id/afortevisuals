-- ============================================================
-- Aforte Visuals — Database Schema (PostgreSQL / Supabase)
-- Jalankan file ini di Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ADMIN USERS ----------
create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  created_at timestamptz default now()
);

-- ---------- PORTFOLIO ----------
create table if not exists portfolio_categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,       -- e.g. 'wedding'
  label text not null,             -- e.g. 'Wedding'
  sort_order int default 0
);

create table if not exists portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references portfolio_categories(id) on delete set null,
  title text not null,
  image_url text not null,         -- Supabase Storage public URL
  is_featured boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ---------- SERVICES ----------
create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  duration text,
  photo_count text,
  image_url text,
  sort_order int default 0,
  is_active boolean default true
);

-- ---------- PRICE LIST ----------
create table if not exists price_packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,              -- Basic / Premium / Luxury
  price_from numeric not null,
  currency text default 'IDR',
  features jsonb not null default '[]',   -- ["Durasi 2 jam", "1 fotografer", ...]
  is_popular boolean default false,
  sort_order int default 0,
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- ---------- BOOKINGS ----------
create type booking_status as enum ('pending','confirmed','completed','cancelled');

create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  whatsapp text not null,
  email text not null,
  service_type text not null,
  package_name text not null,
  shoot_date date not null,
  shoot_time time not null,
  location text not null,
  guest_count int default 1,
  notes text,
  status booking_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prevent double-booking the same date (simple rule: one confirmed/pending booking per date)
create unique index if not exists uniq_active_booking_date
  on bookings (shoot_date)
  where status in ('pending','confirmed');

-- ---------- TESTIMONIALS ----------
create table if not exists testimonials (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  service_type text,
  rating int check (rating between 1 and 5),
  comment text not null,
  photo_url text,
  is_published boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ---------- SITE SETTINGS (singleton table) ----------
create table if not exists site_settings (
  id int primary key default 1,
  business_name text default 'Aforte Visuals',
  whatsapp_number text default '6281234567890',
  contact_email text default 'hello@afortevisuals.com',
  instagram_handle text default '@afortevisuals',
  tiktok_handle text default '@afortevisuals',
  studio_address text,
  operating_hours text,
  hero_media_url text,
  active_theme text default 'gold',  -- gold | dark | white | beige
  updated_at timestamptz default now(),
  constraint singleton check (id = 1)
);
insert into site_settings (id) values (1) on conflict (id) do nothing;

-- ---------- ROW LEVEL SECURITY ----------
-- Public (anon) can READ published/active content, but cannot write.
-- All writes go through the backend using the service_role key, which bypasses RLS.

alter table portfolio_categories enable row level security;
alter table portfolio_items enable row level security;
alter table services enable row level security;
alter table price_packages enable row level security;
alter table testimonials enable row level security;
alter table site_settings enable row level security;
alter table bookings enable row level security;

create policy "public read categories" on portfolio_categories for select using (true);
create policy "public read portfolio" on portfolio_items for select using (true);
create policy "public read services" on services for select using (is_active);
create policy "public read prices" on price_packages for select using (is_active);
create policy "public read testimonials" on testimonials for select using (is_published);
create policy "public read settings" on site_settings for select using (true);
-- bookings: no public select policy -> only accessible via backend (service role)

-- ---------- SEED DATA ----------
insert into portfolio_categories (slug,label,sort_order) values
 ('wedding','Wedding',1),('prewedding','Prewedding',2),('engagement','Engagement',3),
 ('graduation','Graduation',4),('family','Family',5),('event','Event',6),
 ('portrait','Portrait',7),('commercial','Commercial',8)
on conflict (slug) do nothing;

insert into price_packages (name, price_from, features, is_popular, sort_order) values
 ('Basic Package', 1500000, '["Durasi pemotretan 2 jam","1 fotografer","30 foto hasil editing","File digital melalui online gallery","Estimasi pengerjaan 7 hari"]', false, 1),
 ('Premium Package', 3500000, '["Durasi pemotretan 5 jam","2 fotografer","75 foto hasil editing","Semua file dokumentasi","Online gallery","Cetak foto pilihan","Estimasi pengerjaan 7-14 hari"]', true, 2),
 ('Luxury Package', 6500000, '["Dokumentasi hingga 10 jam","2 fotografer dan 1 videografer","Semua file dokumentasi","150 foto hasil editing","Video highlight sinematik","Album foto premium","Online gallery","Estimasi pengerjaan 14-21 hari"]', false, 3)
on conflict do nothing;
