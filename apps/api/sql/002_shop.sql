-- Venta de cursos: datos comerciales del curso y pedidos.
alter table courses
  add column slug text unique,
  add column price numeric(10,2) check (price is null or price >= 0),
  add column list_price numeric(10,2),
  add column emoji text,
  add column duration text,
  add column level text,
  add column objective text,
  add column syllabus jsonb not null default '[]',
  add column audience jsonb not null default '[]',
  add column for_sale boolean not null default false;

create type order_status as enum ('pending', 'paid', 'cancelled');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  full_name text not null,
  email text not null,
  phone text,
  total numeric(10,2) not null check (total >= 0),
  status order_status not null default 'pending',
  payment_method text not null default 'simulated',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_user_idx on orders (user_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  course_id uuid not null references courses(id),
  price numeric(10,2) not null,
  unique (order_id, course_id)
);
create index order_items_course_idx on order_items (course_id);
