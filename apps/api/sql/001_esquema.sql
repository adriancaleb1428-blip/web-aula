-- Esquema de Aula Consulting en PostgreSQL (nombres de tablas, columnas y estados en español).
-- La autorización la aplica el servidor (apps/api); aquí viven los datos, las restricciones,
-- los índices y los triggers que generan los avisos.

create type rol_usuario as enum ('administrador', 'facilitador', 'participante');
create type estado_curso as enum ('borrador', 'publicado', 'archivado');
create type estado_matricula as enum ('activa', 'invitada', 'completada', 'retirada');
create type estado_reunion as enum ('programada', 'cancelada', 'realizada');

-- Cuentas de acceso (la contraseña nunca sale del servidor).
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  contrasena_hash text not null,
  creado_en timestamptz not null default now(),
  ultimo_acceso_en timestamptz
);
create unique index usuarios_correo_key on usuarios (lower(correo));

create table perfiles (
  id uuid primary key references usuarios(id) on delete cascade,
  nombre_completo text,
  foto_url text,
  zona_horaria text not null default 'America/Lima',
  rol rol_usuario not null default 'participante',
  puede_crear_cursos boolean not null default false,
  telefono text,
  empresa text,
  cargo text,
  biografia text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index perfiles_rol_idx on perfiles (rol);

create table cursos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  descripcion text,
  portada_url text,
  categoria text,
  periodo_academico text,
  inicia_el date,
  termina_el date,
  estado estado_curso not null default 'borrador',
  modalidad text not null default 'hibrido',
  creado_por uuid not null references perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (termina_el is null or inicia_el is null or termina_el >= inicia_el)
);
create index cursos_creado_por_idx on cursos (creado_por);
create index cursos_estado_idx on cursos (estado);

create table curso_facilitadores (
  curso_id uuid not null references cursos(id) on delete cascade,
  facilitador_id uuid not null references perfiles(id) on delete cascade,
  puede_gestionar boolean not null default false,
  puede_crear_cursos boolean not null default false,
  creado_en timestamptz not null default now(),
  primary key (curso_id, facilitador_id)
);
create index curso_facilitadores_facilitador_idx on curso_facilitadores (facilitador_id);

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  participante_id uuid not null references perfiles(id) on delete cascade,
  estado estado_matricula not null default 'activa',
  matriculado_en timestamptz not null default now(),
  unique (curso_id, participante_id)
);
create index matriculas_participante_estado_idx on matriculas (participante_id, estado);

create table modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  descripcion text,
  posicion integer not null default 0,
  publicado boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (curso_id, posicion)
);

create table lecciones (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references modulos(id) on delete cascade,
  titulo text not null,
  contenido text,
  posicion integer not null default 0,
  publicado boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (modulo_id, posicion)
);

create table materiales (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  modulo_id uuid references modulos(id) on delete set null,
  titulo text not null,
  descripcion text,
  ruta_archivo text not null,
  tipo_mime text,
  subido_por uuid not null references perfiles(id),
  publicado boolean not null default false,
  creado_en timestamptz not null default now()
);
create index materiales_curso_idx on materiales (curso_id);
create index materiales_modulo_idx on materiales (modulo_id);
create index materiales_subido_por_idx on materiales (subido_por);

create table reuniones (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  descripcion text,
  inicia_en timestamptz not null,
  termina_en timestamptz not null,
  zona_horaria text not null default 'America/Lima',
  organizador_id uuid not null references perfiles(id),
  sala text not null default 'Google Meet',
  enlace_reunion text,
  estado estado_reunion not null default 'programada',
  creado_en timestamptz not null default now(),
  check (termina_en > inicia_en)
);
create index reuniones_curso_inicio_idx on reuniones (curso_id, inicia_en);
create index reuniones_organizador_idx on reuniones (organizador_id);

create table curso_grabaciones (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  descripcion text,
  ruta_archivo text not null,
  tipo_mime text,
  subido_por uuid not null references perfiles(id),
  publicado boolean not null default true,
  creado_en timestamptz not null default now()
);
create index curso_grabaciones_curso_idx on curso_grabaciones (curso_id, creado_en desc);
create index curso_grabaciones_subido_por_idx on curso_grabaciones (subido_por);

