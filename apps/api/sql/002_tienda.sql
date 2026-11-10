-- Venta de cursos: datos comerciales del curso y pedidos.
alter table cursos
  add column slug text unique,
  add column precio numeric(10,2) check (precio is null or precio >= 0),
  add column precio_lista numeric(10,2),
  add column emoji text,
  add column duracion text,
  add column nivel text,
  add column objetivo text,
  add column temario jsonb not null default '[]',
  add column dirigido_a jsonb not null default '[]',
  add column en_venta boolean not null default false;

create type estado_pedido as enum ('pendiente', 'pagado', 'cancelado');

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  nombre_completo text not null,
  correo text not null,
  telefono text,
  total numeric(10,2) not null check (total >= 0),
  estado estado_pedido not null default 'pendiente',
  metodo_pago text not null default 'simulado',
  creado_en timestamptz not null default now(),
  pagado_en timestamptz
);
create index pedidos_usuario_idx on pedidos (usuario_id);

create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  curso_id uuid not null references cursos(id),
  precio numeric(10,2) not null,
  unique (pedido_id, curso_id)
);
create index pedido_items_curso_idx on pedido_items (curso_id);