create table curso_certificados (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  participante_id uuid not null references perfiles(id) on delete cascade,
  titulo text not null,
  numero_certificado text,
  ruta_archivo text not null,
  tipo_mime text not null default 'application/pdf',
  emitido_por uuid not null references perfiles(id),
  emitido_en timestamptz not null default now()
);
create index curso_certificados_curso_idx on curso_certificados (curso_id);
create index curso_certificados_participante_idx on curso_certificados (participante_id);
create index curso_certificados_emitido_por_idx on curso_certificados (emitido_por);

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  detalle text,
  recurso_tipo text,
  recurso_id uuid,
  leido_en timestamptz,
  creado_en timestamptz not null default now()
);
create index notificaciones_usuario_idx on notificaciones (usuario_id, creado_en desc);
create index notificaciones_recurso_idx on notificaciones (recurso_tipo, recurso_id);

create table solicitudes_soporte (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references perfiles(id) on delete set null,
  nombre_completo text not null,
  correo text not null,
  telefono text,
  asunto text not null,
  mensaje text not null,
  estado text not null default 'abierta' check (estado in ('abierta', 'resuelta')),
  correo_enviado boolean not null default false,
  creado_en timestamptz not null default now()
);
create index solicitudes_soporte_usuario_idx on solicitudes_soporte (usuario_id);

create table curso_conversaciones (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  participante_id uuid not null references perfiles(id) on delete cascade,
  facilitador_id uuid not null references perfiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  ultimo_mensaje_en timestamptz not null default now(),
  unique (curso_id, participante_id, facilitador_id)
);
create index curso_conversaciones_participante_idx on curso_conversaciones (participante_id);
create index curso_conversaciones_facilitador_idx on curso_conversaciones (facilitador_id);

create table mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references curso_conversaciones(id) on delete cascade,
  remitente_id uuid not null references perfiles(id) on delete cascade,
  contenido text not null check (length(btrim(contenido)) between 1 and 4000),
  creado_en timestamptz not null default now(),
  leido_en timestamptz
);
create index mensajes_conversacion_idx on mensajes (conversacion_id, creado_en);
create index mensajes_remitente_idx on mensajes (remitente_id);

-- ── Triggers ─────────────────────────────────────────────────────────

create function actualizar_fecha() returns trigger language plpgsql as $$
begin new.actualizado_en = now(); return new; end $$;
create trigger cursos_actualizar before update on cursos for each row execute function actualizar_fecha();
create trigger perfiles_actualizar before update on perfiles for each row execute function actualizar_fecha();

-- Avisos a participantes matriculados y al personal del curso cuando se publica contenido.
create function avisar_contenido_curso() returns trigger language plpgsql as $$
declare
  curso_nombre text;
  autor uuid;
  tipo_participante text;
  tipo_personal text;
  etiqueta text;
  recurso text;
begin
  select nombre into curso_nombre from cursos where id = new.curso_id;
  if tg_table_name = 'materiales' then
    if not new.publicado then return new; end if;
    autor := new.subido_por; tipo_participante := 'material'; tipo_personal := 'material_publicado'; recurso := 'material';
    etiqueta := 'Nuevo material: ' || new.titulo;
  elsif tg_table_name = 'curso_grabaciones' then
    if not new.publicado then return new; end if;
    autor := new.subido_por; tipo_participante := 'grabacion'; tipo_personal := 'grabacion_publicada'; recurso := 'grabacion';
    etiqueta := 'Nueva grabación: ' || new.titulo;
  else
    if new.estado <> 'programada' then return new; end if;
    autor := new.organizador_id; tipo_participante := 'reunion'; tipo_personal := 'reunion_programada'; recurso := 'reunion';
    etiqueta := 'Nueva reunión: ' || new.titulo;
  end if;
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  select m.participante_id, tipo_participante, etiqueta, curso_nombre, recurso, new.id
  from matriculas m where m.curso_id = new.curso_id and m.estado = 'activa';
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  select cf.facilitador_id, tipo_personal, etiqueta, curso_nombre, recurso, new.id
  from curso_facilitadores cf where cf.curso_id = new.curso_id and cf.puede_gestionar and cf.facilitador_id is distinct from autor;
  return new;
end $$;
create trigger materiales_avisar after insert on materiales for each row execute function avisar_contenido_curso();
create trigger grabaciones_avisar after insert on curso_grabaciones for each row execute function avisar_contenido_curso();
create trigger reuniones_avisar after insert on reuniones for each row execute function avisar_contenido_curso();

-- Al borrar un recurso se borran sus avisos.
create function borrar_avisos_recurso() returns trigger language plpgsql as $$
begin
  delete from notificaciones where recurso_id = old.id and recurso_tipo = tg_argv[0];
  return old;
end $$;
create trigger materiales_borrar_avisos after delete on materiales for each row execute function borrar_avisos_recurso('material');
create trigger grabaciones_borrar_avisos after delete on curso_grabaciones for each row execute function borrar_avisos_recurso('grabacion');
create trigger reuniones_borrar_avisos after delete on reuniones for each row execute function borrar_avisos_recurso('reunion');

create function avisar_matricula() returns trigger language plpgsql as $$
declare curso_nombre text; participante_nombre text;
begin
  if new.estado <> 'activa' then return new; end if;
  select nombre into curso_nombre from cursos where id = new.curso_id;
  select coalesce(nombre_completo, 'Un participante') into participante_nombre from perfiles where id = new.participante_id;
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  values (new.participante_id, 'curso_asignado', 'Te matricularon en ' || curso_nombre, null, 'curso', new.curso_id);
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  select cf.facilitador_id, 'participante_matriculado', participante_nombre || ' se unió a ' || curso_nombre, null, 'curso', new.curso_id
  from curso_facilitadores cf where cf.curso_id = new.curso_id and cf.puede_gestionar;
  return new;
end $$;
create trigger matriculas_avisar after insert on matriculas for each row execute function avisar_matricula();

create function avisar_facilitador() returns trigger language plpgsql as $$
declare curso_nombre text;
begin
  select nombre into curso_nombre from cursos where id = new.curso_id;
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  values (new.facilitador_id, 'curso_asignado', 'Te asignaron el curso ' || curso_nombre, null, 'curso', new.curso_id);
  return new;
end $$;
create trigger facilitadores_avisar after insert on curso_facilitadores for each row execute function avisar_facilitador();

create function avisar_certificado() returns trigger language plpgsql as $$
declare curso_nombre text;
begin
  select nombre into curso_nombre from cursos where id = new.curso_id;
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  values (new.participante_id, 'certificado', 'Nuevo certificado: ' || new.titulo, curso_nombre, 'curso', new.curso_id);
  return new;
end $$;
create trigger certificados_avisar after insert on curso_certificados for each row execute function avisar_certificado();

-- Mensajería: avisa a la otra persona y actualiza la fecha del último mensaje.
create function avisar_mensaje() returns trigger language plpgsql as $$
declare c curso_conversaciones; destinatario uuid; remitente_nombre text;
begin
  select * into c from curso_conversaciones where id = new.conversacion_id;
  destinatario := case when new.remitente_id = c.participante_id then c.facilitador_id else c.participante_id end;
  select coalesce(nombre_completo, 'un usuario') into remitente_nombre from perfiles where id = new.remitente_id;
  update curso_conversaciones set ultimo_mensaje_en = new.creado_en where id = c.id;
  insert into notificaciones (usuario_id, tipo, titulo, detalle, recurso_tipo, recurso_id)
  values (destinatario, 'mensaje', 'Nuevo mensaje de ' || remitente_nombre, left(new.contenido, 120), 'conversacion', c.id);
  return new;
end $$;
create trigger mensajes_avisar after insert on mensajes for each row execute function avisar_mensaje();

-- Eventos en vivo: el servidor escucha este canal y los reenvía a los navegadores conectados.
create function publicar_cambio() returns trigger language plpgsql as $$
begin
  perform pg_notify('aula_eventos', json_build_object('table', tg_table_name, 'event', tg_op, 'id', new.id)::text);
  return new;
end $$;
create trigger notificaciones_publicar after insert or update on notificaciones for each row execute function publicar_cambio();
create trigger mensajes_publicar after insert or update on mensajes for each row execute function publicar_cambio();
